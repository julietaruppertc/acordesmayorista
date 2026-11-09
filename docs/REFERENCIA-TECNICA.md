# Referencia técnica de Acordes Mayorista

Estado consolidado: 9 de noviembre de 2026. Leer junto con [README](../README.md). Este archivo reemplaza guías históricas, propuestas de proveedores y reportes de sesiones. Documenta lo implementado; los TP y el Plan Integral de Implementación y Trazabilidad siguen siendo las fuentes del alcance académico.

Ante diferencias entre alcance, contrato y código, explicitar y acordar la resolución antes de modificar comportamiento. No inferir requisitos por recomendaciones de IA ni restaurar una rama antigua sobre cambios recientes. Los contratos JSON canónicos se conservan en shared/contracts/core.

## 1. Estructura y propiedad

| Directorio | Función |
| --- | --- |
| apps/web | React 18, Vite, Tailwind; vistas, hooks/controladores y servicios HTTP |
| services/api-gateway | Express, JWT RS256, CORS, proxy, traza y pool opcional de réplicas |
| services/auth-service | Express/Mongoose, bcrypt y emisión JWT; Mongo exclusivo de usuarios |
| services/core-service | Express, Zod y SQL explícito mediante pg; PostgreSQL |
| services/core-service/migrations | Fuente versionada del esquema/seguridad de PostgreSQL |
| services/core-service/seeds | Datos de demostración; carga solo con destino y autorización definidos |
| shared/contracts/core | Ejemplos JSON de requests/responses |
| shared/keys/public.pem | Clave pública versionada; privada local ignorada |
| scripts | Tokens dev, smoke aislado y demo de balanceo |

Auth es independiente. Core agrupa módulos de catálogo, inventario, pedidos, pagos y Outbox; no hay un contenedor por cada módulo. PostgreSQL se divide en catalog, inventory, orders, payments y mq: separación lógica, no una instancia física por servicio. Node >=24, Docker Desktop con contenedores Linux y npm. Instalar con lockfiles por subproyecto; no hay package.json raíz que sustituya esa instalación.

## 2. Procesos y entornos

| Proceso | Inicio | Puerto |
| --- | --- | --- |
| Frontend | npm run dev en apps/web | Se fija 3000 en estas instrucciones |
| Gateway | npm start en services/api-gateway | 4000 |
| Auth | npm start en services/auth-service | 4001 |
| Core API | npm start en services/core-service | 4002 |
| Expirador | npm run expire-reservations en Core | No abre HTTP |
| Worker | npm run worker en Core | No abre HTTP |

API, expirador y worker reutilizan imagen y configuración de persistencia del Core, con comandos diferentes. npm start de Core no inicia los otros dos. Docker puede mostrar 4002/tcp en workers por EXPOSE de la imagen; no significa puerto publicado del host.

| Compose | Datos/uso | Red y automatización |
| --- | --- | --- |
| docker-compose.cloud-check.yml | APIs locales con Atlas/Supabase desde .env privados | Worker/expirador automáticos, Gateway solo 127.0.0.1:4000 |
| docker-compose.test.yml | Proyecto acordes-prueba; Mongo/PostgreSQL locales ficticios | Red interna, Gateway loopback; checks para tests, automation para worker/expirador |
| docker-compose.balance.yml | Override exclusivo de test para dos réplicas Core | Pool, salud y logs de selección |
| docker-compose.yml | Variante general con .env privados | Procesos automáticos; publica 4000 en interfaces del host, distinto de cloud-check |

No mezclar cloud-check y test ni iniciar dos Gateways sobre 4000. Comparten tags de imagen pero no redes/bases. Probar solo PostgreSQL/worker aislados no interrumpe la sesión cloud si no se publica otro Gateway.

La SPA tiene publicación en Vercel; no se verificó aquí su variable de backend ni que un push haya terminado de desplegarse. Las pruebas documentadas usan Frontend local. No hay túnel público ni reglas de acceso LAN activas del producto; la publicación de SPA no permite por sí sola alcanzar la PC.

