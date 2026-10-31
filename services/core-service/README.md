# Servicio Core — Acordes Mayorista

Responsable principal: Paz Sinner.

Gestiona catálogo, inventario, reservas, pedidos, pagos simulados y eventos Outbox. No administra usuarios ni valida JWT: el API Gateway valida el token y propaga `X-User-Id`, `X-User-Role` y `X-Trace-Id`.

## Preparación local

1. Copiar `.env.example` como `.env`.
2. Configurar `DATABASE_URL`.
3. Ejecutar `npm install`.
4. Ejecutar `npm run migrate`.
5. Ejecutar `npm run seed`.
6. Iniciar con `npm run dev` (utiliza el modo `--watch` incluido en Node.js).

## Procesos

- API: `npm start`
- Worker de notificaciones: `npm run worker`
- Expiración de reservas: `npm run expire-reservations`
- Pruebas: `npm test`
- Demostración de concurrencia e idempotencia: `npm run demo:critical`

## Rutas

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/health` | Estado del proceso, sin consultar PostgreSQL |
| GET | `/ready` | Disponibilidad de PostgreSQL |
| GET | `/api/products` | Catálogo paginado |
| GET | `/api/products/:id` | Detalle de producto |
| PATCH | `/api/operator/products/:productId/stock` | Ajuste optimista de stock |
| POST | `/api/orders/checkout` | Reserva stock y crea pedido |
| GET | `/api/orders` | Pedidos del cliente o todos para roles internos |
| GET | `/api/orders/:id` | Detalle de pedido |
| POST | `/api/payments/webhook` | Confirmación idempotente de pago |

## Contrato de checkout

```json
{
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "expectedVersion": 3
    }
  ]
}
```

El cliente debe conservar la `version` recibida en el catálogo. Un cambio concurrente produce `409 STOCK_VERSION_CONFLICT`; la falta de unidades produce `409 INSUFFICIENT_STOCK`.

## Contrato del webhook simulado

```json
{
  "paymentId": "PAY-DEMO-001",
  "orderId": "uuid",
  "status": "APPROVED",
  "amount": 500000
}
```

Estados admitidos: `APPROVED` y `REJECTED`. Repetir el mismo `paymentId` responde `200` y no vuelve a modificar stock, pedido ni Outbox.

## Identidad propagada por Gateway

Las rutas de pedidos esperan:

```text
X-User-Id: identificador del claim sub
X-User-Role: cliente | operador | admin
X-Trace-Id: identificador de la operación
```

Estos nombres coinciden con los valores que actualmente emite el servicio Auth.

## Pruebas manuales y contratos

- Solicitudes para la extensión REST Client: `requests/core.http`.
- Contratos compartidos: `shared/contracts/core` desde la raíz del repositorio.
- Guía para los otros integrantes: `docs/core-service-integration.md`.
- Decisiones: `docs/core-service-decisions.md`.

La suite automatizada requiere PostgreSQL con las migraciones y semillas aplicadas. Incluye diez checkouts simultáneos, webhooks repetidos, pago rechazado, vencimiento, pago tardío, permisos, rollback completo y procesamiento de Outbox.
