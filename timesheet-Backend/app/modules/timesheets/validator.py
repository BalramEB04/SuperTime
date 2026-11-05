from datetime import date, timedelta
import math
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.modules.projects.model import Project
from app.modules.project_assignments.model import ProjectAssignment
from app.modules.timesheets.repository import TimesheetRepository


class TimesheetValidator:
    """Validates timesheet date rules, hour limits (max 24h/day), project assignment ownership, and milestone."""

    @staticmethod
    def validate_not_future_date(timesheet_date: date) -> None:
        if timesheet_date > date.today():
            raise BadRequestException(detail="Cannot log timesheets for future dates.")

    @staticmethod
    def validate_not_before_joining_date(joining_date: Optional[date], timesheet_date: date) -> None:
        if joining_date and timesheet_date < joining_date:
            raise BadRequestException(
                detail=f"Cannot submit timesheet for {timesheet_date}. "
                       f"Submissions are only permitted on or after your joining date ({joining_date})."
            )

    @staticmethod
    async def validate_submission_window(db: AsyncSession, timesheet_date: date) -> None:
        today = date.today()
        if timesheet_date > today:
            raise BadRequestException(detail="Cannot log timesheets for future dates.")

        from app.modules.working_calendar.service import WorkingCalendarService
        config = await WorkingCalendarService.get_config(db)
        lock_hours = getattr(config, "timesheet_lock_hours", 24) or 24

        allowed_days = max(1, math.ceil(lock_hours / 24))
        earliest_date = today - timedelta(days=allowed_days)

        if timesheet_date < earliest_date:
            raise BadRequestException(
                detail=f"Timesheet submission is locked for date {timesheet_date}. "
                       f"Per company policy, submissions are restricted within {lock_hours} hours."
            )

    @staticmethod
    async def validate_milestone(
        db: AsyncSession,
        project_id: int,
        milestone_id: Optional[int],
    ) -> None:
        from app.modules.milestones.model import Milestone
        from app.modules.projects.model import Project
        from sqlalchemy import func

        # Fetch project details for descriptive error messages
        proj_res = await db.execute(select(Project).where(Project.id == project_id))
        proj = proj_res.scalar_one_or_none()
        proj_name = proj.project_name if proj else f"ID {project_id}"

        # Fetch all milestones configured for this project
        m_stmt = select(Milestone).where(Milestone.project_id == project_id)
        res = await db.execute(m_stmt)
        all_milestones = list(res.scalars().all())

        # RULE A: A project MUST have milestones configured before timesheets can be logged
        if not all_milestones:
            raise BadRequestException(
                detail=f"Cannot submit timesheet: Project Manager has not yet configured milestones for project '{proj_name}'."
            )

        active_milestones = [
            m for m in all_milestones if str(m.status).lower() != "achieved"
        ]

        if not active_milestones:
            raise BadRequestException(
                detail=f"Cannot submit timesheet: All milestones for project '{proj_name}' have already been achieved. Please contact your Project Manager."
            )

        # Milestone selection is strictly mandatory
        if not milestone_id:
            raise BadRequestException(
                detail=f"Milestone selection is mandatory for project '{proj_name}'."
            )

        matched = any(m.id == milestone_id for m in active_milestones)
        if not matched:
            any_matched = any(m.id == milestone_id for m in all_milestones)
            if not any_matched:
                raise BadRequestException(detail=f"Selected milestone does not belong to project '{proj_name}'.")

    @staticmethod
    def validate_no_duplicate_milestones(timesheets: list) -> None:
        """
        Ensures that within a batch submission, no two rows share the same
        (project_assignment_id, milestone_id, timesheet_date).
        """
        seen = set()
        for ts in timesheets:
            key = (ts.project_assignment_id, ts.milestone_id, ts.timesheet_date)
            if key in seen:
                milestone_desc = f"milestone ID {ts.milestone_id}" if ts.milestone_id else "the same project"
                raise BadRequestException(
                    detail=f"Duplicate entry detected: You cannot submit multiple timesheet rows for {milestone_desc} on {ts.timesheet_date}."
                )
            seen.add(key)

    @staticmethod
    def validate_not_weekend(timesheet_date: date) -> None:
        if timesheet_date.weekday() in (5, 6):
            raise BadRequestException(
                detail="Direct timesheet submission is not allowed for weekends. "
                       "Please submit a Weekend Work Request under the Weekend Work tab."
            )

    @staticmethod
    async def validate_not_holiday(db: AsyncSession, timesheet_date: date) -> None:
        from app.modules.holidays.repository import HolidayRepository
        holiday = await HolidayRepository.get_by_date(db, timesheet_date)
        if holiday:
            raise BadRequestException(
                detail=f"Cannot log timesheets on company holidays ({holiday.name} on {timesheet_date})."
            )

    @staticmethod
    async def validate_project_assignment(
        db: AsyncSession,
        user_id: int,
        project_assignment_id: int,
    ) -> ProjectAssignment:
        result = await db.execute(
            select(ProjectAssignment)
            .options(selectinload(ProjectAssignment.project).selectinload(Project.assignments))
            .filter(ProjectAssignment.id == project_assignment_id)
        )
        assignment = result.scalar_one_or_none()
        if not assignment or assignment.user_id != user_id:
            raise ForbiddenException(detail="User is not assigned to this project.")

        project = assignment.project
        if not project or user_id not in project.assigned_user_ids:
            raise ForbiddenException(detail="User is not assigned to this project.")

        if not project.is_active:
            raise BadRequestException(detail="Cannot log timesheets for an inactive project.")

        if getattr(assignment, "assignment_status", "Active") != "Active" or not assignment.is_active:
            raise ForbiddenException(detail="Project assignment is not active.")

        return assignment

    @staticmethod
    async def validate_daily_hours(
        db: AsyncSession,
        user_id: int,
        timesheet_date: date,
        new_hours: float,
        exclude_id: Optional[int] = None,
        exclude_ids: Optional[List[int]] = None,
    ) -> None:
        if new_hours <= 0:
            raise BadRequestException(detail="Logged hours must be greater than 0.")
        if new_hours > 24.0:
            raise BadRequestException(detail="Single entry or batch cannot exceed 24.0 hours.")

        existing_total = await TimesheetRepository.get_daily_total_hours(
            db, user_id, timesheet_date, exclude_id=exclude_id, exclude_ids=exclude_ids
        )

        total_after_add = existing_total + new_hours
        if total_after_add > 24.0:
            raise BadRequestException(
                detail=f"Exceeds daily 24-hour max limit. Logged: {existing_total}h, Trying to add: {new_hours}h (Total: {total_after_add}h)."
            )

    @staticmethod
    async def validate_no_leave_conflict(
        db: AsyncSession,
        user_id: int,
        timesheet_date: date,
        new_hours: float,
    ) -> None:
        """
        Check if an approved leave exists for this date and validate that the
        timesheet hours don't violate the leave restriction.
        Raises BadRequestException if:
        - Full-day leave → no hours allowed
        - Half-day leave → max 4 hours allowed
        - Partial-day leave → max (8 - leave_hours) hours allowed
        """
        from app.modules.leave_requests.repository import LeaveRequestRepository

        leaves = await LeaveRequestRepository.get_approved_leaves_for_date(db, user_id, timesheet_date)
        if not leaves:
            return  # No leave → allow timesheet

        leave = leaves[0]
        duration = leave.leave_duration_type or "full_day"

        if duration == "full_day":
            raise BadRequestException(
                detail=f"You are on full-day leave on {timesheet_date}. "
                       "Timesheet entry is not allowed for this date."
            )

        if duration == "half_day":
            max_hours = 4.0
            existing_total = await TimesheetRepository.get_daily_total_hours(db, user_id, timesheet_date)
            if existing_total + new_hours > max_hours:
                raise BadRequestException(
                    detail=f"You are on half-day leave on {timesheet_date}. "
                           f"Maximum allowed hours: {max_hours}h. "
                           f"You have already logged {existing_total}h and are trying to add {new_hours}h."
                )

        if duration == "partial_day" and leave.partial_start_time and leave.partial_end_time:
            start_h, start_m = map(int, leave.partial_start_time.split(":"))
            end_h, end_m = map(int, leave.partial_end_time.split(":"))
            leave_hours = (end_h * 60 + end_m - start_h * 60 - start_m) / 60.0
            max_hours = max(0.0, 8.0 - leave_hours)
            existing_total = await TimesheetRepository.get_daily_total_hours(db, user_id, timesheet_date)
            if existing_total + new_hours > max_hours:
                raise BadRequestException(
                    detail=f"You are on partial leave ({leave.partial_start_time}–{leave.partial_end_time}) "
                           f"on {timesheet_date}. Maximum allowed hours: {max_hours:.1f}h. "
                           f"You have already logged {existing_total}h and are trying to add {new_hours}h."
                )
