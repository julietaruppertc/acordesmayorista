# Decisiones del Servicio Core

## Alcance y límites

El Core es propietario de catálogo, inventario, pedidos, pagos simulados y Outbox. Auth continúa siendo propiedad de Julieta; Gateway y despliegue general pertenecen a Diego; la SPA pertenece a Camila. El Core no consulta MongoDB ni lee la clave privada.

Los roles compartidos son `cliente`, `operador` y `admin`, exactamente como los emite Auth. El Gateway debe propagarlos sin traducirlos en `X-User-Role`.

El checkout está permitido únicamente para `cliente`; la consulta de pedidos acepta los tres roles y el ajuste de stock solamente `operador` o `admin`. El Core repite esta autorización aunque el Gateway también la aplique.

## DEC-MVP-01 — SQL explícito mediante `pg`

**Decisión:** usar `pg` sin ORM para las operaciones transaccionales.

**Por qué:** el MVP debe demostrar `WHERE version = ?`, `rowCount`, transacciones, `FOR UPDATE SKIP LOCKED` e idempotencia. SQL explícito permite observar esos mecanismos directamente.

**A considerar:** las migraciones ubicadas en `services/core-service/migrations` son la fuente de verdad de PostgreSQL. Las tablas no deben crearse manualmente desde DBeaver.

## DEC-MVP-02 — Versión de stock en el checkout

**Decisión:** el catálogo devuelve `version` y el checkout recibe `expectedVersion` por cada producto.

**Por qué:** permite detectar que el producto fue modificado desde que el usuario lo agregó al carrito y materializa la concurrencia optimista del TP.

**A considerar:** Camila debe conservar y reenviar la versión. Diego no debe eliminar el campo durante el proxy.

## DEC-MVP-03 — Reserva completa o rollback

**Decisión:** todos los productos del checkout se reservan en una sola transacción. Si falla uno, no se crea el pedido y se revierten todas las reservas.

**Por qué:** evita pedidos parciales. Los productos se procesan ordenados por UUID para reducir bloqueos cruzados.

## DEC-MVP-04 — Estados del pedido

**Decisión:** `PENDING_PAYMENT`, `PAID`, `PAYMENT_FAILED`, `EXPIRED` y `CANCELLED`.

**Por qué:** separa claramente pago rechazado, vencimiento y cancelación. En este MVP solo se implementan transiciones desde `PENDING_PAYMENT` hacia `PAID`, `PAYMENT_FAILED` o `EXPIRED`.

**A considerar:** el frontend debe mostrar los valores que devuelve el Core y no inferirlos localmente.

## DEC-MVP-05 — Conflictos de inventario

**Decisión:** versión obsoleta y falta de stock responden HTTP 409 con códigos distintos: `STOCK_VERSION_CONFLICT` e `INSUFFICIENT_STOCK`.

**Por qué:** ambos impiden completar el checkout por el estado actual del recurso, pero permiten mensajes de interfaz específicos.

## DEC-MVP-06 — Webhook idempotente

**Decisión:** `payments.webhook_inbox.payment_id` es la clave de idempotencia. Repeticiones responden 200 con `already_processed`.

**Por qué:** una pasarela reintenta notificaciones. Responder 200 evita nuevos reintentos sin duplicar pedidos, descuentos ni eventos.

**A considerar:** el simulador debe repetir exactamente el mismo `paymentId` para la demostración de idempotencia.

## DEC-MVP-07 — Pago tardío

**Decisión:** un pago aprobado recibido después del vencimiento no confirma el pedido. La reserva se libera y el pedido pasa a `EXPIRED`.

**Por qué:** ya no puede garantizarse la mercadería. La devolución real queda fuera del MVP porque la pasarela es simulada.

## DEC-MVP-08 — Outbox transaccional

**Decisión:** el evento se inserta en `mq.outbox` dentro de la misma transacción que modifica pedido y stock.

**Por qué:** evita el problema de actualizar la base y perder la notificación por una falla posterior.

**A considerar:** el worker solo simula la notificación mediante logs. Una falla de notificación no revierte una compra confirmada.

## DEC-MVP-09 — TTL configurable

**Decisión:** el vencimiento se configura mediante `RESERVATION_TTL_MINUTES`; la demo utiliza 5 minutos.

**Por qué:** permite demostrar la liberación automática sin esperar las 72 horas conceptuales del requisito original.

## DEC-MVP-10 — Recarga de desarrollo nativa

**Decisión:** usar `node --watch` en lugar de `nodemon`.

**Por qué:** la versión de Node acordada ya incorpora recarga automática y así se elimina una dependencia de desarrollo que presentaba una vulnerabilidad moderada indirecta.

## DEC-MVP-11 — Contratos compartidos versionados

**Decisión:** guardar ejemplos canónicos del Core en `shared/contracts/core` y usar `camelCase` en todos los cuerpos JSON.

**Por qué:** Frontend y Gateway pueden trabajar contra los mismos formatos sin depender de explicaciones informales o capturas de pantalla.

**A considerar:** si cambia un campo, ruta, rol, estado o código de error, debe actualizarse el contrato y avisarse antes de integrar.

## DEC-MVP-12 — Pruebas y demostración reproducibles

**Decisión:** mantener pruebas automáticas contra PostgreSQL y un comando `npm run demo:critical` para los escenarios visibles de la defensa.

**Por qué:** permite repetir concurrencia e idempotencia sin depender de clics manuales o del estado del frontend.

**A considerar:** la demo requiere API y PostgreSQL activos y al menos un producto con stock disponible.
