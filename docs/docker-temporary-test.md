# Prueba temporal con Docker

Estado: construcción y prueba temporal completadas después del reinicio de Windows. Docker Desktop y WSL instalados. Ver resultados al final de esta guía.

Alcance de Diego: Docker/Compose, aislamiento, ruteo e integración conforme Plan. Esta variante no reemplaza docker-compose.yml ni cambia contratos. No acredita despliegue cloud ni balanceo.

## Aislamiento

Usar siempre el archivo explícito docker-compose.test.yml, sin combinarlo con el Compose principal. Las variables son exclusivas de prueba: no se cargan los .env compartidos. MongoDB y PostgreSQL son contenedores locales sin puertos publicados. Auth, Core y las bases están solo en la red test-backend internal, sin salida externa. Gateway se conecta además a test-entry para que funcione la publicación local del puerto; esta red sí permite salida, pero Gateway no recibe credenciales de las bases ni destinos externos. Gateway se publica solo en 127.0.0.1:4000. La clave privada de desarrollo se monta solo en Auth y en lectura; no se copia a imágenes. Los datos ficticios persisten en volúmenes exclusivos del proyecto acordes-prueba al apagar.

## Ejecutar y detener

Desde la raíz del repositorio, con Docker Desktop y motor Linux disponibles:

```powershell
docker version
docker compose -f docker-compose.test.yml config --quiet
docker compose -f docker-compose.test.yml up -d --wait postgres mongo
docker compose -f docker-compose.test.yml run --rm --no-deps core-service npm run migrate
docker compose -f docker-compose.test.yml run --rm --no-deps core-service npm run seed
docker compose -f docker-compose.test.yml up -d --build auth-service core-service api-gateway
curl.exe -i http://127.0.0.1:4000/health
curl.exe -i http://127.0.0.1:4000/auth/public-key
curl.exe -i -H 'X-Trace-Id: diego-docker-001' http://127.0.0.1:4000/api/products
```

Esperar a que Auth termine la conexión antes de consultar su clave. Migraciones y semillas anteriores se ejecutan únicamente en el PostgreSQL local declarado en esta variante.

Para pruebas completas del Core, el servicio core-tests instala dependencias de desarrollo y monta los tests de solo lectura. No ejecutar en paralelo con worker ni expiración:

```powershell
docker compose -f docker-compose.test.yml --profile checks run --rm --build core-tests
```

Al terminar, incluso si falla una comprobación:

```powershell
docker compose -f docker-compose.test.yml --profile checks down
docker compose -f docker-compose.test.yml --profile checks ps -a
Get-NetTCPConnection -State Listen -LocalPort 4000 -ErrorAction SilentlyContinue
```

El listado de contenedores debe quedar vacío. Comprobar cualquier listener restante antes de atribuirlo a esta prueba. No usar down -v: borraría los volúmenes de prueba; apagarlos no requiere borrarlos. Cerrar Docker Desktop después si no se necesita. No modificar el firewall para aceptar redes públicas.

## Límites

Construcción y prueba real completadas; esto no equivale a desplegar en cloud. Las pruebas de Core operan directamente contra Core; la demo de integración por Gateway se verifica aparte. Ninguna comprobación local acredita RNF de carga, disponibilidad o RES-07 en cloud. No se hacen commits ni push en este lote sin pedido específico.

Actualización de requisitos: instalación oficial de WSL 2.7.14 completada mediante UAC (código 0). El comando elevado wsl --install --no-distribution terminó con código 0 para habilitar el soporte requerido. El intento de iniciar Docker Desktop no permitió obtener un motor operativo; se solicitó detener Desktop. No se iniciaron contenedores del proyecto. Se requiere reinicio manual de Windows y nueva comprobación del motor antes de ejecutar la prueba; no se reinició el equipo automáticamente.

## Resultado de la prueba temporal

- Docker Engine 29.9.2 operativo después del reinicio. No hizo falta iniciar sesión en Docker Desktop.
- Construidas imágenes de Auth, Core, Gateway y core-tests con los lockfiles existentes.
- PostgreSQL y MongoDB locales saludables; migraciones y semillas ejecutadas solo en acordes_test.
- Suite completa del Core: 4 archivos, 13 pruebas aprobadas. Incluye salud, RLS y permisos SQL, concurrencia de 10 checkouts por una unidad, idempotencia, pago rechazado/tardío, expiración, permisos, firma requerida, rollback y procesamiento Outbox.
- Integración real por Gateway: registro público ignora rol admin; login entrega JWT RS256 válido; identidad falsificada y token inválido reciben 401; cliente no ajusta stock (403); catálogo, reserva, pago firmado y consulta PAID funcionan.
- Cinco notificaciones con el mismo paymentId: primera procesada, cuatro already_processed; SQL confirma exactamente un pago y un evento ORDER_PAID. Worker procesó el evento con el mismo trace id.
- Trace de evidencia: docker-smoke-97914ac5-7048-4a15-a449-56afcd1804e2. No se imprimieron tokens, claves privadas ni credenciales reales.
- Se retiraron los cinco contenedores y las dos redes con down (sin -v); los datos ficticios e imágenes permanecen locales y no se ejecutan por sí mismos.
- No se accedió a Atlas ni Supabase durante esta prueba. No se modificó código funcional de los servicios ni contratos. No se acredita aún cloud, balanceo, Frontend o RNF de carga/disponibilidad.

La primera ejecución del chequeo HTTP detectó que una única red internal no publicaba el puerto hacia Windows. Se resolvió agregando test-entry solo al Gateway. El aislamiento del resto se conserva. Se volvió a ejecutar la integración y pasó.

### Repetir la integración completa

Después de iniciar y preparar el entorno siguiendo los comandos anteriores, desde la raíz:

```powershell
node scripts/docker-smoke.js
```

Si docker no aparece en PATH en la terminal actual:

```powershell
$env:DOCKER_BIN = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe'
node scripts/docker-smoke.js
```

El script verifica el proyecto, puerto publicado y conexiones locales antes de escribir. Genera un usuario y una compra ficticios nuevos en cada ejecución y descuenta una unidad de un producto de demostración. El secreto local se usa únicamente en la comprobación backend, nunca en Frontend. No ejecutar contra otro entorno. Al terminar, apagar siempre Compose como se indica arriba y cerrar Docker Desktop.

## Variante de balanceo
La prueba opcional de DEC-09 usa dos Core; ver docs/gateway-balance-demo.md para comandos, aislamiento y resultados. La variante base sigue con un Core salvo que se active el perfil balance y su override.
