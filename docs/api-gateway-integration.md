# API Gateway — Contrato e integración local

El Gateway es el punto de entrada HTTP del backend. Enruta hacia Auth y Core, verifica JWT RS256 en rutas protegidas, aplica permisos, propaga `X-Trace-Id` y elimina las cabeceras de identidad que envíe el cliente. No accede a MongoDB ni PostgreSQL.

## Rutas y permisos

| Método y ruta externa | Destino | Acceso |
| --- | --- | --- |
| `GET /health` | Gateway | Público |
| `GET /auth/public-key` | Auth, misma ruta | Público |
| `POST /auth/register` | Auth, misma ruta | Público; Auth crea solamente `cliente` |
| `POST /auth/login` | Auth, misma ruta | Público |
| `PATCH /auth/users/:id/approve-wholesale` | Auth, misma ruta | JWT con rol `admin`; Auth vuelve a verificar el JWT |
| `GET /api/products` y `GET /api/products/:id` | Core, misma ruta | Público; si se envía token, debe ser válido |
| `POST /api/orders/checkout` | Core, misma ruta | JWT con rol `cliente` |
| `GET /api/orders` y `GET /api/orders/:id` | Core, misma ruta | JWT con rol `cliente`, `operador` o `admin` |
| `PATCH /api/operator/products/:productId/stock` | Core, misma ruta | JWT con rol `operador` o `admin` |
| `POST /api/payments/webhook` | Core, misma ruta | Firma HMAC comprobada por Core |

El Gateway responde `404 NOT_FOUND` para las demás rutas. Reenvía sin cambiar el método, la ruta, la consulta, el cuerpo y el código de respuesta del servicio de destino.

## Seguridad y trazabilidad

- Los JWT se verifican con `shared/keys/public.pem`, algoritmo RS256, emisor `acordes-auth-service`, vencimiento, identificador `sub`, rol válido y estado mayorista válido.
- El Gateway elimina `X-User-Id`, `X-User-Role` y `X-User-Wholesale-Status` recibidos del cliente. En rutas de Core con token válido, los genera a partir de los claims del JWT. La cabecera `Authorization` se conserva únicamente para la ruta administrativa de Auth; el Core recibe las cabeceras de identidad verificadas.
- Se acepta un `X-Trace-Id` de caracteres seguros y hasta 128 caracteres; en otro caso se genera un UUID. El valor llega al servicio de destino y vuelve en la respuesta. El Gateway no registra tokens ni credenciales.
- El webhook se reenvía como flujo de bytes, junto con `X-Webhook-Signature`. El Gateway no conoce `PAYMENT_WEBHOOK_SECRET` ni calcula firmas; Core verifica la HMAC sobre el cuerpo exacto. El frontend no recibe ese secreto.
- El Gateway responde `401 TOKEN_REQUIRED` o `INVALID_TOKEN` ante autenticación fallida, `403 FORBIDDEN` ante rol insuficiente y `502 UPSTREAM_UNAVAILABLE` cuando el destino no responde.
- La red de Docker Compose expone solo el puerto 4000 del Gateway. Auth y Core permanecen en la red interna.

## Variables y ejecución

La plantilla `services/api-gateway/.env.example` describe `GATEWAY_PORT`, `AUTH_SERVICE_URL`, `CORE_SERVICE_URL`, `CORS_ORIGIN` y `PUBLIC_KEY_PATH`. Sus valores por defecto permiten ejecutar los tres servicios localmente en los puertos 4000, 4001 y 4002. Los archivos `.env` reales de Auth y Core están ignorados por Git; nunca deben incorporarse al repositorio.

En tres terminales, después de instalar dependencias con `npm ci` en cada servicio:

```text
cd services/auth-service && npm start
cd services/core-service && npm start
cd services/api-gateway && npm start
```

Comprobaciones de lectura desde otra terminal:

```text
curl.exe http://localhost:4000/health
curl.exe http://localhost:4000/auth/public-key
curl.exe http://localhost:4000/api/products
```

`GET /api/products` necesita que Core pueda consultar su PostgreSQL y que el esquema esté preparado. `GET /health` del Gateway no depende de las bases. Para Docker, `docker compose up --build` construye los tres servicios; la clave privada se monta como archivo de solo lectura en Auth y no se copia dentro de la imagen. Compose no ejecuta migraciones ni carga datos semilla.

## Pruebas

Desde `services/api-gateway`, ejecutar `npm test`. Los servidores de Auth y Core se simulan en puertos locales; las pruebas cubren ruteo, rutas públicas, roles, cabeceras de identidad falsas, traza, cuerpo de checkout, código de conflicto y webhook sin transformación. No requieren MongoDB ni PostgreSQL.

Las pruebas de concurrencia, idempotencia y Outbox del Core sí insertan y borran datos. Deben ejecutarse únicamente en una base de desarrollo aislada, nunca sobre la base compartida de Supabase.

## Punto de control local — 2026-11-01

- `npm test` en Auth: 6 pruebas aprobadas.
- `npm test` en Gateway: 6 pruebas aprobadas con servidores simulados.
- Prueba `tests/health.test.js` del Core: 2 pruebas aprobadas.
- Con los tres servicios reales iniciados, `GET /health` del Gateway respondió 200, `GET /health` de Auth informó MongoDB `CONNECTED` y `GET /ready` del Core respondió 200 usando Supabase.
- A través del Gateway respondieron 200 `GET /auth/public-key`, `GET /api/products` y `GET /api/orders` con un token de desarrollo de cliente. El `X-Trace-Id` enviado a pedidos volvió sin cambios.

Estas comprobaciones fueron de solo lectura. No se ejecutaron migraciones, semillas, checkout, webhooks ni pruebas de integración que escriban en las bases compartidas. Los tres procesos se detuvieron al terminar. En este equipo, Node intentó resolver el registro SRV de MongoDB mediante un DNS local que rechazó la consulta; para la comprobación de Auth se utilizó temporalmente un servidor DNS alternativo solo en ese proceso, sin modificar código ni `.env`.

La configuración de Docker Compose está preparada, pero no se ejecutó porque Docker no está disponible en este equipo. La validación de concurrencia, idempotencia y Outbox queda pendiente de una base PostgreSQL aislada para pruebas.

## DEC-09 — Balanceo opcional del Core

CORE_SERVICE_URLS habilita round-robin entre URLs internas de Core separadas por comas. Sin esa variable se conserva CORE_SERVICE_URL. La salud se sondea por /ready (incluye comprobación de PostgreSQL), con intervalo/timeout configurables; una réplica se excluye si falla y se readmite al recuperarse. Si no hay destinos, HTTP 502 UPSTREAM_UNAVAILABLE. No se reintentan automáticamente solicitudes de ningún método. JWT, permisos, traza y bytes del webhook conservan su comportamiento. Ver docs/gateway-balance-demo.md para decisiones, variables, límites y evidencia local; no representa validación de 250 usuarios ni despliegue cloud.