## 3. Preparación, variables y secretos

Instalar dependencias desde lockfiles:

```powershell
npm.cmd --prefix apps/web ci
npm.cmd --prefix services/auth-service ci
npm.cmd --prefix services/api-gateway ci
npm.cmd --prefix services/core-service ci
```

Preparar services/auth-service/.env y services/core-service/.env con las plantillas y valores privados del entorno elegido, sin sobrescribir archivos existentes. Gateway recibe variables de Compose o su propia plantilla al arrancar fuera de Docker. Auth necesita shared/keys/private.pem correspondiente a public.pem; se monta en lectura y no se copia a la imagen. Acordar el par dev con el equipo; no reemplazar la pública versionada sin coordinar a todos los servicios.

| Componente | Variable | Uso/default |
| --- | --- | --- |
| Auth | PORT | 4001 en Compose |
| Auth | MONGO_URI | Conexión privada MongoDB |
| Auth | JWT_EXPIRES_IN | 1h por defecto |
| Gateway | GATEWAY_PORT | 4000 |
| Gateway | AUTH_SERVICE_URL | Destino interno Auth |
| Gateway | CORE_SERVICE_URL | Destino Core único |
| Gateway | CORE_SERVICE_URLS | Lista opcional separada por comas; activa pool y reemplaza destino único |
| Gateway | PUBLIC_KEY_PATH | Archivo de pública RSA |
| Gateway | CORS_ORIGIN | Origen exacto; localhost:3000 en sesión |
| Gateway | CORE_HEALTH_INTERVAL_MS / CORE_HEALTH_TIMEOUT_MS | Sondeos del pool; plantilla 5000/1000 ms |
| Gateway | CORE_BALANCE_LOG | true registra réplica/traza en la demo |
| Core | CORE_PORT | 4002 |
| Core | DATABASE_URL | Conexión privada PostgreSQL |
| Core | DATABASE_SSL | true en Supabase/cloud-check; false en test |
| Core | ENABLE_PAYMENT_SIMULATOR | false por defecto; activado explícitamente en Compose de demo |
| Core | RESERVATION_TTL_MINUTES | 5 desde aceptación de checkout |
| Expirador | RESERVATION_JOB_INTERVAL_SECONDS | 30 |
| Worker | OUTBOX_POLL_INTERVAL_SECONDS | 5 |
| Worker | OUTBOX_MAX_ATTEMPTS | 3 en selección existente; ver límites de rollback |
| Core | PAYMENT_WEBHOOK_SECRET | Privado, mínimo 32 caracteres |
| Servidores | NODE_ENV | development en cloud-check, test en base aislada |
| Frontend | VITE_API_URL | Gateway accesible desde ese navegador |
| Frontend | VITE_DEMO_MODE | false para pruebas reales |

Vite incorpora variables al arrancar/construir. El origen debe coincidir con CORS: abrir localhost:3000 aunque Vite escuche 127.0.0.1. Su puerto por defecto es distinto; estas instrucciones lo fijan.

No subir .env, privada, JWT, dumps, hashes, credenciales o logs privados. Están ignorados también services/auth-service/env y services/core-service/acordes-mayorista-supabase-privado.env. public.pem y plantillas ficticias sí se versionan. Nunca pasar secretos con prefijo VITE_ ni al navegador. Para comprobar Compose cloud usar config --quiet; config/inspect completos pueden mostrar secretos.

## 4. Identidad, Gateway y permisos

Auth firma RS256, hashea con bcrypt y emite issuer acordes-auth-service. Claims: sub (ID Mongo string), email, rol, cuit, estado_mayorista y fechas JWT. Roles exactos: cliente, operador, admin.

