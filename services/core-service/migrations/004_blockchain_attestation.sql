-- Blockchain attestation is optional and disabled by default.
-- PostgreSQL remains the operational source of truth; the chain stores only a hash.

ALTER TABLE orders.orders
  ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(30) NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66),
  ADD COLUMN IF NOT EXISTS blockchain_evidence_hash VARCHAR(66),
  ADD COLUMN IF NOT EXISTS blockchain_network VARCHAR(40),
  ADD COLUMN IF NOT EXISTS blockchain_contract_address VARCHAR(42),
  ADD COLUMN IF NOT EXISTS blockchain_attested_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_blockchain_status_check'
      AND conrelid = 'orders.orders'::regclass
  ) THEN
    ALTER TABLE orders.orders
      ADD CONSTRAINT orders_blockchain_status_check
      CHECK (blockchain_status IN ('NOT_REQUIRED', 'PENDING', 'CONFIRMED', 'FAILED'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_blockchain_tx_hash
  ON orders.orders(blockchain_tx_hash)
  WHERE blockchain_tx_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_blockchain_evidence_hash
  ON orders.orders(blockchain_evidence_hash)
  WHERE blockchain_evidence_hash IS NOT NULL;

ALTER TABLE mq.outbox
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

ALTER TABLE mq.outbox DROP CONSTRAINT IF EXISTS outbox_status_check;
ALTER TABLE mq.outbox
  ADD CONSTRAINT outbox_status_check
  CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'));

CREATE INDEX IF NOT EXISTS idx_outbox_processing_lease
  ON mq.outbox(locked_at)
  WHERE status = 'PROCESSING';
