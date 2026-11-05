from datetime import date, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.exceptions import ForbiddenException, NotFoundException
from app.modules.timesheets.model import Timesheet
from app.modules.users.model import User
from app.modules.timesheets.repository import TimesheetRepository
from app.modules.project_assignments.model import ProjectAssignment
from app.modules.timesheets.schema import (
    DailyTimesheetBreakdown,
    TimesheetCreate,
    TimesheetResponse,
    TimesheetUpdate,
    WeeklyTimesheetSummary,
)
from app.modules.timesheets.validator import TimesheetValidator


class TimesheetService:
    """Service handling business logic for Timesheets."""

    @staticmethod
    async def create_timesheet(
        db: AsyncSession,
        current_user: User,
        timesheet_in: TimesheetCreate,
    ) -> Timesheet:
        # 1. Validate date submission window (enforcing admin lock hours), joining date, not a weekend, and not a holiday
        TimesheetValidator.validate_not_before_joining_date(current_user.joining_date, timesheet_in.timesheet_date)
        await TimesheetValidator.validate_submission_window(db, timesheet_in.timesheet_date)
        TimesheetValidator.validate_not_weekend(timesheet_in.timesheet_date)
        await TimesheetValidator.validate_not_holiday(db, timesheet_in.timesheet_date)

        # 2. Validate project assignment & milestone
        assignment = await TimesheetValidator.validate_project_assignment(
            db, current_user.id, timesheet_in.project_assignment_id
        )
        if assignment:
            await TimesheetValidator.validate_milestone(
                db, assignment.project_id, timesheet_in.milestone_id
            )

        # 3. Check for exact milestone match on this date
        existing = await TimesheetRepository.get_by_user_project_milestone_date(
            db, current_user.id, timesheet_in.project_assignment_id, timesheet_in.milestone_id, timesheet_in.timesheet_date
        )

        # 4. Validate max 24h/day limit (excluding existing if upsert)
        target_total_hours = timesheet_in.billable_hours + timesheet_in.non_billable_hours
        await TimesheetValidator.validate_daily_hours(
            db, 
            current_user.id, 
            timesheet_in.timesheet_date, 
            target_total_hours,
            exclude_id=existing.id if existing else None
        )

        # 5. Validate no leave conflict for this date
        await TimesheetValidator.validate_no_leave_conflict(
            db,
            current_user.id,
            timesheet_in.timesheet_date,
            target_total_hours,
        )

        if existing:
            # Upsert: Update the matching project + milestone row
            update_data = {
                "billable_hours": timesheet_in.billable_hours,
                "billable_work_summary": timesheet_in.billable_work_summary,
                "non_billable_hours": timesheet_in.non_billable_hours,
                "non_billable_work_summary": timesheet_in.non_billable_work_summary,
                "milestone_id": timesheet_in.milestone_id,
            }
            return await TimesheetRepository.update(db, existing, update_data)

        # 6. Create timesheet entry
        timesheet = Timesheet(
            user_id=current_user.id,
            project_assignment_id=timesheet_in.project_assignment_id,
            milestone_id=timesheet_in.milestone_id,
            timesheet_date=timesheet_in.timesheet_date,
            billable_hours=timesheet_in.billable_hours,
            billable_work_summary=timesheet_in.billable_work_summary,
            non_billable_hours=timesheet_in.non_billable_hours,
            non_billable_work_summary=timesheet_in.non_billable_work_summary,
        )
        return await TimesheetRepository.create(db, timesheet)

    @staticmethod
    async def create_timesheets_batch(
        db: AsyncSession,
        current_user: User,
        timesheets_in: List[TimesheetCreate],
    ) -> List[Timesheet]:
        """
        Atomically validates and creates/updates a batch of timesheet entries.
        Guarantees that multiple milestones under the same project can be logged simultaneously,
        while strictly preventing duplicate (project, milestone) entries.
        """
        if not timesheets_in:
            return []

        # 1. Validate no duplicate project_assignment + milestone on the same date within the batch
        TimesheetValidator.validate_no_duplicate_milestones(timesheets_in)

        # 2. Validate basic rules for each entry
        assignments_cache = {}
        for item in timesheets_in:
            TimesheetValidator.validate_not_before_joining_date(current_user.joining_date, item.timesheet_date)
            await TimesheetValidator.validate_submission_window(db, item.timesheet_date)
            TimesheetValidator.validate_not_weekend(item.timesheet_date)
            await TimesheetValidator.validate_not_holiday(db, item.timesheet_date)

            if item.project_assignment_id not in assignments_cache:
                assignment = await TimesheetValidator.validate_project_assignment(
                    db, current_user.id, item.project_assignment_id
                )
                assignments_cache[item.project_assignment_id] = assignment
            else:
                assignment = assignments_cache[item.project_assignment_id]

            if assignment:
                await TimesheetValidator.validate_milestone(
                    db, assignment.project_id, item.milestone_id
                )

        # 3. Group by date and validate daily hours & leave conflicts
        entries_by_date = {}
        for item in timesheets_in:
            entries_by_date.setdefault(item.timesheet_date, []).append(item)

        upsert_map = {}
        for target_date, day_items in entries_by_date.items():
            existing_ids_for_date = []
            for item in day_items:
                existing = await TimesheetRepository.get_by_user_project_milestone_date(
                    db, current_user.id, item.project_assignment_id, item.milestone_id, item.timesheet_date
                )
                if existing:
                    existing_ids_for_date.append(existing.id)
                    upsert_map[(item.project_assignment_id, item.milestone_id, item.timesheet_date)] = existing

            day_total_hours = sum(item.billable_hours + item.non_billable_hours for item in day_items)

            await TimesheetValidator.validate_daily_hours(
                db,
                current_user.id,
                target_date,
                day_total_hours,
                exclude_ids=existing_ids_for_date,
            )

            await TimesheetValidator.validate_no_leave_conflict(
                db,
                current_user.id,
                target_date,
                day_total_hours,
            )

        # 4. Atomically apply upserts and inserts
        saved_instances = []
        for item in timesheets_in:
            key = (item.project_assignment_id, item.milestone_id, item.timesheet_date)
            existing = upsert_map.get(key)
            if existing:
                existing.billable_hours = item.billable_hours
                existing.billable_work_summary = item.billable_work_summary
                existing.non_billable_hours = item.non_billable_hours
                existing.non_billable_work_summary = item.non_billable_work_summary
                saved_instances.append(existing)
            else:
                new_ts = Timesheet(
                    user_id=current_user.id,
                    project_assignment_id=item.project_assignment_id,
                    milestone_id=item.milestone_id,
                    timesheet_date=item.timesheet_date,
                    billable_hours=item.billable_hours,
                    billable_work_summary=item.billable_work_summary,
                    non_billable_hours=item.non_billable_hours,
                    non_billable_work_summary=item.non_billable_work_summary,
                )
                db.add(new_ts)
                saved_instances.append(new_ts)

        await db.commit()

        # Reload with relationships
        ids = [s.id for s in saved_instances]
        res = await db.execute(
            select(Timesheet)
            .options(
                selectinload(Timesheet.user),
                selectinload(Timesheet.project_assignment).selectinload(ProjectAssignment.project),
                selectinload(Timesheet.milestone),
            )
            .filter(Timesheet.id.in_(ids))
            .order_by(Timesheet.id.asc())
        )
        return list(res.scalars().all())

    @staticmethod
    async def get_my_timesheets(
        db: AsyncSession,
        current_user: User,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        project_assignment_id: Optional[int] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[Timesheet], int]:
        return await TimesheetRepository.list_by_user(
            db,
            user_id=current_user.id,
            start_date=start_date,
            end_date=end_date,
            project_assignment_id=project_assignment_id,
            page=page,
        )

    @staticmethod
    async def get_managed_timesheets(
        db: AsyncSession,
        current_user: User,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        project_assignment_id: Optional[int] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[Timesheet], int]:
        return await TimesheetRepository.list_managed_by_pm(
            db,
            pm_user_id=current_user.id,
            start_date=start_date,
            end_date=end_date,
            project_assignment_id=project_assignment_id,
            page=page,
            limit=limit,
        )

    @staticmethod
    async def get_timesheet_by_id(
        db: AsyncSession,
        timesheet_id: int,
        current_user: User,
    ) -> Timesheet:
        entry = await TimesheetRepository.get_by_id(db, timesheet_id)
        if not entry:
            raise NotFoundException(detail="Timesheet entry not found.")

        role_name = getattr(current_user.role, "name", None)
        # Admins and Project Managers can view any timesheet entry (PMs need
        # this to look up entries returned after creation). Ownership check
        # below still protects against cross-user access for all other roles.
        is_privileged = role_name in ("Admin", "Project_Manager")
        if entry.user_id != current_user.id and not is_privileged:
            raise ForbiddenException(detail="You do not have permission to view this timesheet entry.")

        return entry

    @staticmethod
    async def update_timesheet(
        db: AsyncSession,
        timesheet_id: int,
        current_user: User,
        timesheet_in: TimesheetUpdate,
    ) -> Timesheet:
        entry = await TimesheetRepository.get_by_id(db, timesheet_id)
        if not entry:
            raise NotFoundException(detail="Timesheet entry not found.")

        if entry.user_id != current_user.id:
            raise ForbiddenException(detail="You can only update your own timesheet entries.")

        update_data = timesheet_in.model_dump(exclude_unset=True)

        target_date = update_data.get("timesheet_date", entry.timesheet_date)
        target_assignment = update_data.get("project_assignment_id", entry.project_assignment_id)

        if "timesheet_date" in update_data:
            TimesheetValidator.validate_not_before_joining_date(current_user.joining_date, target_date)
            await TimesheetValidator.validate_submission_window(db, target_date)
            TimesheetValidator.validate_not_weekend(target_date)
            await TimesheetValidator.validate_not_holiday(db, target_date)

        target_project_id = None
        if "project_assignment_id" in update_data or "milestone_id" in update_data:
            assignment = await TimesheetValidator.validate_project_assignment(
                db, current_user.id, target_assignment
            )
            target_project_id = assignment.project_id

        if "milestone_id" in update_data and update_data["milestone_id"]:
            if target_project_id is None:
                assignment = await TimesheetValidator.validate_project_assignment(
                    db, current_user.id, target_assignment
                )
                target_project_id = assignment.project_id
            await TimesheetValidator.validate_milestone(db, target_project_id, update_data["milestone_id"])

        if any(k in update_data for k in ["billable_hours", "non_billable_hours", "timesheet_date"]):
            b_hours = update_data.get("billable_hours", entry.billable_hours)
            nb_hours = update_data.get("non_billable_hours", entry.non_billable_hours)
            target_hours = b_hours + nb_hours
            await TimesheetValidator.validate_daily_hours(
                db,
                user_id=current_user.id,
                timesheet_date=target_date,
                new_hours=target_hours,
                exclude_id=entry.id,
            )
            # Validate no leave conflict
            await TimesheetValidator.validate_no_leave_conflict(
                db,
                user_id=current_user.id,
                timesheet_date=target_date,
                new_hours=target_hours,
            )

        return await TimesheetRepository.update(db, entry, update_data)

    @staticmethod
    async def delete_timesheet(
        db: AsyncSession,
        timesheet_id: int,
        current_user: User,
    ) -> None:
        entry = await TimesheetRepository.get_by_id(db, timesheet_id)
        if not entry:
            raise NotFoundException(detail="Timesheet entry not found.")

        if entry.user_id != current_user.id:
            raise ForbiddenException(detail="You can only delete your own timesheet entries.")

        await TimesheetRepository.delete(db, entry)

    @staticmethod
    async def get_weekly_summary(
        db: AsyncSession,
        current_user: User,
        target_date: Optional[date] = None,
    ) -> WeeklyTimesheetSummary:
        ref_date = target_date or date.today()
        # Find Monday of target week
        monday = ref_date - timedelta(days=ref_date.weekday())
        sunday = monday + timedelta(days=6)

        entries = await TimesheetRepository.get_entries_in_range(
            db, user_id=current_user.id, start_date=monday, end_date=sunday
        )

        # Map entries by date
        entries_by_date = {}
        total_weekly_hours = 0.0
        for entry in entries:
            d = entry.timesheet_date
            if d not in entries_by_date:
                entries_by_date[d] = []
            entries_by_date[d].append(entry)
            total_weekly_hours += (entry.billable_hours + entry.non_billable_hours)

        daily_breakdowns = []
        for i in range(7):
            curr_d = monday + timedelta(days=i)
            day_entries = entries_by_date.get(curr_d, [])
            day_total = sum((e.billable_hours + e.non_billable_hours) for e in day_entries)
            resp_entries = [TimesheetResponse.model_validate(e) for e in day_entries]
            daily_breakdowns.append(
                DailyTimesheetBreakdown(
                    date=curr_d,
                    total_hours=day_total,
                    entries=resp_entries,
                )
            )

        return WeeklyTimesheetSummary(
            start_date=monday,
            end_date=sunday,
            total_weekly_hours=total_weekly_hours,
            daily_breakdowns=daily_breakdowns,
        )


    @staticmethod
    async def delete_daily_timesheet(
        db: AsyncSession,
        current_user: User,
        target_date: date,
    ) -> int:
        entries = await TimesheetRepository.get_by_user_and_date(db, current_user.id, target_date)
        if not entries:
            raise NotFoundException(detail=f"No timesheet entries found for date {target_date}.")

        for entry in entries:
            if entry.status.lower() == "approved":
                raise ForbiddenException(detail="Cannot delete timesheet: contains approved entries. Please contact your Project Manager.")

        deleted_count = await TimesheetRepository.delete_by_user_and_date(db, current_user.id, target_date)
        return deleted_count

    @staticmethod
    async def sync_daily_timesheet(
        db: AsyncSession,
        current_user: User,
        target_date: date,
        timesheets_in: List[TimesheetCreate],
    ) -> List[Timesheet]:
        """
        Atomically synchronizes all timesheet entries for a user on target_date.
        - Existing entries matching (project_assignment_id, milestone_id) are updated.
        - New entries are inserted.
        - Existing entries not present in timesheets_in are deleted.
        """
        if not timesheets_in:
            await TimesheetService.delete_daily_timesheet(db, current_user, target_date)
            return []

        for item in timesheets_in:
            item.timesheet_date = target_date

        TimesheetValidator.validate_no_duplicate_milestones(timesheets_in)

        TimesheetValidator.validate_not_before_joining_date(current_user.joining_date, target_date)
        await TimesheetValidator.validate_submission_window(db, target_date)
        TimesheetValidator.validate_not_weekend(target_date)
        await TimesheetValidator.validate_not_holiday(db, target_date)

        assignments_cache = {}
        for item in timesheets_in:
            if item.project_assignment_id not in assignments_cache:
                assignment = await TimesheetValidator.validate_project_assignment(
                    db, current_user.id, item.project_assignment_id
                )
                assignments_cache[item.project_assignment_id] = assignment
            else:
                assignment = assignments_cache[item.project_assignment_id]

            if assignment:
                await TimesheetValidator.validate_milestone(
                    db, assignment.project_id, item.milestone_id
                )

        day_total_hours = sum(item.billable_hours + item.non_billable_hours for item in timesheets_in)
        existing_entries = await TimesheetRepository.get_by_user_and_date(db, current_user.id, target_date)

        for entry in existing_entries:
            if entry.status.lower() == "approved":
                raise ForbiddenException(detail="Cannot update timesheet: contains approved entries. Please contact your Project Manager.")

        existing_ids = [e.id for e in existing_entries]

        await TimesheetValidator.validate_daily_hours(
            db,
            current_user.id,
            target_date,
            day_total_hours,
            exclude_ids=existing_ids,
        )

        await TimesheetValidator.validate_no_leave_conflict(
            db,
            current_user.id,
            target_date,
            day_total_hours,
        )

        existing_map = {
            (e.project_assignment_id, e.milestone_id): e
            for e in existing_entries
        }

        incoming_keys = set()
        saved_instances = []

        for item in timesheets_in:
            key = (item.project_assignment_id, item.milestone_id)
            incoming_keys.add(key)
            existing = existing_map.get(key)
            if existing:
                existing.billable_hours = item.billable_hours
                existing.billable_work_summary = item.billable_work_summary
                existing.non_billable_hours = item.non_billable_hours
                existing.non_billable_work_summary = item.non_billable_work_summary
                saved_instances.append(existing)
            else:
                new_ts = Timesheet(
                    user_id=current_user.id,
                    project_assignment_id=item.project_assignment_id,
                    milestone_id=item.milestone_id,
                    timesheet_date=target_date,
                    billable_hours=item.billable_hours,
                    billable_work_summary=item.billable_work_summary,
                    non_billable_hours=item.non_billable_hours,
                    non_billable_work_summary=item.non_billable_work_summary,
                )
                db.add(new_ts)
                saved_instances.append(new_ts)

        for key, existing in existing_map.items():
            if key not in incoming_keys:
                await db.delete(existing)

        await db.commit()
        return await TimesheetRepository.get_by_user_and_date(db, current_user.id, target_date)
