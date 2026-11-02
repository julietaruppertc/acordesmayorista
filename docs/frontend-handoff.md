# Inicio para Camila — Frontend y Gateway

## Estado y referencias

El backend está validado localmente con Docker y bases de prueba aisladas. No hay URL cloud desplegada. El Frontend no está implementado en esta copia del repositorio. Esta guía no cambia contratos; consultar, en este orden:

1. docs/core-service-decisions.md: decisiones canónicas de rutas, roles, estados y errores del Core.
2. docs/api-gateway-integration.md: rutas públicas/protegidas, JWT y cabeceras.
3. docs/auth-service-handoff.md: registro y login.
4. docs/core-service-integration.md y shared/contracts/core/: ejemplos JSON y reglas de integración.
5. docs/docker-temporary-test.md y docs/gateway-balance-demo.md: entorno validado y demostraciones.

El Plan asigna a Camila el Frontend y a Diego Gateway/DevOps/trazabilidad. No agregar funcionalidades al backend para completar pantallas sin acordarlas con el responsable. No interpretar este documento como aprobación para cambiar el alcance de los TP.

## Preparar el backend local

Requisitos: Docker Desktop con motor Linux operativo, Git y Node >=24 para scripts y Frontend. Obtener shared/keys/private.pem por canal privado con el equipo, nunca mediante GitHub. Debe corresponder a shared/keys/public.pem. No se necesita copiar credenciales de Atlas/Supabase para este entorno.

Desde la raíz del repositorio, en PowerShell:

```powershell
docker compose -f docker-compose.test.yml config --quiet
docker compose -f docker-compose.test.yml build auth-service core-service api-gateway
docker compose -f docker-compose.test.yml up -d --wait postgres mongo
docker compose -f docker-compose.test.yml run --rm --no-deps core-service npm run migrate
docker compose -f docker-compose.test.yml run --rm --no-deps core-service npm run seed
docker compose -f docker-compose.test.yml up -d auth-service core-service api-gateway
curl.exe -i http://127.0.0.1:4000/health
curl.exe -i http://127.0.0.1:4000/auth/public-key
curl.exe -i http://127.0.0.1:4000/api/products
```

El health del Gateway no implica que Auth esté listo; esperar a que responda la clave pública. El Compose principal docker-compose.yml puede usar las bases compartidas: para desarrollar compras utilizar únicamente docker-compose.test.yml.

## Conectar la SPA

- URL base del backend: http://127.0.0.1:4000. Todas las llamadas pasan por Gateway.
- El Compose de prueba permite CORS_ORIGIN=http://localhost:3000. Configurar la SPA en ese origen exacto o acordar un override de CORS con Diego. El puerto habitual de Vite puede ser distinto. localhost y 127.0.0.1 son orígenes distintos para el navegador.
- La SPA puede guardar como variable pública la URL del Gateway. Nunca poner DATABASE_URL, MONGO_URI, claves RSA ni PAYMENT_WEBHOOK_SECRET en variables VITE_* ni en el código cliente.
- POST /auth/register crea siempre cliente; no hay registro público de admin/operador. CUIT implica solicitud mayorista pendiente, no aprobación automática.
- POST /auth/login devuelve token y user. Enviar Authorization: Bearer <token> a rutas protegidas. Conservar el token en memoria o sessionStorage conforme guía de Auth; no imprimirlo en logs.
- Catálogo: GET /api/products devuelve data y pagination. Conservar id y version de cada producto en el carrito.
- Checkout: POST /api/orders/checkout, únicamente cliente, con items de productId, quantity y expectedVersion.
- Guardar data.id del pedido. Consultar GET /api/orders/:id para su estado real; el cliente solo consulta pedidos propios.
- Mostrar 401 como sesión ausente/inválida; 403 como permiso insuficiente; 409 STOCK_VERSION_CONFLICT como disponibilidad modificada; 409 INSUFFICIENT_STOCK como unidades insuficientes. No reintentar automáticamente checkout.
- Estados canónicos: PENDING_PAYMENT, PAID, PAYMENT_FAILED, EXPIRED, CANCELLED. No asumir transiciones no implementadas.
- El balanceo del Core es transparente para el navegador: no seleccionar ni llamar réplicas desde la SPA.

Ejemplo de checkout (sustituir id/version por valores de catálogo):

```json
{
  "items": [
    { "productId": "UUID-del-producto", "quantity": 1, "expectedVersion": 1 }
  ]
}
```

## Pagos simulados y límites pendientes

El webhook requiere firma HMAC del backend. El Frontend no tiene el secreto ni debe firmar solicitudes. Actualmente no existe un endpoint de simulador seguro para sus botones; ese contrato queda por acordar con Paz y Diego. Para validar mientras tanto, scripts/docker-smoke.js prueba el flujo por Gateway y firma desde Node en el entorno aislado. No confundir este script con una función ejecutable desde el navegador.

No se verificó un Frontend real ni reglas de precios/mínimos mayoristas. Revisar alcance y contratos con Paz/Julieta antes de suponer esas funcionalidades. No hacer checkout/webhook ni crear usuarios de prueba en las bases compartidas.

## Verificar y apagar

```powershell
node scripts/docker-smoke.js
docker compose -f docker-compose.test.yml down
docker compose -f docker-compose.test.yml ps -a
```

El script crea un usuario y compra ficticios en bases locales; no imprimir tokens ni valores privados. El listado final debe quedar vacío. Cerrar Docker Desktop si terminó la sesión. Los volúmenes de prueba permanecen; down sin -v no borra datos.

## Evidencia disponible

- Auth: 6 pruebas de seguridad con persistencia simulada.
- Gateway: 10 pruebas de ruteo, JWT, permisos, conservación de bytes y balanceo.
- Core: 13 pruebas en PostgreSQL local aislado.
- Flujo real por Gateway aprobado en Docker: registro/login, checkout, firma HMAC, pago repetido sin duplicados y Outbox con traza.
- Balanceo A/B, caída, recuperación y error 502 con ambas réplicas fuera verificados.

Pendientes: publicación cloud/red privada de despliegue final, integración de la SPA y simulador backend acordado, ejecución continua del worker y RNF de carga/disponibilidad. Esta evidencia no acredita 250 usuarios concurrentes.
