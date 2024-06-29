"""empty message

Revision ID: 46b89d830ad8
Revises: b07e7b07c8ce
Create Date: 2022-11-09 05:05:48.794990

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = '46b89d830ad8'
down_revision = 'b07e7b07c8ce'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('experiment', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('note', sa.Column('experiment_id', sa.Integer(), nullable=True))

    with op.batch_alter_table('note') as batch_op:
        batch_op.create_foreign_key('fk_experiment_note', 'experiment', ['experiment_id'], ['id'])

    op.create_table(
        'run_info',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('run_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('last_notification_index', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ['run_id'],
            ['run.id'],
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('run_info')

    op.drop_constraint(None, 'note', type_='foreignkey')
    op.drop_column('note', 'experiment_id')
    op.drop_column('experiment', 'description')
    # ### end Alembic commands ###
