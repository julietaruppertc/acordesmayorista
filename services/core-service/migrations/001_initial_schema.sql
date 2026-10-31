CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS mq;

CREATE TABLE IF NOT EXISTS catalog.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catalog.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES catalog.categories(id),
  name VARCHAR(160) NOT NULL,
  description TEXT,
  price NUMERIC(14, 2) NOT NULL CHECK (price >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON catalog.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active_name ON catalog.products(active, name);

CREATE TABLE IF NOT EXISTS inventory.stock (
  product_id UUID PRIMARY KEY REFERENCES catalog.products(id),
  on_hand INTEGER NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_reserved_not_above_on_hand CHECK (reserved <= on_hand)
);

CREATE TABLE IF NOT EXISTS orders.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(200) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (
    status IN ('PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED', 'EXPIRED', 'CANCELLED')
  ),
  total NUMERIC(14, 2) NOT NULL CHECK (total >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  trace_id VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_pending_expiration
  ON orders.orders(expires_at) WHERE status = 'PENDING_PAYMENT';

CREATE TABLE IF NOT EXISTS orders.order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES catalog.products(id),
  product_name VARCHAR(160) NOT NULL,
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  UNIQUE (order_id, product_id)
);

CREATE TABLE IF NOT EXISTS payments.webhook_inbox (
  payment_id VARCHAR(200) PRIMARY KEY,
  order_id UUID NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_payment_id VARCHAR(200) NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES orders.orders(id),
  status VARCHAR(30) NOT NULL CHECK (status IN ('APPROVED', 'REJECTED')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mq.outbox (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  trace_id VARCHAR(200),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending
  ON mq.outbox(created_at) WHERE status = 'PENDING';
