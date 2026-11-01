const { pool } = require('../src/config/database');

afterAll(async () => {
  await pool.end();
});

describe('Seguridad de persistencia', () => {
  it('mantiene RLS habilitado en todas las tablas del Core', async () => {
    const result = await pool.query(
      `SELECT n.nspname AS schema_name, c.relname AS table_name, c.relrowsecurity
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname IN ('catalog', 'inventory', 'orders', 'payments', 'mq')
          AND c.relkind = 'r'
        ORDER BY n.nspname, c.relname`
    );

    expect(result.rows).toHaveLength(8);
    expect(result.rows.every((row) => row.relrowsecurity === true)).toBe(true);
  });

  it('no concede privilegios de tablas al rol PUBLIC', async () => {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS total
         FROM information_schema.role_table_grants
        WHERE grantee = 'PUBLIC'
          AND table_schema IN ('catalog', 'inventory', 'orders', 'payments', 'mq')`
    );
    expect(result.rows[0].total).toBe(0);
  });
});
