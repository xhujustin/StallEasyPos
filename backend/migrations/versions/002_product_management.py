"""add product management tables

Revision ID: 002_product_management
Revises: a555165f1aa0
Create Date: 2026-02-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_product_management'
down_revision = 'a555165f1aa0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. 新增 categories 表
    op.create_table(
        'categories',
        sa.Column('id', sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column('store_id', sa.BigInteger(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', 'name', name='uq_categories_store_name')
    )
    op.create_index('idx_categories_store', 'categories', ['store_id'])

    # 2. 新增 materials 表 (耗材/原料)
    op.create_table(
        'materials',
        sa.Column('id', sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column('store_id', sa.BigInteger(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('unit', sa.Text(), nullable=False),
        sa.Column('stock_quantity', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('unit_cost', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('low_stock_threshold', sa.Numeric(10, 2), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', 'name', name='uq_materials_store_name')
    )
    op.create_index('idx_materials_store', 'materials', ['store_id'])

    # 3. 新增 product_attributes 表 (商品屬性定義)
    op.create_table(
        'product_attributes',
        sa.Column('id', sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column('product_id', sa.BigInteger(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('is_required', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('display_order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_product_attributes_product', 'product_attributes', ['product_id'])

    # 4. 新增 product_attribute_options 表 (屬性選項)
    op.create_table(
        'product_attribute_options',
        sa.Column('id', sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column('attribute_id', sa.BigInteger(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('price_adjustment', sa.Numeric(10, 2), nullable=True, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('display_order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['attribute_id'], ['product_attributes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_attribute_options_attribute', 'product_attribute_options', ['attribute_id'])

    # 5. 新增 option_materials 表 (選項耗材關聯)
    op.create_table(
        'option_materials',
        sa.Column('id', sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column('option_id', sa.BigInteger(), nullable=False),
        sa.Column('material_id', sa.BigInteger(), nullable=False),
        sa.Column('quantity', sa.Numeric(10, 2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['option_id'], ['product_attribute_options.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('option_id', 'material_id', name='uq_option_materials')
    )
    op.create_index('idx_option_materials_option', 'option_materials', ['option_id'])
    op.create_index('idx_option_materials_material', 'option_materials', ['material_id'])

    # 6. 新增 store_settings 表 (店鋪設定)
    op.create_table(
        'store_settings',
        sa.Column('id', sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column('store_id', sa.BigInteger(), nullable=False),
        sa.Column('fixed_cost_per_item', sa.Numeric(10, 2), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('store_id', name='uq_store_settings_store')
    )
    op.create_index('idx_store_settings_store', 'store_settings', ['store_id'])

    # 7. 修改 products 表
    # 新增 image_url 欄位
    op.add_column('products', sa.Column('image_url', sa.Text(), nullable=True))
    
    # 移除 attributes 欄位 (如果存在)
    # 注意: 如果資料庫中已有資料,需要先備份
    # op.drop_column('products', 'attributes')


def downgrade() -> None:
    # 反向操作
    # op.add_column('products', sa.Column('attributes', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.drop_column('products', 'image_url')
    
    op.drop_index('idx_store_settings_store', table_name='store_settings')
    op.drop_table('store_settings')
    
    op.drop_index('idx_option_materials_material', table_name='option_materials')
    op.drop_index('idx_option_materials_option', table_name='option_materials')
    op.drop_table('option_materials')
    
    op.drop_index('idx_attribute_options_attribute', table_name='product_attribute_options')
    op.drop_table('product_attribute_options')
    
    op.drop_index('idx_product_attributes_product', table_name='product_attributes')
    op.drop_table('product_attributes')
    
    op.drop_index('idx_materials_store', table_name='materials')
    op.drop_table('materials')
    
    op.drop_index('idx_categories_store', table_name='categories')
    op.drop_table('categories')
