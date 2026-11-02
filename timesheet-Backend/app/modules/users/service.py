from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.model import User
from app.modules.roles.repository import RoleRepository
from app.modules.users.repository import UserRepository
from app.modules.users.schema import UserCreate, UserUpdate
from app.modules.users.validator import UserValidator
from app.services.email_service import send_welcome_email



class UserService:
    """Service layer for Users module handling business rules and transactions."""

    @staticmethod
    async def create_user(db: AsyncSession, data: UserCreate) -> User:
        # 1. Verify Role exists
        role = await RoleRepository.get_by_id(db, data.role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Role with ID {data.role_id} not found.",
            )

        # 2. Check duplicate email
        existing_email = await UserRepository.get_by_email(db, data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User with email '{data.email}' already exists.",
            )

        # Auto-generate employee_id if not provided
        if not data.employee_id:
            from sqlalchemy import select, func
            stmt = select(func.max(User.id))
            max_id = await db.scalar(stmt) or 0
            data.employee_id = f"EMP-{max_id + 1}"

        # 3. Check duplicate employee ID
        existing_emp_id = await UserRepository.get_by_employee_id(db, data.employee_id)
        if existing_emp_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User with Employee ID '{data.employee_id}' already exists.",
            )

        # 4. Validate status if provided
        user_status = UserValidator.validate_status(data.status or "Pending")

        new_user = User(
            email=data.email,
            first_name=data.first_name,
            last_name=data.last_name,
            employee_id=data.employee_id,
            role_id=data.role_id,
            department_id=data.department_id,
            joining_date=data.joining_date,
            ctc=data.ctc,
            status=user_status,
        )

        created_user = await UserRepository.create(db, new_user)

        # Dispatch Welcome Email Notification
        if created_user.email:
            user_full_name = f"{created_user.first_name} {created_user.last_name}".strip()
            role_name = role.name if role else "Employee"
            await send_welcome_email(
                to_email=created_user.email,
                user_name=user_full_name,
                role_name=role_name,
                employee_id=created_user.employee_id,
            )

        return created_user


    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> User:
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found.",
            )
        return user

    @staticmethod
    async def list_users(
        db: AsyncSession,
        page: int = 1,
        limit: int = 20,
        role_id: Optional[int] = None,
        user_status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[User], int]:
        validated_status = UserValidator.validate_status(user_status) if user_status else None
        return await UserRepository.list_users(
            db, page=page, limit=limit, role_id=role_id, status=validated_status, search=search
        )

    @staticmethod
    async def update_user(db: AsyncSession, user_id: int, data: UserUpdate) -> User:
        user = await UserService.get_user_by_id(db, user_id)
        update_dict = data.model_dump(exclude_unset=True)

        # Check role_id if updating
        if "role_id" in update_dict and update_dict["role_id"] != user.role_id:
            role = await RoleRepository.get_by_id(db, update_dict["role_id"])
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Role with ID {update_dict['role_id']} not found.",
                )

        # Check email duplicate if updating
        if "email" in update_dict and update_dict["email"] != user.email:
            existing = await UserRepository.get_by_email(db, update_dict["email"])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"User with email '{update_dict['email']}' already exists.",
                )

        # Check employee_id duplicate if updating
        if "employee_id" in update_dict and update_dict["employee_id"] != user.employee_id:
            existing = await UserRepository.get_by_employee_id(db, update_dict["employee_id"])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"User with Employee ID '{update_dict['employee_id']}' already exists.",
                )

        # Validate status if updating
        if "status" in update_dict:
            validated_st = UserValidator.validate_status(update_dict["status"])
            if validated_st == "Inactive" and (user.role_id == 1 or (user.role and user.role.name == "Admin")):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin accounts cannot be deactivated.",
                )
            update_dict["status"] = validated_st

        return await UserRepository.update(db, user, update_dict)

    @staticmethod
    async def toggle_user_status(db: AsyncSession, user_id: int, new_status: str) -> User:
        user = await UserService.get_user_by_id(db, user_id)
        if user.role_id == 1 or (user.role and user.role.name == "Admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin accounts cannot be deactivated.",
            )
        validated_status = UserValidator.validate_status(new_status)
        return await UserRepository.toggle_status(db, user, validated_status)

    @staticmethod
    async def delete_user(db: AsyncSession, user_id: int, current_admin_id: int) -> None:
        if user_id == current_admin_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot delete your own account.",
            )
        user = await UserService.get_user_by_id(db, user_id)
        if user.role_id == 1 or (user.role and user.role.name == "Admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin accounts cannot be deleted.",
            )

        from app.modules.leave_balances.model import LeaveBalance
        from app.modules.leave_requests.model import LeaveRequest
        from app.modules.project_assignments.model import ProjectAssignment
        from app.modules.milestones.assignment_model import MilestoneAssignment
        from app.modules.timesheets.model import Timesheet
        from sqlalchemy import delete

        await db.execute(delete(LeaveBalance).where(LeaveBalance.user_id == user_id))
        await db.execute(delete(LeaveRequest).where(LeaveRequest.user_id == user_id))
        await db.execute(delete(Timesheet).where(Timesheet.user_id == user_id))
        await db.execute(delete(MilestoneAssignment).where(MilestoneAssignment.user_id == user_id))
        await db.execute(delete(ProjectAssignment).where(ProjectAssignment.user_id == user_id))

        await UserRepository.delete(db, user)
