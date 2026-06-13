-- Paybook Phase 1 — Section 2: Database Schema
-- Transcribed verbatim from FRD v1.0. No fields added, renamed, or reordered.

-- 2.1 Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2.2 shops
CREATE TABLE shops (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  owner_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  currency          text NOT NULL DEFAULT 'NGN',
  whatsapp_number   text NOT NULL,
  timezone          text NOT NULL DEFAULT 'Africa/Lagos',
  briefing_time     time NOT NULL DEFAULT '20:00',
  briefing_enabled  boolean NOT NULL DEFAULT true,
  recon_tolerance   numeric(10,2) NOT NULL DEFAULT 50.00,
  created_at        timestamptz DEFAULT now()
);

-- 2.3 products
CREATE TABLE products (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id               uuid REFERENCES shops(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  category              text,
  sell_price            numeric(12,2) NOT NULL,
  cost_price            numeric(12,2),
  stock_qty             integer NOT NULL DEFAULT 0,
  low_stock_threshold   integer NOT NULL DEFAULT 5,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- 2.4 staff
CREATE TABLE staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid REFERENCES shops(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text,
  role        text NOT NULL CHECK (role IN ('owner', 'manager', 'cashier')),
  pin_hash    text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- 2.5 sales
CREATE TABLE sales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         uuid REFERENCES shops(id) ON DELETE CASCADE,
  cashier_id      uuid REFERENCES staff(id),
  total           numeric(12,2) NOT NULL,
  payment_method  text NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'pos', 'credit')),
  note            text,
  sold_at         timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  is_deleted      boolean NOT NULL DEFAULT false,
  deleted_by      uuid REFERENCES staff(id),
  deleted_at      timestamptz
);

-- 2.6 sale_items
-- product_name, sell_price, cost_price are DENORMALISED — captured at time of sale.
-- Never join to products.sell_price for historical display.
CREATE TABLE sale_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id    uuid REFERENCES products(id),
  product_name  text NOT NULL,
  sell_price    numeric(12,2) NOT NULL,
  cost_price    numeric(12,2),
  quantity      integer NOT NULL CHECK (quantity > 0)
);

-- 2.7 reconciliations
CREATE TABLE reconciliations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        uuid REFERENCES shops(id) ON DELETE CASCADE,
  cashier_id     uuid REFERENCES staff(id),
  date           date NOT NULL,
  expected_cash  numeric(12,2) NOT NULL,
  actual_cash    numeric(12,2),
  discrepancy    numeric(12,2) GENERATED ALWAYS AS (actual_cash - expected_cash) STORED,
  completed_by   uuid REFERENCES staff(id),
  completed_at   timestamptz,
  UNIQUE (shop_id, cashier_id, date)
);

-- 2.8 customer_credits
CREATE TABLE customer_credits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         uuid REFERENCES shops(id) ON DELETE CASCADE,
  customer_name   text NOT NULL,
  customer_phone  text,
  amount_owed     numeric(12,2) NOT NULL DEFAULT 0,
  is_settled      boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  last_payment_at timestamptz
);

-- 2.9 credit_transactions
CREATE TABLE credit_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id    uuid REFERENCES customer_credits(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('charge', 'payment')),
  amount       numeric(12,2) NOT NULL,
  note         text,
  recorded_by  uuid REFERENCES staff(id),
  created_at   timestamptz DEFAULT now()
);

-- 2.10 audit_log
CREATE TABLE audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      uuid REFERENCES shops(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES staff(id),
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    uuid NOT NULL,
  payload      jsonb,
  created_at   timestamptz DEFAULT now()
);
