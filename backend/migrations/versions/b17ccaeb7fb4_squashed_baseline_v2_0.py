"""squashed_baseline_v2_0

Revision ID: b17ccaeb7fb4
Revises: 
Create Date: 2026-02-17 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b17ccaeb7fb4'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute(sa.text('''﻿CREATE TYPE user_role AS ENUM (\'owner\', \'manager\', \'staff\')
CREATE TYPE order_source AS ENUM (\'pos\', \'delivery\')
CREATE TYPE order_type AS ENUM (\'dine_in\', \'take_out\', \'delivery\')
CREATE TYPE order_status AS ENUM (\'draft\', \'pending_payment\', \'paid\', \'completed\', \'cancelled\', \'needs_review\')
CREATE TYPE payment_method AS ENUM (\'cash\', \'linepay\', \'platform_collect\')
CREATE TYPE payment_status AS ENUM (\'created\', \'pending\', \'success\', \'failed\', \'manual_confirmed\', \'voided\')
CREATE TYPE invoice_status AS ENUM (\'none\', \'pending\', \'issued\', \'failed\', \'voided\')
CREATE TYPE adjustment_type AS ENUM (\'increase\', \'decrease\')
CREATE TYPE audit_action AS ENUM (\'order_created\', \'order_voided\', \'payment_created\', \'payment_confirmed\', \'closing_locked\', \'adjustment_created\', \'invoice_requested\', \'invoice_issued\', \'invoice_failed\', \'invoice_retry\')
CREATE TYPE shift_status AS ENUM (\'open\', \'closed\')
CREATE TYPE setting_scope AS ENUM (\'store\', \'device\', \'user\')'''))
    op.execute(sa.text('''CREATE TABLE users (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	username TEXT NOT NULL, 
	hashed_password TEXT NOT NULL, 
	is_admin BOOLEAN DEFAULT \'false\' NOT NULL, 
	full_name TEXT, 
	nickname TEXT, 
	email TEXT, 
	phone TEXT, 
	gender TEXT, 
	address TEXT, 
	birthday TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_users PRIMARY KEY (id), 
	CONSTRAINT uq_users_username UNIQUE (username)
)'''))
    op.execute(sa.text('''CREATE TABLE stores (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	name TEXT NOT NULL, 
	store_account TEXT, 
	owner_id BIGINT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_stores PRIMARY KEY (id), 
	CONSTRAINT uq_stores_store_account UNIQUE (store_account)
)'''))
    op.execute(sa.text('''CREATE INDEX ix_stores_owner_id ON stores (owner_id)'''))
    op.execute(sa.text('''CREATE TABLE store_users (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	store_id BIGINT NOT NULL, 
	user_id BIGINT NOT NULL, 
	role user_role NOT NULL, 
	pin_hash TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_store_users PRIMARY KEY (id), 
	CONSTRAINT uq_store_users_store_user UNIQUE (store_id, user_id), 
	CONSTRAINT fk_store_users_store_id_stores FOREIGN KEY(store_id) REFERENCES stores (id) ON DELETE CASCADE, 
	CONSTRAINT fk_store_users_user_id_users FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
)'''))
    op.execute(sa.text('''CREATE INDEX ix_store_users_store_id ON store_users (store_id)
CREATE INDEX ix_store_users_user_id ON store_users (user_id)'''))
    op.execute(sa.text('''CREATE TABLE products (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	store_id BIGINT NOT NULL, 
	name TEXT NOT NULL, 
	price NUMERIC(10, 2) NOT NULL, 
	cost NUMERIC(10, 2), 
	category TEXT, 
	image_url TEXT, 
	is_active BOOLEAN DEFAULT \'true\' NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_products PRIMARY KEY (id), 
	CONSTRAINT fk_products_store_id_stores FOREIGN KEY(store_id) REFERENCES stores (id) ON DELETE CASCADE
)'''))
    op.execute(sa.text('''CREATE INDEX idx_products_store_category ON products (store_id, category)
CREATE INDEX ix_products_store_id ON products (store_id)'''))
    op.execute(sa.text('''CREATE TABLE materials (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	store_id BIGINT NOT NULL, 
	name TEXT NOT NULL, 
	unit TEXT NOT NULL, 
	stock_quantity NUMERIC(10, 4) DEFAULT \'0\' NOT NULL, 
	unit_cost NUMERIC(10, 4) DEFAULT \'0\' NOT NULL, 
	low_stock_threshold NUMERIC(10, 4) DEFAULT \'0\', 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_materials PRIMARY KEY (id), 
	CONSTRAINT uq_materials_store_name UNIQUE (store_id, name), 
	CONSTRAINT fk_materials_store_id_stores FOREIGN KEY(store_id) REFERENCES stores (id) ON DELETE CASCADE
)'''))
    op.execute(sa.text('''CREATE INDEX idx_materials_store ON materials (store_id)'''))
    op.execute(sa.text('''CREATE TABLE categories (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	store_id BIGINT NOT NULL, 
	name TEXT NOT NULL, 
	description TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_categories PRIMARY KEY (id), 
	CONSTRAINT uq_categories_store_name UNIQUE (store_id, name), 
	CONSTRAINT fk_categories_store_id_stores FOREIGN KEY(store_id) REFERENCES stores (id) ON DELETE CASCADE
)'''))
    op.execute(sa.text('''CREATE INDEX idx_categories_store ON categories (store_id)'''))
    op.execute(sa.text('''CREATE TABLE daily_closings (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	store_id BIGINT NOT NULL, 
	business_date DATE NOT NULL, 
	expected_cash NUMERIC(10, 2) DEFAULT \'0\' NOT NULL, 
	actual_cash NUMERIC(10, 2) DEFAULT \'0\' NOT NULL, 
	short_over NUMERIC(10, 2) DEFAULT \'0\' NOT NULL, 
	locked_by BIGINT NOT NULL, 
	locked_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_daily_closings PRIMARY KEY (id), 
	CONSTRAINT uq_daily_closings_store_date UNIQUE (store_id, business_date), 
	CONSTRAINT fk_daily_closings_store_id_stores FOREIGN KEY(store_id) REFERENCES stores (id) ON DELETE RESTRICT, 
	CONSTRAINT fk_daily_closings_locked_by_users FOREIGN KEY(locked_by) REFERENCES users (id)
)'''))
    op.execute(sa.text('''CREATE INDEX idx_closings_store_date ON daily_closings (store_id, business_date)'''))
    op.execute(sa.text('''CREATE TABLE audit_logs (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	store_id BIGINT NOT NULL, 
	actor_user_id BIGINT NOT NULL, 
	action audit_action NOT NULL, 
	entity_type TEXT NOT NULL, 
	entity_id BIGINT NOT NULL, 
	snapshot JSONB NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_audit_logs PRIMARY KEY (id), 
	CONSTRAINT fk_audit_logs_store_id_stores FOREIGN KEY(store_id) REFERENCES stores (id) ON DELETE RESTRICT, 
	CONSTRAINT fk_audit_logs_actor_user_id_users FOREIGN KEY(actor_user_id) REFERENCES users (id)
)'''))
    op.execute(sa.text('''CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id)
CREATE INDEX idx_audit_store_created ON audit_logs (store_id, created_at)'''))
    op.execute(sa.text('''CREATE TABLE shifts (
	id BIGSERIAL NOT NULL, 
	store_id BIGINT NOT NULL, 
	start_time TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	end_time TIMESTAMP WITH TIME ZONE, 
	initial_cash NUMERIC(10, 2) NOT NULL, 
	final_cash NUMERIC(10, 2), 
	cash_added NUMERIC(10, 2) NOT NULL, 
	cash_removed NUMERIC(10, 2) NOT NULL, 
	total_sales NUMERIC(10, 2) NOT NULL, 
	cash_sales NUMERIC(10, 2) NOT NULL, 
	total_net_profit NUMERIC(10, 2) NOT NULL, 
	order_count INTEGER NOT NULL, 
	opened_by_id BIGINT NOT NULL, 
	closed_by_id BIGINT, 
	status shift_status NOT NULL, 
	CONSTRAINT pk_shifts PRIMARY KEY (id), 
	CONSTRAINT fk_shifts_store_id_stores FOREIGN KEY(store_id) REFERENCES stores (id), 
	CONSTRAINT fk_shifts_opened_by_id_users FOREIGN KEY(opened_by_id) REFERENCES users (id), 
	CONSTRAINT fk_shifts_closed_by_id_users FOREIGN KEY(closed_by_id) REFERENCES users (id)
)'''))
    op.execute(sa.text('''CREATE INDEX ix_shifts_store_id ON shifts (store_id)
CREATE INDEX ix_shifts_id ON shifts (id)
CREATE INDEX ix_shifts_status ON shifts (status)'''))
    op.execute(sa.text('''CREATE TABLE system_settings (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	store_id BIGINT NOT NULL, 
	scope setting_scope DEFAULT \'store\' NOT NULL, 
	target_id TEXT, 
	key TEXT NOT NULL, 
	value JSONB NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_system_settings PRIMARY KEY (id), 
	CONSTRAINT uq_system_settings_key UNIQUE (store_id, scope, target_id, key), 
	CONSTRAINT fk_system_settings_store_id_stores FOREIGN KEY(store_id) REFERENCES stores (id) ON DELETE CASCADE
)'''))
    op.execute(sa.text('''CREATE INDEX idx_system_settings_key ON system_settings (key)
CREATE INDEX idx_system_settings_store_scope ON system_settings (store_id, scope)'''))
    op.execute(sa.text('''CREATE TABLE product_materials (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	product_id BIGINT NOT NULL, 
	material_id BIGINT NOT NULL, 
	quantity NUMERIC(10, 4) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_product_materials PRIMARY KEY (id), 
	CONSTRAINT uq_product_materials UNIQUE (product_id, material_id), 
	CONSTRAINT fk_product_materials_product_id_products FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE, 
	CONSTRAINT fk_product_materials_material_id_materials FOREIGN KEY(material_id) REFERENCES materials (id) ON DELETE RESTRICT
)'''))
    op.execute(sa.text('''CREATE INDEX idx_product_materials_product ON product_materials (product_id)'''))
    op.execute(sa.text('''CREATE TABLE product_attributes (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	product_id BIGINT NOT NULL, 
	name TEXT NOT NULL, 
	min_selection INTEGER DEFAULT \'0\' NOT NULL, 
	max_selection INTEGER DEFAULT \'1\' NOT NULL, 
	display_order INTEGER DEFAULT \'0\' NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_product_attributes PRIMARY KEY (id), 
	CONSTRAINT fk_product_attributes_product_id_products FOREIGN KEY(product_id) REFERENCES products (id) ON DELETE CASCADE
)'''))
    op.execute(sa.text('''CREATE INDEX idx_product_attributes_product ON product_attributes (product_id)'''))
    op.execute(sa.text('''CREATE TABLE orders (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	store_id BIGINT NOT NULL, 
	shift_id BIGINT, 
	order_no BIGINT NOT NULL, 
	source order_source DEFAULT \'pos\' NOT NULL, 
	order_type order_type DEFAULT \'take_out\' NOT NULL, 
	status order_status NOT NULL, 
	service_fee_rate NUMERIC(5, 2) DEFAULT \'0\' NOT NULL, 
	subtotal NUMERIC(10, 2) DEFAULT \'0\' NOT NULL, 
	service_fee NUMERIC(10, 2) DEFAULT \'0\' NOT NULL, 
	total_amount NUMERIC(10, 2) NOT NULL, 
	payment_method payment_method, 
	idempotency_key TEXT NOT NULL, 
	business_date DATE DEFAULT CURRENT_DATE NOT NULL, 
	is_voided BOOLEAN DEFAULT \'false\' NOT NULL, 
	voided_at TIMESTAMP WITH TIME ZONE, 
	voided_by BIGINT, 
	void_reason TEXT, 
	created_by_id BIGINT, 
	cash_received NUMERIC(10, 2), 
	change_amount NUMERIC(10, 2), 
	discount_amount NUMERIC(10, 2) DEFAULT \'0\' NOT NULL, 
	discount_note TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_orders PRIMARY KEY (id), 
	CONSTRAINT uq_orders_store_date_orderno UNIQUE (store_id, business_date, order_no), 
	CONSTRAINT uq_orders_store_idempotency UNIQUE (store_id, idempotency_key), 
	CONSTRAINT fk_orders_store_id_stores FOREIGN KEY(store_id) REFERENCES stores (id) ON DELETE RESTRICT, 
	CONSTRAINT fk_orders_shift_id_shifts FOREIGN KEY(shift_id) REFERENCES shifts (id) ON DELETE SET NULL, 
	CONSTRAINT fk_orders_voided_by_users FOREIGN KEY(voided_by) REFERENCES users (id), 
	CONSTRAINT fk_orders_created_by_id_users FOREIGN KEY(created_by_id) REFERENCES users (id)
)'''))
    op.execute(sa.text('''CREATE INDEX idx_orders_store_date ON orders (store_id, business_date)
CREATE INDEX ix_orders_shift_id ON orders (shift_id)
CREATE INDEX idx_orders_store_status ON orders (store_id, status)
CREATE INDEX idx_orders_store_created ON orders (store_id, created_at)'''))
    op.execute(sa.text('''CREATE TABLE shift_transactions (
	id BIGSERIAL NOT NULL, 
	shift_id BIGINT NOT NULL, 
	user_id BIGINT NOT NULL, 
	type TEXT NOT NULL, 
	amount NUMERIC(10, 2) NOT NULL, 
	reason TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_shift_transactions PRIMARY KEY (id), 
	CONSTRAINT fk_shift_transactions_shift_id_shifts FOREIGN KEY(shift_id) REFERENCES shifts (id), 
	CONSTRAINT fk_shift_transactions_user_id_users FOREIGN KEY(user_id) REFERENCES users (id)
)'''))
    op.execute(sa.text('''CREATE INDEX ix_shift_transactions_id ON shift_transactions (id)
CREATE INDEX ix_shift_transactions_shift_id ON shift_transactions (shift_id)'''))
    op.execute(sa.text('''CREATE TABLE product_attribute_options (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	attribute_id BIGINT NOT NULL, 
	name TEXT NOT NULL, 
	price_adjustment NUMERIC(10, 2) DEFAULT \'0\' NOT NULL, 
	is_active BOOLEAN DEFAULT \'true\' NOT NULL, 
	display_order INTEGER DEFAULT \'0\' NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_product_attribute_options PRIMARY KEY (id), 
	CONSTRAINT fk_product_attribute_options_attribute_id_product_attributes FOREIGN KEY(attribute_id) REFERENCES product_attributes (id) ON DELETE CASCADE
)'''))
    op.execute(sa.text('''CREATE INDEX idx_attribute_options_attribute ON product_attribute_options (attribute_id)'''))
    op.execute(sa.text('''CREATE TABLE order_items (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	order_id BIGINT NOT NULL, 
	product_id BIGINT, 
	name_snapshot TEXT NOT NULL, 
	price_snapshot NUMERIC(10, 2) NOT NULL, 
	cost_snapshot NUMERIC(10, 2), 
	quantity NUMERIC(10, 3) DEFAULT \'1\' NOT NULL, 
	note TEXT, 
	packaging_used TEXT, 
	options JSONB, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_order_items PRIMARY KEY (id), 
	CONSTRAINT fk_order_items_order_id_orders FOREIGN KEY(order_id) REFERENCES orders (id) ON DELETE CASCADE
)'''))
    op.execute(sa.text('''CREATE INDEX ix_order_items_order_id ON order_items (order_id)'''))
    op.execute(sa.text('''CREATE TABLE payments (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	order_id BIGINT NOT NULL, 
	store_id BIGINT NOT NULL, 
	method payment_method NOT NULL, 
	provider TEXT, 
	provider_txn_id TEXT, 
	status payment_status NOT NULL, 
	amount NUMERIC(10, 2) NOT NULL, 
	idempotency_key TEXT NOT NULL, 
	raw_payload JSONB, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_payments PRIMARY KEY (id), 
	CONSTRAINT uq_payments_store_idempotency UNIQUE (store_id, idempotency_key), 
	CONSTRAINT uq_payments_provider_txn UNIQUE (provider, provider_txn_id), 
	CONSTRAINT fk_payments_order_id_orders FOREIGN KEY(order_id) REFERENCES orders (id) ON DELETE CASCADE, 
	CONSTRAINT fk_payments_store_id_stores FOREIGN KEY(store_id) REFERENCES stores (id) ON DELETE RESTRICT
)'''))
    op.execute(sa.text('''CREATE INDEX idx_payments_store_created ON payments (store_id, created_at)
CREATE INDEX idx_payments_status ON payments (status)
CREATE INDEX ix_payments_order_id ON payments (order_id)'''))
    op.execute(sa.text('''CREATE TABLE invoice_records (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	store_id BIGINT NOT NULL, 
	order_id BIGINT NOT NULL, 
	status invoice_status DEFAULT \'pending\' NOT NULL, 
	invoice_number TEXT, 
	carrier TEXT, 
	tax_id TEXT, 
	provider TEXT, 
	error_message TEXT, 
	last_attempt_at TIMESTAMP WITH TIME ZONE, 
	next_retry_at TIMESTAMP WITH TIME ZONE, 
	failed_since TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_invoice_records PRIMARY KEY (id), 
	CONSTRAINT uq_invoice_order UNIQUE (order_id), 
	CONSTRAINT fk_invoice_records_store_id_stores FOREIGN KEY(store_id) REFERENCES stores (id) ON DELETE RESTRICT, 
	CONSTRAINT fk_invoice_records_order_id_orders FOREIGN KEY(order_id) REFERENCES orders (id) ON DELETE CASCADE
)'''))
    op.execute(sa.text('''CREATE INDEX idx_invoices_store_status ON invoice_records (store_id, status)
CREATE INDEX idx_invoices_failed_since ON invoice_records (failed_since)'''))
    op.execute(sa.text('''CREATE TABLE adjustments (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	store_id BIGINT NOT NULL, 
	business_date DATE NOT NULL, 
	adjustment_type adjustment_type NOT NULL, 
	amount NUMERIC(10, 2) NOT NULL, 
	reason_code TEXT NOT NULL, 
	reason_note TEXT, 
	related_order_id BIGINT, 
	created_by BIGINT NOT NULL, 
	ai_flag TEXT DEFAULT \'none\' NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_adjustments PRIMARY KEY (id), 
	CONSTRAINT fk_adjustments_store_id_stores FOREIGN KEY(store_id) REFERENCES stores (id) ON DELETE RESTRICT, 
	CONSTRAINT fk_adjustments_related_order_id_orders FOREIGN KEY(related_order_id) REFERENCES orders (id), 
	CONSTRAINT fk_adjustments_created_by_users FOREIGN KEY(created_by) REFERENCES users (id)
)'''))
    op.execute(sa.text('''CREATE INDEX idx_adjustments_store_date ON adjustments (store_id, business_date)'''))
    op.execute(sa.text('''CREATE TABLE option_materials (
	id BIGINT GENERATED ALWAYS AS IDENTITY, 
	option_id BIGINT NOT NULL, 
	material_id BIGINT NOT NULL, 
	quantity NUMERIC(10, 2) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_option_materials PRIMARY KEY (id), 
	CONSTRAINT uq_option_materials UNIQUE (option_id, material_id), 
	CONSTRAINT fk_option_materials_option_id_product_attribute_options FOREIGN KEY(option_id) REFERENCES product_attribute_options (id) ON DELETE CASCADE, 
	CONSTRAINT fk_option_materials_material_id_materials FOREIGN KEY(material_id) REFERENCES materials (id) ON DELETE CASCADE
)'''))
    op.execute(sa.text('''CREATE INDEX idx_option_materials_option ON option_materials (option_id)
CREATE INDEX idx_option_materials_material ON option_materials (material_id)'''))


def downgrade() -> None:
    pass
