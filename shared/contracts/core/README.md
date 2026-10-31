# Contratos compartidos del Servicio Core

Estos archivos contienen ejemplos canónicos de los cuerpos que intercambian Frontend, Gateway y Core. Cualquier cambio debe acordarse y actualizarse aquí antes de modificar consumidores.

Reglas comunes:

- JSON usa `camelCase`.
- Los identificadores de catálogo y pedidos son UUID.
- Auth emite los roles `cliente`, `operador` y `admin`.
- Gateway propaga `X-User-Id`, `X-User-Role` y `X-Trace-Id`.
- El frontend conserva `version` del producto y la envía como `expectedVersion`.
- Los importes son números expresados en pesos para el MVP.
- Todos los errores incluyen `error`, `message` y `traceId`.

Los archivos son ejemplos válidos, no contienen credenciales ni valores de producción.
