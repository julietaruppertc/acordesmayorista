ALTER TABLE catalog.products
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN catalog.products.image_url IS
  'Ruta pública de la imagen de catálogo. No almacena binarios ni datos privados.';