Gateway verifica firma, issuer, expiración, sub, rol y estado mayorista. Descarta X-User-Id, X-User-Role y X-User-Wholesale-Status recibidas del cliente e inyecta las verificadas hacia Core. Core confía en esos encabezados únicamente detrás de la red privada y repite autorización por rol/propietario; no valida JWT directamente ni lee la privada. Auth verifica independientemente JWT de admin en sus rutas. Gateway conserva Authorization para Auth administrativo y lo retira hacia Core.

Gateway genera/propaga X-Trace-Id. Un ID recibido válido tiene 1..128 caracteres alfanuméricos, punto, guion o guion bajo; si no, se reemplaza. Se conserva en respuestas, webhook interno, Outbox y notificación. CORS admite el origen configurado y GET/POST/PATCH/DELETE/OPTIONS; no es autenticación ni restricción de red por sí solo.

Pool opcional: DNS/URLs internas, round-robin y sondeo /ready del Core con comprobación PostgreSQL. Excluye caídas, readmite recuperadas y devuelve 502 sin destinos saludables. No reintenta automáticamente solicitudes, incluidos POST. Lista de destinos configurada; no existe registro externo ni escalado automático.

| Método/ruta externa | Permiso | Destino |
| --- | --- | --- |
| GET /health | Público | Gateway |
| GET /auth/public-key | Público | Auth; PEM texto |
| POST /auth/register, /auth/login | Público | Auth |
| GET/POST /auth/users | admin | Auth |
| PATCH/DELETE /auth/users/:id | admin | Auth |
| PATCH /auth/users/:id/approve-wholesale | admin | Auth |
| GET /api/products y /api/products/:id | Público; token enviado se verifica | Core |
| POST /api/orders/checkout | cliente | Core |
| GET /api/orders y /api/orders/:id | Todos los roles; cliente solo propios | Core |
| POST /api/orders/:id/resolve | admin; simulador habilitado | Core |
| PATCH /api/operator/products/:productId/stock | operador/admin | Core |
| POST /api/payments/webhook | Firma HMAC requerida | Core |

Rutas no declaradas no se proxyean. Health/readiness internos no se publican como rutas arbitrarias del Core.

## 5. Auth y clientes

Registro `{email,password,cuit?}`: siempre crea cliente ignorando rol pretendido, con PENDIENTE si hay CUIT o NO_APLICA sin él. Responde 201 `{message,user}`. Login `{email,password}`: 200 `{message,token,user}`. El user contiene id/email/rol/cuit/estado_mayorista y no password. Email tiene lowercase/trim e índice único en Mongoose. No asumir validación fiscal completa ni dígito verificador.

Administración:

- GET /auth/users: 200 `{users:[...]}`, solo clientes, sin password y ordenados por creación; conserva _id y agrega id string. Sin paginación.
- POST /auth/users: email/password/CUIT opcional; 201 `{message,user}`, rol cliente y password hasheada.
- PATCH /auth/users/:id: cambia email y/o CUIT de cliente; mismo CUIT conserva aprobación, uno diferente vuelve PENDIENTE, quitarlo establece NO_APLICA. 200 `{message,user}`.
- DELETE /auth/users/:id: borra solo cliente; 200 `{message}` o 404. No borra pedidos de Core ni revoca tokens.
- PATCH /auth/users/:id/approve-wholesale: `{estado:"APROBADO"}` o `{estado:"RECHAZADO"}`; 200 `{message,user}` sin password. Solo admin.

Admin/operador se crean mediante el procedimiento administrado del equipo en Mongo; el CRUD no crea ni modifica esos roles. UI permite stock a ambos y usuarios/pedidos solo a admin; la restricción visual no reemplaza la del servidor.

Errores Auth conservan `{error:"texto"}`: credenciales inválidas 401, duplicado 409, campos faltantes 400. Middleware usa TOKEN_REQUIRED/INVALID_TOKEN/FORBIDDEN. Fallos internos de registro/login/aprobación/CRUD devuelven texto genérico sin error.message. CRUD valida tipos y ObjectId de edición/borrado; no extrapolar esas validaciones a todas las rutas antiguas.

