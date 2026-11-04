"""add_performance_and_foreign_key_indexes

Revision ID: b1c2d3e4f5a6
Revises: e4f5a6b7c8d9
Create Date: 2026-11-04 10:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'e4f5a6b7c8d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. leave_requests indexes (crucial for user leave queries, manager reviews, collision checks)
    op.create_index('ix_leave_requests_user_id', 'leave_requests', ['user_id'], unique=False)
    op.create_index('ix_leave_requests_status', 'leave_requests', ['status'], unique=False)
    op.create_index('ix_leave_requests_managers_user_id', 'leave_requests', ['managers_user_id'], unique=False)
    op.create_index('ix_leave_requests_user_dates', 'leave_requests', ['user_id', 'start_date', 'end_date'], unique=False)

    # 2. weekend_work_requests indexes (improves dashboard loads and user weekend work history)
    op.create_index('ix_weekend_work_project_assignment_id', 'weekend_work_requests', ['project_assignment_id'], unique=False)
    op.create_index('ix_weekend_work_work_date', 'weekend_work_requests', ['work_date'], unique=False)
    op.create_index('ix_weekend_work_status', 'weekend_work_requests', ['status'], unique=False)
    op.create_index('ix_weekend_work_approved_by', 'weekend_work_requests', ['approved_by'], unique=False)

    # 3. project_assignments & milestone_assignments foreign key index on user_id
    # (Fixes sequential scan on /api/v1/project-assignments/user/me)
    op.create_index('ix_project_assignments_user_id', 'project_assignments', ['user_id'], unique=False)
    op.create_index('ix_milestone_assignments_user_id', 'milestone_assignments', ['user_id'], unique=False)

    # 4. projects indexes (for PM overview, client filtering, active projects listing)
    op.create_index('ix_projects_project_manager_id', 'projects', ['project_manager_id'], unique=False)
    op.create_index('ix_projects_client_id', 'projects', ['client_id'], unique=False)
    op.create_index('ix_projects_status', 'projects', ['status'], unique=False)

    # 5. timesheets composite indexes (speeds up timesheet history & date range lookups)
    op.create_index('ix_timesheets_user_timesheet_date', 'timesheets', ['user_id', 'timesheet_date'], unique=False)
    op.create_index('ix_timesheets_proj_assign_date', 'timesheets', ['project_assignment_id', 'timesheet_date'], unique=False)

    # 6. users indexes (speeds up auth role joins and active user queries)
    op.create_index('ix_users_role_id', 'users', ['role_id'], unique=False)
    op.create_index('ix_users_department_id', 'users', ['department_id'], unique=False)
    op.create_index('ix_users_status', 'users', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_users_status', table_name='users')
    op.drop_index('ix_users_department_id', table_name='users')
    op.drop_index('ix_users_role_id', table_name='users')

    op.drop_index('ix_timesheets_proj_assign_date', table_name='timesheets')
    op.drop_index('ix_timesheets_user_timesheet_date', table_name='timesheets')

    op.drop_index('ix_projects_status', table_name='projects')
    op.drop_index('ix_projects_client_id', table_name='projects')
    op.drop_index('ix_projects_project_manager_id', table_name='projects')

    op.drop_index('ix_milestone_assignments_user_id', table_name='milestone_assignments')
    op.drop_index('ix_project_assignments_user_id', table_name='project_assignments')

    op.drop_index('ix_weekend_work_approved_by', table_name='weekend_work_requests')
    op.drop_index('ix_weekend_work_status', table_name='weekend_work_requests')
    op.drop_index('ix_weekend_work_work_date', table_name='weekend_work_requests')
    op.drop_index('ix_weekend_work_project_assignment_id', table_name='weekend_work_requests')

    op.drop_index('ix_leave_requests_user_dates', table_name='leave_requests')
    op.drop_index('ix_leave_requests_managers_user_id', table_name='leave_requests')
    op.drop_index('ix_leave_requests_status', table_name='leave_requests')
    op.drop_index('ix_leave_requests_user_id', table_name='leave_requests')
