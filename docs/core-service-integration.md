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
DATABASE_URL=postgresql://usuario:password@host:5432/acordes_core
RESERVATION_TTL_MINUTES=5
RESERVATION_JOB_INTERVAL_SECONDS=30
OUTBOX_POLL_INTERVAL_SECONDS=5
OUTBOX_MAX_ATTEMPTS=3
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