JWT emitidos conservan claims hasta renovar/expirar. Cambiar CUIT, aprobar o borrar no revoca sesiones. scripts/mint-dev-token.js genera e imprime tokens de desarrollo firmados: no guardar su salida en Git/logs compartidos. Su duración de desarrollo difiere del login de una hora; no representa una cuenta persistida.

## 6. Catálogo e inventario

GET /api/products: page default 1, pageSize default 20/máximo 100, category y search opcionales. Responde `{data:[productos],pagination:{page,pageSize,total,totalPages},traceId}`. Detalle por UUID: `{data:producto,traceId}`.

Producto camelCase: id,name,description,imageUrl,category,price,onHand,reserved,availableStock,version. imageUrl es string o null; /products/... se sirve desde Frontend y null mantiene icono alternativo. Migración 003 debe existir antes del Core que consulta image_url. Precio proviene del servidor, ARS, sin tarifa mayorista diferenciada ni mínimos implementados.

Disponible = físico menos reservado; SQL aplica GREATEST con cero. PATCH de stock recibe `{onHand,expectedVersion}`: físico entero no negativo y versión positiva. Actualiza condicionado por versión y onHand>=reserved. Respuesta `{data:{productId,onHand,reserved,availableStock,version},traceId}`. Panel ajusta desde onHand: 10 físicas/3 reservadas +2 da 12/3/9. Si falta físico válido no se infiere desde disponible.

La UI actualmente consume solo la primera página; paginación del servidor no significa que la pantalla muestre todo. El catálogo puede caer a mocks al fallar la conexión: un catálogo de demostración no acredita persistencia real.

## 7. Checkout y pedidos

POST /api/orders/checkout:

```json
{"items":[{"productId":"UUID","quantity":1,"expectedVersion":3}]}
```

Admite 1..100 líneas, cantidad positiva hasta 1000, sin productId duplicado. Ordena productos por UUID, obtiene precios reales y en una transacción reserva por versión/disponibilidad, crea pedido e items. Una línea fallida revierte todo. No acepta precio/propietario elegidos por el navegador.

Reserva aumenta reserved y version; on_hand todavía no baja. Crea PENDING_PAYMENT con expires_at a cinco minutos de aceptación. Carrito no reserva ni tiene vencimiento del servidor. Conserva version para expectedVersion; un carrito viejo puede fallar al enviarse.

201 `{data:pedido,traceId}` con id,userId,status,total,expiresAt,createdAt; updatedAt e items dependen de consulta. Detalle devuelve líneas productId/productName/unitPrice/quantity; checkout no devuelve todas las líneas. Lista `{data:[pedidos],traceId}` sin paginación. Admin/operador ven todos; cliente solo propios y no puede consultar detalle ajeno.

Nombre, teléfono, dirección y email de contacto del checkout quedan en pendingOrder del navegador, no en columnas del pedido. userId no equivale a una copia del email en PostgreSQL.

| Estado | Etiqueta |
| --- | --- |
| PENDING_PAYMENT | Pendiente de confirmación |
| PAID | Confirmado (pago simulado) |
| PAYMENT_FAILED | Rechazado |
| EXPIRED | Vencido |
| CANCELLED | Previsto, sin transición de cancelación implementada |

Tras checkout exitoso se vacía el carrito enviado y navega a /pago. Usa ID de sessionStorage y consulta cada cinco segundos mientras pendiente; se detiene en terminal. No inventa estados por temporizador local. Falta historial completo del cliente.

## 8. Simulador administrativo y webhook

POST /api/orders/:id/resolve solo admin: `{decision:"APPROVED"}` o `{decision:"REJECTED"}`. ENABLE_PAYMENT_SIMULATOR apagado devuelve 403 PAYMENT_SIMULATOR_DISABLED. UI /admin/pedidos lista, consulta detalle y habilita decisiones pendientes dentro del plazo, actualizando cada cinco segundos.

