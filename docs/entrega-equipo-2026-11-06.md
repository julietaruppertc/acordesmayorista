# Entrega de integración para el equipo — 2026-11-06

## Punto de partida para personas e IA

Leer esta guía antes de proponer cambios. La referencia de alcance sigue siendo el Plan Integral de Implementación y Trazabilidad y los TP del equipo; este documento registra implementación y evidencia, no agrega requisitos ni acredita cumplimiento total. Consultar también core-service-decisions.md, core-service-integration.md, auth-service-handoff.md y frontend-handoff.md. Si una propuesta contradice esos acuerdos, explicitar la diferencia antes de implementarla.

Base integrada: main hasta 16257e9 (Frontend, imágenes y logo). La rama trabajo/diego conserva esa base e incorpora el parche descrito aquí. No se fusionó depuracion completa: su análisis de IA se evaluó por comportamiento y compatibilidad. No restaurar archivos antiguos sobre la versión actual ni eliminar documentación como parte de una integración automática.

## Cambios de esta entrega

| Cambio | Archivos | Motivo y alcance |
| --- | --- | --- |
| Comprobar liberación de reservas | services/core-service/src/jobs/expireReservations.js | Exige una fila actualizada por producto antes de expirar. Ante inconsistencia lanza RESERVATION_STATE_CONFLICT y revierte la transacción completa, sin confirmar expiración ni evento. Integridad del stock: D-01/RNF-05, DEC-MVP-03. |
| Prueba PostgreSQL de rollback | services/core-service/tests/expirationRollback.integration.test.js | Pedido vencido con dos productos y una reserva inconsistente: comprueba stock/versiones intactos, pedido pendiente y ausencia de evento. |
| Ocultar errores internos de Auth | services/auth-service/src/controllers/authController.js | Las tres operaciones devuelven HTTP 500 con mensaje genérico. Se conservan los mensajes públicos existentes 400/401/409 y el formato que consume Frontend. Confidencialidad: D-02/RNF-04. |
| Regresiones Auth | services/auth-service/tests/authSecurity.test.js | Comprueba mensajes de login/duplicados y que registro, login y aprobación no filtren detalles internos. |
| Contrato de imágenes | shared/contracts/core/product-list.response.json y docs/core-service-integration.md | Documenta imageUrl nullable ya incorporado desde main; no cambia checkout ni stock. |
| Variante de conexión cloud | docker-compose.cloud-check.yml | APIs en Docker local y bases Atlas/Supabase mediante .env privados. Gateway solo en loopback. No es despliegue cloud de las APIs. |

No se adoptaron los cambios de contrato de errores de depuracion, la normalización redundante de email, el req.user sin consumidor, las eliminaciones de documentos ni su lockfile. Razones en recomendaciones-depuracion-2026-11-06.md.

## Evidencia y límites

Código final: 9 pruebas Auth, 10 Gateway y 14 Core aprobadas. Core incluye competencia de diez checkouts por una unidad y el nuevo rollback real; no representa prueba de carga de 250 usuarios. El smoke por Gateway aprobó registro/login RS256, permisos, checkout, HMAC sobre cuerpo exacto, cuatro notificaciones duplicadas y un solo pago/evento Outbox.

Edge visible: catálogo real, protección de checkout sin sesión, login inválido con mensaje humano, registro/login reales, carrito y checkout con expectedVersion. Cero errores JavaScript en ese recorrido; vista móvil sin desborde. No equivale a una auditoría completa de todas las pantallas. Detalle en pruebas-correcciones-2026-11-06.md.

Estas regresiones se ejecutaron con Mongo/PostgreSQL locales aislados. La conectividad anterior con Atlas/Supabase y sus límites se registran por separado en conexion-cloud-2026-11-06.md. Las pruebas locales no validan automáticamente la configuración cloud.

## Repetir las pruebas sin tocar bases compartidas

