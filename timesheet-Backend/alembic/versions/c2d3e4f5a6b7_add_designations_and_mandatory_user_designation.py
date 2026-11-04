"""add_designations_and_mandatory_user_designation

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-11-04 12:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create designations table
    op.create_table(
        'designations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_designations_id', 'designations', ['id'], unique=False)
    op.create_index('ix_designations_department_id', 'designations', ['department_id'], unique=False)
    op.create_index('ix_designations_name', 'designations', ['name'], unique=False)

    # 2. Add designation to users table (nullable initially to allow safe backfill)
    op.add_column('users', sa.Column('designation', sa.String(length=100), nullable=True))

    # 3. Backfill existing user accounts
    op.execute("UPDATE users SET designation = 'System Administrator' WHERE designation IS NULL")

    # 4. Enforce NOT NULL constraint
    op.alter_column('users', 'designation', nullable=False)


def downgrade() -> None:
    op.drop_column('users', 'designation')
    op.drop_index('ix_designations_name', table_name='designations')
    op.drop_index('ix_designations_department_id', table_name='designations')
    op.drop_index('ix_designations_id', table_name='designations')
    op.drop_table('designations')