El simulador obtiene pedido e importe del servidor, genera paymentId estable `admin-simulation-<orderId>` y envía POST HTTP al webhook por loopback fijo del propio Core. Firma el cuerpo exacto y propaga la traza. No admite URL, firma, importe ni paymentId desde el navegador; no duplica SQL de resolución.

POST /api/payments/webhook recibe paymentId string 1..200, orderId UUID, status APPROVED/REJECTED y amount opcional no negativo. X-Webhook-Signature es sha256=<hex> de HMAC-SHA256 sobre bytes exactos con PAYMENT_WEBHOOK_SECRET. Core conserva rawBody/compara en tiempo constante; Gateway reenvía cuerpo/encabezado sin reformatear JSON. Secreto solo backend, nunca VITE_ ni sessionStorage.

La transacción inserta Inbox con clave única payment_id/ON CONFLICT DO NOTHING, bloquea pedido FOR UPDATE y resuelve:

1. ID repetido: 200 ignored/already_processed sin duplicar efectos.
2. Pedido terminal: conserva estado; un ID nuevo puede quedar como notificación ignorada.
3. Pendiente vencido: ambas decisiones liberan y pasan a EXPIRED con ORDER_EXPIRED, aunque el daemon no haya pasado.
4. APPROVED vigente: consolida on_hand/reserved, marca PAID, pago APPROVED y ORDER_PAID.
5. REJECTED vigente: libera reserved, marca PAYMENT_FAILED, pago REJECTED y ORDER_PAYMENT_FAILED.

Liberar/consolidar exige una fila afectada; inconsistencia produce RESERVATION_STATE_CONFLICT y rollback. Resolución y expiración comparten bloqueo de pedido. Evento y cambio de negocio se insertan en la misma transacción.

Webhook devuelve `{data:{status,orderStatus?,reason?},traceId}`; acción admin devuelve `{data:pedido persistido con detalle,traceId}`. Interpretar el estado real ante reintentos/opciones opuestas: no gana el último clic. No hay cobros/reintegros ni cancelación de PAID. El webhook actual no concilia amount con total; el simulador administrativo genera el importe desde el pedido. No presentarlo como integración de cobro lista para producción.

HTTP interno tiene timeout de cinco segundos. Un error de transporte no prueba que la transacción no haya confirmado después: consultar pedido antes de reintentar. Gateway no repite POST automáticamente.

## 9. Expirador y Outbox

Expirador selecciona PENDING_PAYMENT con expires_at<=NOW, ordena por vencimiento y bloquea FOR UPDATE SKIP LOCKED hasta 50 por lote. Libera reservas, aumenta version, marca EXPIRED y encola en una transacción. Fallar una liberación revierte el lote. Revisa al iniciar y 30 segundos después de terminar la revisión anterior, sin superponerse. Backlog puede requerir varios ciclos. Recupera vencidos al reiniciar; cierre espera operación activa y cierra pool.

Worker selecciona PENDING con attempts<OUTBOX_MAX_ATTEMPTS, ordena por creación y bloquea un evento FOR UPDATE SKIP LOCKED. Incrementa intentos, escribe `[NOTIFICACION] <evento> para orden <orderId> | TraceId: <traza>` y marca PROCESSED/processed_at en la transacción. Vacía disponibles al iniciar y sondea cada cinco segundos. No envía correos ni usa broker.

| Entidad | Estados relevantes |
| --- | --- |
| orders.orders | PENDING_PAYMENT / PAID / PAYMENT_FAILED / EXPIRED / CANCELLED |
| payments.payments | APPROVED / REJECTED |
| mq.outbox | PENDING al encolar; PROCESSED al consumir |

Outbox PENDING no implica pedido pendiente. Consumo normal deja attempts=1, processed_at informado y last_error=null. No marcar PROCESSED con SQL ni disparar consumo desde navegador para ocultar ausencia del worker.

