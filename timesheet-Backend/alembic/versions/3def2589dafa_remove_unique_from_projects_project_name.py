"""remove_unique_from_projects_project_name

Revision ID: 3def2589dafa
Revises: '2ac6eda54808'
Create Date: 2026-10-28 15:33:04.421867

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3def2589dafa'
down_revision: Union[str, None] = '2ac6eda54808'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index('ix_projects_project_name', table_name='projects')
    op.create_index(op.f('ix_projects_project_name'), 'projects', ['project_name'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_projects_project_name'), table_name='projects')
    op.create_index('ix_projects_project_name', 'projects', ['project_name'], unique=True)
