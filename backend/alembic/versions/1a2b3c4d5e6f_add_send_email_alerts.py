"""add send_email_alerts

Revision ID: 1a2b3c4d5e6f
Revises: 
Create Date: 2026-03-28 01:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '1a2b3c4d5e6f'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add column with default true
    op.add_column('monitors', sa.Column('send_email_alerts', sa.Boolean(), server_default='true', nullable=True))


def downgrade() -> None:
    op.drop_column('monitors', 'send_email_alerts')