Límites existentes: un rollback puede revertir también attempts; no hay garantía de tres fallos persistidos ni transición automática a FAILED implementada. El log ocurre antes de commit y podría repetirse si revierte. No afirmar entrega exactamente una vez a un proveedor externo.

Los Compose contemplan worker/expirador con restart: unless-stopped y sin puertos propios publicados. En test están en perfil automation para no consumir fixtures de suites. En Supabase procesan también eventos/pedidos antiguos elegibles; entender ese efecto antes de iniciar sobre datos compartidos.

## 10. PostgreSQL y seguridad de datos

Tablas: catalog.categories/products, inventory.stock, orders.orders/order_items, payments.webhook_inbox/payments y mq.outbox. IDs del negocio UUID; user_id es identidad externa textual sin FK entre Mongo/PostgreSQL. Borrar una cuenta no elimina el pedido relacional.

Migraciones: 001_initial_schema.sql, 002_database_security.sql y 003_product_images.sql. La segunda habilita RLS y revoca PUBLIC y, si existen, anon/authenticated. No hay políticas para acceso directo del navegador ni Supabase Auth reemplazando al Auth propio. Core usa conexión PostgreSQL privada, no las APIs públicas de tablas.

Los roles SQL restringidos svc_domain/svc_payments de DEC-08 del Plan no están creados por las migraciones. Los esquemas no acreditan aislamiento de credenciales por esos roles: diferencia pendiente de acordar con Paz.

Supabase: DATABASE_SSL=true y cifrado del socket cliente comprobado, pero database.js usa rejectUnauthorized:false y no valida la identidad por certificado. Resolver CA/TLS antes de afirmar preparación de producción. pg_stat_ssl detrás del pooler no describe por sí solo todo el tramo externo.

Migrar/sembrar solo con destino explícito y autorización. Las suites de integración escriben/limpian datos: solo PostgreSQL aislado, nunca Supabase compartida. No cambiar URL privada para hacer pasar una suite.

## 11. Ejecutar con Atlas/Supabase de prueba

Con Docker Desktop iniciado y claves/.env preparados, desde raíz:

```powershell
docker compose -f docker-compose.cloud-check.yml config --quiet
docker compose -f docker-compose.cloud-check.yml build auth-service core-service api-gateway
docker compose -f docker-compose.cloud-check.yml up -d
docker compose -f docker-compose.cloud-check.yml ps
curl.exe http://127.0.0.1:4000/health
curl.exe http://127.0.0.1:4000/api/products
```

Inicia cinco procesos: Gateway, Auth, Core, worker y expirador. Auth desactiva autoCreate/autoIndex en cloud-check. No inicia bases locales ni ejecuta migraciones/seeds. Reconstruir imágenes tras cambios: git pull no actualiza contenedores ya construidos.

Frontend, en otra consola:

```powershell
cd apps/web
$env:VITE_API_URL='http://127.0.0.1:4000'
$env:VITE_DEMO_MODE='false'
npm.cmd run dev -- --host 127.0.0.1 --port 3000 --strictPort
```

Abrir localhost:3000. Usuarios creados en Mongo local no existen automáticamente en Atlas; usar cuenta del entorno correcto. Cerrar sesión al cambiar bases. Cliente/admin simultáneos: perfiles separados.

Apagar con Ctrl+C de Vite y `docker compose -f docker-compose.cloud-check.yml down`. No borra Atlas/Supabase. En test, down sin -v conserva volúmenes; down -v elimina datos y no es un apagado normal. No recrear reglas de firewall de sesiones anteriores ni ampliar interfaces automáticamente.

## 12. Pruebas aisladas reproducibles

Auth/Gateway usan dobles de persistencia/upstreams y claves de pruebas:

```powershell
npm.cmd --prefix services/auth-service test
npm.cmd --prefix services/api-gateway test
npm.cmd --prefix apps/web run build
```

En una copia sin privada, Auth puede registrar su ausencia; los tests de middleware generan claves efímeras. No significa login real validado sin el par correspondiente.

