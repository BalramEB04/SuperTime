"""update_timesheet_unique_constraint_for_milestone

Revision ID: e4f5a6b7c8d9
Revises: 3def2589dafa
Create Date: 2026-11-03 15:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4f5a6b7c8d9'
down_revision: Union[str, None] = '3def2589dafa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop old unique constraint on (user_id, project_assignment_id, timesheet_date)
    op.drop_constraint('uq_user_project_date', 'timesheets', type_='unique')

    # 2. Create new composite unique index including milestone_id with COALESCE for nullable milestones
    op.execute(
        "CREATE UNIQUE INDEX uq_timesheet_user_proj_milestone_date "
        "ON timesheets (user_id, project_assignment_id, COALESCE(milestone_id, 0), timesheet_date);"
    )


def downgrade() -> None:
    # 1. Drop new index
    op.execute("DROP INDEX IF EXISTS uq_timesheet_user_proj_milestone_date;")

    # 2. Re-create old unique constraint
    op.create_unique_constraint(
        'uq_user_project_date', 
        'timesheets', 
        ['user_id', 'project_assignment_id', 'timesheet_date']
    )

