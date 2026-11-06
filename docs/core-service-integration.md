# Integración del Servicio Core

Este documento resume lo que necesitan Gateway, Auth, Frontend y despliegue para integrar el Core sin cambiar contratos existentes.

## Servicio y variables

- Carpeta: `services/core-service`
- Puerto: `4002`
- Health: `GET /health`
- Readiness con base: `GET /ready`
- Inicio API: `npm start`
- Worker Outbox: `npm run worker`
- Expiración de reservas: `npm run expire-reservations`

Variables obligatorias en nube:

```env
CORE_PORT=4002
DATABASE_URL=<postgresql-connection-string>
DATABASE_SSL=false
RESERVATION_TTL_MINUTES=5
RESERVATION_JOB_INTERVAL_SECONDS=30
OUTBOX_POLL_INTERVAL_SECONDS=5
OUTBOX_MAX_ATTEMPTS=3
PAYMENT_WEBHOOK_SECRET=<private-random-value-min-32-chars>
NODE_ENV=production
```

## Para Diego — Gateway y despliegue

El Gateway debe enviar al Core:

```text
X-User-Id: claim sub
X-User-Role: claim rol
X-Trace-Id: identificador generado o propagado
```

Los roles se mantienen en español: `cliente`, `operador`, `admin`.

| Ruta externa | Destino Core | Protección |
| --- | --- | --- |
| `GET /api/products*` | igual ruta | pública o usuario autenticado |
| `POST /api/orders/checkout` | igual ruta | `cliente` |
| `GET /api/orders*` | igual ruta | cualquier rol válido |
| `PATCH /api/operator/*` | igual ruta | `operador` o `admin` |
| `POST /api/payments/webhook` | igual ruta | simulador/proveedor autorizado |

El Core repite la autorización de negocio. No debe exponerse directamente a Internet. API, worker y proceso de expiración usan la misma imagen Docker con comandos diferentes.

El Gateway debe conservar `X-Webhook-Signature` y reenviar el cuerpo JSON sin transformarlo, porque la firma se calcula sobre sus bytes exactos.

Antes de iniciar la API en un ambiente nuevo:

```bash
npm run migrate
npm run seed
```

`seed` se utiliza solamente para demo o desarrollo.

## Para Camila — Frontend

El frontend consume siempre el Gateway. Los ejemplos canónicos están en `shared/contracts/core`.

1. Guardar `version` junto con cada producto agregado al carrito.
2. Enviar esa versión como `expectedVersion` durante el checkout.
3. Tratar `409 STOCK_VERSION_CONFLICT` solicitando recargar catálogo.
4. Tratar `409 INSUFFICIENT_STOCK` informando falta de unidades.
5. Conservar el `orderId` devuelto por checkout.
6. Para demostrar idempotencia, repetir el webhook con el mismo `paymentId`.
7. Para representar un pago diferente, generar otro `paymentId`.
8. El Frontend no debe conocer ni calcular `X-Webhook-Signature`. Para la demo se utiliza `npm run demo:critical` o un simulador backend que firme la notificación.

Estados visibles del pedido:

```text
PENDING_PAYMENT
PAID
PAYMENT_FAILED
EXPIRED
CANCELLED
```

## Para Julieta — Auth

El contrato ya coincide con Auth:

- `sub`: identificador del usuario.
- `rol`: `cliente`, `operador` o `admin`.

El Core no consulta MongoDB, no valida contraseñas y no utiliza la clave privada. La validación JWT pertenece al Gateway.

## PostgreSQL en Supabase

Supabase se usa como PostgreSQL cloud, no como acceso directo desde el navegador. Para preparar un proyecto:

- Proyecto: `acordes-mayorista`.
- Referencia pública: `kjqjzamulpfsvhrpptyc`.
- Región: South America (São Paulo), `sa-east-1`.
- Conexión del Core: Session Pooler con SSL (`DATABASE_SSL=true`).
- Data API habilitada, exposición automática de tablas deshabilitada y RLS automático habilitado.
- La integración directa con GitHub queda pendiente de autorización del propietario del repositorio y no es necesaria para ejecutar el Core.

1. Crear el proyecto en Supabase.
2. Copiar la cadena PostgreSQL desde la sección de conexión.
3. Guardarla como `DATABASE_URL` en `services/core-service/.env` y luego en los secretos del despliegue.
4. Definir `DATABASE_SSL=true` para Supabase.
5. Definir un `PAYMENT_WEBHOOK_SECRET` privado de al menos 32 caracteres.
6. Ejecutar `npm run migrate` contra la base cloud.
7. Ejecutar `npm run seed` solamente si se necesitan datos de demostración.
8. Ejecutar `npm test` y comprobar `/ready`.

Las migraciones activan RLS y bloquean `PUBLIC`, `anon` y `authenticated`. No deben crearse políticas de acceso directo para Frontend, porque esto rompería la propiedad de datos definida para el Core.

## Respuestas de error

```json
{
  "error": "STOCK_VERSION_CONFLICT",
  "message": "El stock fue modificado por otra operación.",
  "details": {},
  "traceId": "trace-example-001"
}
```

| HTTP | Código | Significado |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | DTO inválido |
| 401 | `IDENTITY_REQUIRED` | faltan encabezados de identidad |
| 401 | `WEBHOOK_SIGNATURE_REQUIRED` / `INVALID_WEBHOOK_SIGNATURE` | webhook sin origen verificable |
| 403 | `FORBIDDEN` | rol o propietario incorrecto |
| 404 | `PRODUCT_NOT_FOUND` / `ORDER_NOT_FOUND` | recurso inexistente |
| 409 | `STOCK_VERSION_CONFLICT` | versión desactualizada |
| 409 | `INSUFFICIENT_STOCK` | unidades insuficientes |

## Validación antes de integrar

Desde `services/core-service`:

```bash
npm install
npm run migrate
npm run seed
npm test
npm start
```

Con API, worker y expiración en ejecución:

```bash
npm run demo:critical
```

Resultado esperado:

```text
[CONCURRENCIA] exitosos=1 conflictos=9
[IDEMPOTENCIA] procesados=1 duplicados_ignorados=4
```

## Límites conocidos del MVP

- El proveedor de pagos es simulado.
- El worker registra la notificación en consola; no envía correos reales.
- El TTL reducido es para demostración.
- Los eventos no usan Kafka o RabbitMQ; se implementa Transactional Outbox.
- Los encabezados de identidad solo son confiables cuando el Core permanece detrás del Gateway en la red privada.
- El valor de ejemplo de `PAYMENT_WEBHOOK_SECRET` está prohibido cuando `NODE_ENV=production`.

## Imagen opcional en catálogo

El DTO de GET /api/products y GET /api/products/:id incluye imageUrl (string o null), obtenido de catalog.products.image_url. Para las imágenes incluidas, usa rutas /products/... servidas por el Frontend. Un valor null conserva el icono alternativo. No cambia id, price, availableStock, version ni expectedVersion del checkout. Ver shared/contracts/core/product-list.response.json. La migración 003_product_images.sql debe estar aplicada antes de ejecutar el Core nuevo. Supabase se verificó en lectura el 2026-11-06 y ya tiene la columna; el entorno local aislado requiere actualizar su esquema. Git pull no reconstruye las imágenes Docker existentes.
