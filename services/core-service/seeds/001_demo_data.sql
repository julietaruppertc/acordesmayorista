INSERT INTO catalog.categories (name)
VALUES ('Guitarras'), ('Teclados'), ('Percusión')
ON CONFLICT (name) DO NOTHING;

WITH new_products(category_name, name, description, price, on_hand) AS (
  VALUES
    ('Guitarras', 'Guitarra acústica', 'Guitarra de estudio con cuerdas de acero.', 250000.00, 10),
    ('Guitarras', 'Guitarra eléctrica', 'Modelo de cuerpo sólido para práctica y escenario.', 420000.00, 6),
    ('Teclados', 'Teclado de 61 teclas', 'Teclado portátil sensible a la velocidad.', 380000.00, 8),
    ('Percusión', 'Cajón peruano', 'Cajón de madera con bordona regulable.', 145000.00, 12),
    ('Percusión', 'Batería acústica', 'Set de cinco cuerpos para ensayo.', 980000.00, 3)
), inserted AS (
  INSERT INTO catalog.products (category_id, name, description, price)
  SELECT c.id, np.name, np.description, np.price
    FROM new_products np
    JOIN catalog.categories c ON c.name = np.category_name
   WHERE NOT EXISTS (SELECT 1 FROM catalog.products p WHERE p.name = np.name)
  RETURNING id, name
)
INSERT INTO inventory.stock (product_id, on_hand, reserved, version)
SELECT i.id, np.on_hand, 0, 1
  FROM inserted i
  JOIN new_products np ON np.name = i.name
ON CONFLICT (product_id) DO NOTHING;