Requiere Docker Desktop iniciado, Node compatible, dependencias instaladas desde sus lockfiles y el par RSA de desarrollo configurado por cada integrante. private.pem se comparte por un canal privado acordado o se genera un par de desarrollo; nunca se sube a Git. Mantener public.pem correspondiente entre Auth y Gateway. No mezclar los dos Compose.

Desde la raíz, exclusivamente con docker-compose.test.yml:

```powershell
npm.cmd --prefix services/auth-service test
npm.cmd --prefix services/api-gateway test
docker compose -f docker-compose.test.yml build auth-service core-service api-gateway core-tests
docker compose -f docker-compose.test.yml up -d --wait postgres mongo
docker compose -f docker-compose.test.yml run --rm --no-deps core-service npm run migrate
docker compose -f docker-compose.test.yml --profile checks run --rm core-tests
```

Para probar Frontend/smoke en una base local de demostración, cargar seed solo si se acepta modificar esos datos locales, antes de medir cambios de stock:

```powershell
docker compose -f docker-compose.test.yml run --rm --no-deps core-service npm run seed
docker compose -f docker-compose.test.yml up -d auth-service core-service api-gateway
node scripts/docker-smoke.js
```

En otra consola:

```powershell
cd apps/web
$env:VITE_API_URL='http://127.0.0.1:4000'
$env:VITE_DEMO_MODE='false'
npm.cmd run dev -- --host 127.0.0.1 --port 3000 --strictPort
```

Abrir http://localhost:3000 en Edge. Usar datos ficticios. Checkout reserva stock y crea PENDING_PAYMENT; la pantalla de pago actual no confirma el pedido del Core. Comandos de consulta de persistencia en revision-frontend-2026-11-06.md. Al terminar, detener Vite con Ctrl+C y ejecutar desde raíz:

```powershell
docker compose -f docker-compose.test.yml down
```

Conserva los volúmenes. El expirador y el worker no se ejecutan continuamente en este Compose; se prueban de forma puntual. No ejecutar suites, seeds, migraciones ni jobs contra Supabase/Atlas por inferencia de esta guía.

## Pendientes que no deben darse por resueltos

- El pago visual del Frontend no confirma PAID. Diseñar el simulador backend mínimo acordado; nunca enviar el secreto HMAC al navegador.
- Revisar permisos admin/operador, estado mayorista pendiente y gestión mayorista que aún usa mocks, coordinando Frontend/Auth/Core.
- Revisar ajuste de stock físico frente a availableStock y la paginación del catálogo (primera página de 20 sobre 33 en la comprobación cloud).
- Lint Frontend mantiene 12 errores y 3 advertencias preexistentes; build aprobado en la revisión previa, lint no aprobado.
- Supabase: conexión cifrada comprobada, pero rejectUnauthorized:false no valida la identidad del servidor. Resolver configuración CA/TLS antes de afirmar preparación de producción.
- Despliegue de servicios cloud, procesos continuos y evidencia de carga/disponibilidad siguen pendientes.

El diagrama del README describe la arquitectura objetivo; actualmente las APIs se ejecutaron en Docker local. La sesión LAN anterior está cerrada, con reglas temporales retiradas; sus direcciones documentadas no son una invitación a volver a habilitar acceso.

## Seguridad y estado de publicación

No subir .env, claves privadas, dumps, tokens, logs privados ni configuración privada trasladada desde otra PC. docker-compose.cloud-check.yml referencia secretos externos, no los contiene. La clave pública sí forma parte del contrato del Gateway. Evitar compartir la salida completa de compose config en la variante cloud; usar config --quiet.

Los reportes con fecha son históricos: una frase «sin commit/push» describe el momento de esa prueba. Esta entrega reúne los cambios y los publica en main por instrucción de Diego, mediante push normal y conservando su historial. Al terminar las últimas pruebas se apagaron servicios y Docker, sin puertos del proyecto abiertos.