Core en PostgreSQL aislado, sin automation activo durante la suite:

```powershell
docker compose -f docker-compose.test.yml --profile checks build auth-service core-service api-gateway core-tests
docker compose -f docker-compose.test.yml up -d --wait postgres mongo
docker compose -f docker-compose.test.yml run --rm --no-deps core-service npm run migrate
docker compose -f docker-compose.test.yml --profile checks run --rm core-tests
```

Base ficticia acordes_test; Auth aislado usa acordes_auth_test. No usa .env cloud. Las suites limpian fixtures, pero tests de expiración/worker también pueden procesar pedidos/eventos locales de pruebas anteriores. No son lecturas sin impacto.

Smoke real: detener antes cloud-check para liberar 4000. Si se acepta cargar/reponer datos locales de demo, seed antes de medir stock; no intercalarlo durante persistencia:

```powershell
docker compose -f docker-compose.test.yml run --rm --no-deps core-service npm run seed
docker compose -f docker-compose.test.yml up -d auth-service core-service api-gateway
node scripts/docker-smoke.js
```

El script verifica proyecto/red/bases locales y Gateway loopback; prueba registro/login, permisos, checkout, HMAC, cinco notificaciones, un pago/evento y consumo Outbox puntual. No tener worker automático activo: interferiría con sus expectativas. No ejecutar junto a otro recorrido sobre el mismo primer producto disponible.

Automatización manual, después de suites/smoke:

```powershell
docker compose -f docker-compose.test.yml --profile automation up -d outbox-worker reservation-expirer
```

Balanceo: con imágenes construidas y sin otro Gateway activo, `node scripts/docker-balance-demo.js`. Usa test+balance, prepara datos locales, demuestra alternancia/caída/recuperación/502 y smoke; termina retirando contenedores. No habilitar automation ni usar cloud-check para esa demo. Si Docker no está en PATH, scripts admiten DOCKER_BIN con su ejecutable.

`npm run demo:critical` en Core y mint-dev-token son utilidades existentes de desarrollo; requieren API/base/configuración de identidad compatibles. No ejecutarlas contra datos compartidos por inferencia ni reducir controles para hacerlas funcionar.

## 13. Consultas y diagnóstico

Lecturas en Supabase SQL Editor:

```sql
SELECT id, user_id, status, total, expires_at, created_at
FROM orders.orders ORDER BY created_at DESC LIMIT 10;

SELECT p.name, s.on_hand, s.reserved,
       s.on_hand - s.reserved AS available, s.version
FROM catalog.products p
JOIN inventory.stock s ON s.product_id = p.id
ORDER BY p.name;

SELECT order_id, status, amount, external_payment_id
FROM payments.payments ORDER BY created_at DESC LIMIT 10;

SELECT event_type, payload->>'orderId' AS order_id,
       status, attempts, processed_at, last_error, trace_id
FROM mq.outbox ORDER BY created_at DESC LIMIT 10;
```

Mongo: consultar email/rol/cuit/estado_mayorista de cuentas ficticias; no hashes. Refrescar vistas y catálogo al comparar.

```powershell
docker compose -f docker-compose.cloud-check.yml logs --tail 20 outbox-worker
docker compose -f docker-compose.cloud-check.yml logs --tail 20 reservation-expirer
```

Health Gateway no comprueba bases. Auth /health interno informa dbState; Core /ready interno hace SELECT 1. Mostrar mocks no demuestra conexión. No imprimir variables privadas para diagnosticar.

| Síntoma | Comprobar |
| --- | --- |
| Pedido PAID, evento PENDING | Worker, logs/conexión; esperar sondeo y refrescar tabla |
| Pedido pendiente vencido | Expirador, fecha, backlog/reservas inconsistentes; no UPDATE manual |
| 401 | Token/expiración/issuer/clave; renovar sesión del entorno correcto |
| 403 | Rol, propietario o simulador apagado; no cabeceras falsas |
| 409 | Versión/falta de stock/inconsistencia; consultar y refrescar |
| Catálogo falla tras actualizar | Imagen reconstruida, migración 003 y URL de backend |
| UI no refleja datos | API real, estado persistido, origen/Vite; no confiar en sessionStorage viejo |

