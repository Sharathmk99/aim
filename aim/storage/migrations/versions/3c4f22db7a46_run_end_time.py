"""run end time

Revision ID: 3c4f22db7a46
Revises: 9ba30ab3b2b4
Create Date: 2021-09-01 21:19:00.391203

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = '3c4f22db7a46'
down_revision = '9ba30ab3b2b4'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('run', sa.Column('finalized_at', sa.DateTime(), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('run', 'finalized_at')
    # ### end Alembic commands ###
