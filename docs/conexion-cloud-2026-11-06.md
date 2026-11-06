# Conexión local con Atlas y Supabase — 2026-11-06

## Alcance y autorización

Diego pidió cerrar primero la conexión con las bases cloud y confirmó que sus datos son de prueba, autorizando su uso. Se conservan Node/Express, Gateway como entrada, MongoDB exclusivo de Auth y PostgreSQL exclusivo de Core, conforme RES-05 a RES-09 y DEC-MVP-13. No se modifica el contrato de las APIs ni la lógica de pagos o stock.

Los servicios siguen ejecutándose en la PC dentro de Docker. Solo las bases están en cloud: esto no es un despliegue de servicios en Railway/Render ni acredita separación física o disponibilidad de producción.

## Configuración

Archivo independiente docker-compose.cloud-check.yml, proyecto acordes-cloud-check. No mezclar con docker-compose.test.yml. Usa los .env privados existentes de Auth y Core, ignorados por Git, y monta private.pem en lectura solo en Auth. Las imágenes no contienen esos secretos. El Gateway se publica únicamente en 127.0.0.1:4000; Auth y Core no publican puertos.

Auth desactiva autoCreate y autoIndex para evitar creación automática de colecciones/índices. Core usa DATABASE_SSL=true. La red permite salida a Atlas y Supabase. No hay MongoDB/PostgreSQL locales dentro de este proyecto, workers, expirador, migraciones ni seeds. La prueba local acordes-prueba se apagó antes de iniciar esta variante; sus volúmenes se conservaron.

El Frontend existente continúa con VITE_API_URL=http://127.0.0.1:4000 y VITE_DEMO_MODE=false. El origen permitido es http://localhost:3000. Las cuentas locales de Docker no se trasladan a Atlas; crear una cuenta ficticia nueva o usar una cuenta de prueba cloud acordada. Cerrar la sesión anterior y volver a ingresar para evitar mezclar identidades.

## Evidencia obtenida

- Se verificaron los destinos de configuración sin imprimir credenciales: Atlas y Supabase; clave privada presente.
- GET /health del Gateway: HTTP 200.
- Auth GET /health interno: HTTP 200 y dbState CONNECTED con Atlas.
- Core GET /ready interno: HTTP 200, comprobación SELECT 1 en Supabase.
- GET /auth/public-key por Gateway: HTTP 200.
- GET /api/products por Gateway: HTTP 200, 20 productos en la primera página de un total de 33, y X-Trace-Id conservado.
- Edge headless: catálogo del backend visible, registro de una única cuenta ficticia cliente HTTP 201, login real HTTP 200, consulta autenticada de pedidos HTTP 200 con lista vacía para esa cuenta nueva.
- Una lectura directa en Atlas confirmó la persistencia de la cuenta recién creada y su rol cliente, sin consultar/imprimir hashes ni contraseñas.
- No se crearon pedidos ni se enviaron pagos en esta comprobación. No se ejecutaron workers, expiración, migraciones, semillas ni suites de integración contra las bases cloud.

## Cifrado y límite de seguridad existente

Se comprobó DATABASE_SSL=true y stream.encrypted=true en la conexión real del cliente pg al Session Pooler de Supabase. pg_stat_ssl refleja el tramo de PostgreSQL atendido por el pooler y no sirve por sí solo para determinar el cifrado del cliente externo; en esta prueba devolvió false mientras el socket del cliente sí estaba cifrado.

La configuración existente de services/core-service/src/config/database.js usa rejectUnauthorized:false; stream.authorized devolvió false. La conectividad y el cifrado están verificados, pero no debe afirmarse que la identidad del servidor está validada por certificado. Queda como pendiente específico antes de dar el entorno por preparado para producción: revisar CA/configuración recomendada de Supabase y acordar con Paz el cambio, preservando la conexión. No se modificó ese comportamiento durante esta tarea.

## Iniciar y comprobar

Desde la raíz, después de iniciar Docker Desktop y verificar que el entorno de bases locales está detenido:

```powershell
docker compose -f docker-compose.cloud-check.yml config --quiet
docker compose -f docker-compose.cloud-check.yml build auth-service core-service api-gateway
docker compose -f docker-compose.cloud-check.yml up -d
docker compose -f docker-compose.cloud-check.yml ps
curl.exe -i http://127.0.0.1:4000/health
curl.exe -i http://127.0.0.1:4000/auth/public-key
curl.exe -i -H 'X-Trace-Id: cloud-check-lectura' http://127.0.0.1:4000/api/products
```

No ejecutar compose config sin --quiet sobre esta variante si se va a compartir la salida: puede mostrar variables privadas. No pegar salidas de inspección de entorno en el chat ni GitHub.

Si falta iniciar el Frontend, en otra terminal:

```powershell
cd apps/web
$env:VITE_API_URL='http://127.0.0.1:4000'
$env:VITE_DEMO_MODE='false'
npm.cmd run dev -- --host 127.0.0.1 --port 3000 --strictPort
```

Abrir http://localhost:3000. Registro y login usan Atlas. Catálogo y pedidos usan Supabase. El catálogo de 33 productos se recibe paginado: la interfaz actual carga solo la primera página de 20; no confundir eso con datos faltantes en la base.

## Impacto y continuidad

Solo se añadió una cuenta ficticia en Atlas durante esta comprobación; el resto fueron lecturas. Los datos cloud son compartidos con el equipo, aunque Diego confirmó que son de prueba. Las siguientes pruebas de checkout modificarán reservas y pedidos; el pago visual del Frontend sigue sin enviar webhook ni confirmar PAID. La conexión está cerrada como hito; simulador de pago y problemas de roles del Frontend permanecen pendientes, documentados en revision-frontend-2026-11-06.md.

Se deja el Frontend y los tres servicios encendidos para continuar pruebas a pedido de Diego. Para apagar, sin afectar datos cloud:

```powershell
docker compose -f docker-compose.cloud-check.yml down
```

Detener también Vite y cerrar Docker Desktop. Down retira contenedores locales y red; no borra Atlas/Supabase. No se hicieron commits ni push.

Cierre posterior: a pedido de Diego se apagaron Frontend, entrada LAN y contenedores; se retiraron las reglas temporales de firewall. No queda el entorno encendido. Los datos cloud se conservaron. Ver docs/sesion-lan-2026-11-06.md.
