from typing import List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.departments.repository import DepartmentRepository
from app.modules.departments.schema import (
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
    DesignationResponse,
)


class DepartmentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = DepartmentRepository(db)

    async def create_department(self, dept_in: DepartmentCreate) -> DepartmentResponse:
        existing = await self.repository.get_by_name(dept_in.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department with name '{dept_in.name}' already exists",
            )

        if dept_in.code:
            existing_code = await self.repository.get_by_code(dept_in.code)
            if existing_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Department with code '{dept_in.code}' already exists",
                )

        dept = await self.repository.create(dept_in)
        response = DepartmentResponse.model_validate(dept)
        response.employee_count = 0
        return response

    async def get_department(self, dept_id: int) -> DepartmentResponse:
        dept = await self.repository.get_by_id(dept_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found",
            )
        count = await self.repository.count_assigned_users(dept_id)
        response = DepartmentResponse.model_validate(dept)
        response.employee_count = count
        return response

    async def get_all_departments(self, active_only: bool = True) -> List[DepartmentResponse]:
        dept_rows = await self.repository.get_all_with_counts(active_only=active_only)
        responses = []
        for dept, count in dept_rows:
            resp = DepartmentResponse.model_validate(dept)
            resp.employee_count = count
            responses.append(resp)
        return responses

    async def update_department(
        self, dept_id: int, dept_in: DepartmentUpdate
    ) -> DepartmentResponse:
        dept = await self.repository.get_by_id(dept_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found",
            )

        if dept_in.name and dept_in.name != dept.name:
            existing_name = await self.repository.get_by_name(dept_in.name)
            if existing_name and existing_name.id != dept_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Department with name '{dept_in.name}' already exists",
                )

        if dept_in.code and dept_in.code != dept.code:
            existing_code = await self.repository.get_by_code(dept_in.code)
            if existing_code and existing_code.id != dept_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Department with code '{dept_in.code}' already exists",
                )

        updated_dept = await self.repository.update(dept, dept_in)
        count = await self.repository.count_assigned_users(dept_id)
        response = DepartmentResponse.model_validate(updated_dept)
        response.employee_count = count
        return response

    async def delete_department(self, dept_id: int) -> None:
        dept = await self.repository.get_by_id(dept_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found",
            )

        assigned_count = await self.repository.count_assigned_users(dept_id)
        if assigned_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete department '{dept.name}' because {assigned_count} employee(s) are currently assigned to it. Please reassign the employees first.",
            )

        await self.repository.delete(dept)

    async def get_designations(self, dept_id: int, active_only: bool = True) -> List[DesignationResponse]:
        dept = await self.repository.get_by_id(dept_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found",
            )
        designations = await self.repository.get_designations_by_department(dept_id, active_only)
        return [DesignationResponse.model_validate(d) for d in designations]

    async def get_all_designations(self, active_only: bool = True) -> List[DesignationResponse]:
        designations = await self.repository.get_all_designations(active_only)
        return [DesignationResponse.model_validate(d) for d in designations]