Core usa `{error,message,details?,traceId}`: 400 VALIDATION_ERROR de Zod; 409 STOCK_VERSION_CONFLICT/INSUFFICIENT_STOCK/STOCK_BELOW_RESERVED/RESERVATION_STATE_CONFLICT; 401 firma webhook; 404 recurso inexistente. Gateway sin upstream responde 502. Errores internos ocultan message al cliente; logs del servidor pueden incluir detalles privados.

## 14. Evidencia y límites

Último lote funcional: 47 tests aprobados (Auth14/Gateway12/Core21). Las seis nuevas pruebas administrativas atraviesan webhook HTTP HMAC y PostgreSQL reales: aprobar/reintentar/decisión opuesta, rechazo, roles/validación, flag apagado, decisiones tardías y carrera con expiración. Se comprobó un evento/pago efectivo y traza hasta Outbox. No se ejecutaron contra Supabase.

Frontend compilado y Edge visible con dos contextos: cliente envía, admin lista/resuelve, cliente observa PAID/PAYMENT_FAILED/EXPIRED, stock/eventos correctos y sin errores JavaScript en ese recorrido. Se comprobó expiresAt a 300 segundos; para probar el daemon se adelantó solo el vencimiento del fixture local y se observó su detección automática. No se presenta como espera cronometrada completa ni auditoría de todas las pantallas.

Worker continuo: evento previo y posterior al arranque procesados automáticamente en PostgreSQL local, con un intento/fecha/traza y sin UPDATE manual. Luego consumió en Supabase los dos ORDER_PAID pendientes del grupo manteniendo pedidos PAID/pagos APPROVED; el conteo de esa comprobación fue siete eventos procesados. Es evidencia de aquella verificación, no un conteo inmutable.

Balanceo: dos réplicas, caída/recuperación, 502 si ambas caen y preservación de cuerpo/firma/traza. Demuestra procesos replicables; no escalado elástico ni disponibilidad formal.

Pendientes: historial cliente; paginación UI; roles SQL restringidos; CA/TLS Supabase; revocación JWT/actualización de claims; validaciones uniformes; lint global y navegadores más amplios. El lint revisado antes del nuevo panel tenía 15 errores/4 advertencias; nuevos archivos pasaron lint, sin afirmar que el global esté limpio.

No hay pasarela/correo reales, tarifas/mínimos mayoristas, broker externo, perfiles completos ni despliegue cloud del backend/aislamiento físico final. No se acreditaron 250 usuarios, p95<=2s ni disponibilidad99,5 %. Diez checkouts validan consistencia, no rendimiento a esa escala. Las simplificaciones del Plan (Core modular, Outbox y TTL demo) se explican junto a estos límites en defensa.

## 15. Mantenimiento y publicación

Conservar contratos camelCase, roles en español y estados del servidor. Cambios de rutas/firmas/campos/reglas deben actualizar esta referencia, ejemplos y consumidores. No duplicar SQL de stock en Frontend ni omitir webhook/deduplicación para simplificar pruebas.

Revisar remotos: una rama vieja puede revertir contratos/documentos sin conflictos Git. Depuracion se evaluó y adoptó selectivamente, no se restauró completa. La consolidación integra también el README remoto nuevo, corrigiendo afirmaciones no respaldadas (tarifas diferenciadas, aprobación por operador y JWT directo en Core).

Documentación vigente: README.md y esta referencia. No recrear reportes por sesión ni guías de proveedores no utilizados; actualizar hechos respaldados aquí. Antes de publicar: diff, secretos y remoto. Push no reconstruye Docker local ni acredita un deploy Vercel terminado.
