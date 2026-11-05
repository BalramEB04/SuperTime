from datetime import date
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.modules.milestones.repository import MilestoneRepository
from app.modules.milestones.schema import MilestoneCreate, MilestoneUpdate, MilestoneResponse
from app.modules.projects.repository import ProjectRepository
from app.modules.projects.service import invalidate_project_cache
from app.modules.users.model import User

class MilestoneService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = MilestoneRepository(db)
        self.project_repo = ProjectRepository(db)

    async def _check_pm_authorization(self, project_id: int, current_user: User):
        if current_user.role.name != "Project_Manager":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only PMs can manage milestones.")
        
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
            
        if project.project_manager_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage milestones for your own projects.")
        
        return project

    async def _validate_weights(self, project_id: int, new_weight: float, exclude_milestone_id: Optional[int] = None):
        existing_milestones = await self.repository.get_by_project_id(project_id)
        total_weight = sum([m.weight_percentage for m in existing_milestones if m.id != exclude_milestone_id])
        if total_weight + new_weight > 100.0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Total milestone weight cannot exceed 100%. Current total is {total_weight}%.")

    async def _validate_dates(
        self,
        project,
        start_date: Optional[date],
        expected_completion_date: Optional[date],
        exclude_milestone_id: Optional[int] = None,
    ):
        if not start_date or not expected_completion_date:
            return

        if start_date > expected_completion_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before or equal to expected completion date.",
            )

        if project.start_date and start_date < project.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Milestone start date ({start_date}) cannot be earlier than project start date ({project.start_date}).",
            )

        if project.end_date and expected_completion_date > project.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Milestone expected completion date ({expected_completion_date}) cannot be later than project end date ({project.end_date}).",
            )

        existing_milestones = await self.repository.get_by_project_id(project.id)
        for m in existing_milestones:
            if m.id == exclude_milestone_id:
                continue
            if not m.start_date or not m.expected_completion_date:
                continue
            # Overlap check: start <= other.end and end >= other.start
            if start_date <= m.expected_completion_date and expected_completion_date >= m.start_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Milestone dates ({start_date} to {expected_completion_date}) overlap with existing milestone '{m.name}' ({m.start_date} to {m.expected_completion_date}).",
                )

    async def create_milestone(self, milestone_in: MilestoneCreate, current_user: User) -> MilestoneResponse:
        project = await self._check_pm_authorization(milestone_in.project_id, current_user)
        await self._validate_weights(milestone_in.project_id, milestone_in.weight_percentage)
        await self._validate_dates(
            project,
            milestone_in.start_date,
            milestone_in.expected_completion_date,
        )
        
        milestone = await self.repository.create(milestone_in)
        invalidate_project_cache()
        return MilestoneResponse.model_validate(milestone)

    async def update_milestone(self, milestone_id: int, milestone_in: MilestoneUpdate, current_user: User) -> MilestoneResponse:
        milestone = await self.repository.get_by_id(milestone_id)
        if not milestone:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found.")
            
        project = await self._check_pm_authorization(milestone.project_id, current_user)
        
        if milestone_in.weight_percentage is not None:
            await self._validate_weights(milestone.project_id, milestone_in.weight_percentage, exclude_milestone_id=milestone.id)
            
        eff_start = milestone_in.start_date if milestone_in.start_date is not None else milestone.start_date
        eff_end = milestone_in.expected_completion_date if milestone_in.expected_completion_date is not None else milestone.expected_completion_date
        await self._validate_dates(
            project,
            eff_start,
            eff_end,
            exclude_milestone_id=milestone.id,
        )

        updated = await self.repository.update(milestone, milestone_in)
        invalidate_project_cache()
        return MilestoneResponse.model_validate(updated)

    async def get_milestones_by_project(self, project_id: int) -> List[MilestoneResponse]:
        milestones = await self.repository.get_by_project_id(project_id)
        return [MilestoneResponse.model_validate(m) for m in milestones]

    async def get_milestone(self, milestone_id: int) -> MilestoneResponse:
        milestone = await self.repository.get_by_id(milestone_id)
        if not milestone:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found.")
        return MilestoneResponse.model_validate(milestone)

    async def delete_milestone(self, milestone_id: int, current_user: User) -> None:
        milestone = await self.repository.get_by_id(milestone_id)
        if not milestone:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found.")
            
        await self._check_pm_authorization(milestone.project_id, current_user)
        await self.repository.delete(milestone)
        invalidate_project_cache()
