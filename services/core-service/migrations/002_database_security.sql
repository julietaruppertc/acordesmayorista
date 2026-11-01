-- Seguridad para PostgreSQL local y Supabase.
-- La aplicación web no accede directamente a estas tablas: todas las operaciones
-- pasan por Gateway y Core. Por eso no se crean políticas públicas de lectura o escritura.

REVOKE ALL PRIVILEGES ON SCHEMA catalog, inventory, orders, payments, mq FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA catalog, inventory, orders, payments, mq FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA catalog, inventory, orders, payments, mq FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA catalog, inventory, orders, payments, mq
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA catalog, inventory, orders, payments, mq
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC;

ALTER TABLE catalog.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments.webhook_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mq.outbox ENABLE ROW LEVEL SECURITY;

-- Supabase crea los roles anon y authenticated. El bloque es condicional para
-- que la misma migración también funcione en PostgreSQL local.
DO $$
DECLARE
  role_name TEXT;
BEGIN
  FOR role_name IN
    SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON SCHEMA catalog, inventory, orders, payments, mq FROM %I',
      role_name
    );
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA catalog, inventory, orders, payments, mq FROM %I',
      role_name
    );
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA catalog, inventory, orders, payments, mq FROM %I',
      role_name
    );
  END LOOP;
END
$$;
