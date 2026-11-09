# Acordes Mayorista — Plataforma B2B/B2C

Plataforma de comercio electrónico para venta minorista y mayorista de instrumentos musicales construida con arquitectura orientada a servicios (SOA). El sistema desacopla el frontend web, la autenticación independiente, el API Gateway perimetral y un servicio Core transaccional con persistencia relacional aislada.

---

## 1. Alcance del sistema

### Funcionalidades implementadas

* **Catálogo:** Navegación pública de categorías e instrumentos con imágenes y precios diferenciados en ARS.
* **Autenticación y roles:** Registro de usuarios, inicio de sesión y gestión de roles (`cliente`, `operador`, `admin`).
* **Circuito mayorista:** Solicitud de alta con CUIT, estado `PENDIENTE` y aprobación por parte de un operador.
* **Checkout transaccional:** Reserva atómica de unidades con control de concurrencia optimista (OCC) para evitar sobreventa.
* **Pagos e idempotencia:** Webhook seguro con firma HMAC y deduplicación mediante Inbox Pattern.
* **Eventos desacoplados:** Transactional Outbox para registrar eventos de dominio sin riesgo de doble escritura (*Dual-Write*).
* **Gestión operativa:** Panel para consultar pedidos, actualizar stock físico y auditar solicitudes mayoristas.
* **Validación de concurrencia:** Scripts de estrés para forzar colisiones simultáneas y reintentos de pago.

### Consideraciones del estado actual

* **Simulación de cobro en frontend:** La pantalla de pago actual registra el resultado en el estado del cliente; la confirmación definitiva del backend se procesa mediante el webhook transaccional del Core.
* **Despacho del Outbox:** El worker procesa los eventos pendientes de la tabla de salida y los imprime por consola; está preparado para conectarse a un broker de mensajería (RabbitMQ o Kafka) sin alterar la lógica de negocio.
* **Procesos en segundo plano:** La liberación de reservas vencidas (`expire-reservations`) y el worker de eventos corren como procesos independientes de la API REST.

---

## 2. Restricciones y decisiones de arquitectura

### Restricciones mandatorias del proyecto

* **Auth en Node.js + Express (RES-05):** Servicio de autenticación desarrollado sobre Node.js exponiendo una API REST pura.
* **Persistencia de usuarios en MongoDB (RES-06):** Cuentas, hashes de contraseñas, CUITs y roles viven exclusivamente en MongoDB Atlas.
* **Separación de entornos (RES-07):** Identidad y dominio de negocio corren en servidores y puertos separados (`4001` y `4002`) sin memoria compartida.
* **Comunicación REST y JSON (RES-08):** Contratos HTTP canónicos sin protocolos SOAP ni XML.
* **Base de datos relacional para el negocio (RES-09):** Catálogo, stock, pedidos y pagos residen en PostgreSQL con integridad referencial.

### Patrones implementados

* **Autenticación asimétrica (RS256):** `auth-service` firma los JWTs con su clave privada (`private.pem`). El Gateway y el Core validan criptográficamente el token con la clave pública (`public.pem`), sin necesidad de consultar a MongoDB en cada petición.
* **Fachada perimetral (API Gateway):** Punto único de entrada. Centraliza CORS, valida firmas JWT, inyecta `X-User-Id` / `X-User-Role` y genera el `X-Trace-Id` para trazabilidad distribuida.
* **Control de Concurrencia Optimista (OCC):** El stock maneja una columna `version`. Al reservar, ejecuta `WHERE product_id = $1 AND version = $2`. Si dos compras compiten, la que llega tarde recibe un error `409 Conflict` y la transacción se cancela sin admitir stock negativo.
* **Idempotencia (Inbox Pattern):** `payments.webhook_inbox` almacena cada `payment_id` procesado. Si una pasarela o cliente reintenta un pago ya registrado, el Core responde `200 OK` sin duplicar transacciones ni descontar inventario dos veces.
* **Transactional Outbox:** Pedido, reserva y evento de salida se persisten dentro del mismo bloque ACID en PostgreSQL, asegurando consistencia eventual sin recurrir a transacciones distribuidas pesadas (2PC).
* **Schema-per-Service:** Una única instancia de PostgreSQL particionada lógicamente en esquemas aislados (`catalog`, `inventory`, `orders`, `payments`, `mq`), garantizando propiedad de datos por módulo.

---

## 3. Topología de red

```text
                                Internet / Navegador
                                         │
                                         ▼
                         Aplicación SPA (React + Vite)
                                    Vercel
                                         │
                                         │ HTTPS / REST + JWT
                                         ▼
                          API Gateway (Node.js / Express)
                                    Puerto 4000
                                  │             │
                    /auth/*       │             │ /api/*
                                  ▼             ▼
                           Auth Service     Core Service
                            Puerto 4001     Puerto 4002
                                  │             │
                                  ▼             ▼
                            MongoDB Atlas   PostgreSQL (Supabase)
                            acordes_auth    ├── catalog
                                            ├── inventory (OCC)
                                            ├── orders
                                            ├── payments (Inbox)
                                            └── mq (Outbox)
                                                        │
                                    ┌───────────────────┴───────────────────┐
                                    ▼                                       ▼
                          Expirador de Reservas                      Worker de Outbox

```

---

## 4. Distribución de servicios y datos

| Componente | Directorio | Puerto | Responsabilidad técnica |
| --- | --- | --- | --- |
| **Frontend SPA** | `apps/web` | `5173` | Catálogo interactivo, checkout, carrito y paneles de administración |
| **API Gateway** | `services/api-gateway` | `4000` | Enrutamiento perimetral, validación de firmas JWT, CORS y correlación (`X-Trace-Id`) |
| **Auth Service** | `services/auth-service` | `4001` | Manejo de cuentas, roles, login, hashing bcrypt y emisión de tokens RS256 |
| **Core Service** | `services/core-service` | `4002` | Catálogo de artículos, control de stock OCC, pedidos y recepción de webhooks |
| **Expirador** | `services/core-service/src/jobs/expireReservations.js` | — | Job que audita reservas vencidas y reintegra stock disponible |
| **Outbox Worker** | `services/core-service/src/workers/outboxWorker.js` | — | Consumidor en segundo plano que despacha eventos pendientes |

### Propiedad de datos (Data Ownership)

* **MongoDB Atlas (`auth-service`):** Colección `users`.
* **PostgreSQL en Supabase (`core-service`):**

| Esquema | Tabla | Propósito |
| --- | --- | --- |
| `catalog` | `categories`, `products` | Clasificación, precios mayoristas y catálogo activo |
| `inventory` | `stock` | Unidades disponibles, unidades reservadas y versión de concurrencia |
| `orders` | `orders`, `order_items` | Pedidos, montos totales, timestamps y detalle de productos comprados |
| `payments` | `webhook_inbox`, `payments` | Claves únicas de idempotencia y registro de pagos aprobados/rechazados |
| `mq` | `outbox` | Cola de eventos transaccionales con reintentos y estados de procesamiento |

---

## 5. Estructura del proyecto

```text
acordesmayorista/
├── apps/
│   └── web/                         # Frontend React + Vite + Tailwind CSS
├── scripts/
│   └── mint-dev-token.js            # Script para firmar JWTs de prueba local
├── services/
│   ├── api-gateway/                 # Gateway de enrutamiento y validación
│   ├── auth-service/                # Servicio de autenticación con MongoDB
│   └── core-service/                # Servicio transaccional con PostgreSQL
├── shared/
│   ├── contracts/core/              # Esquemas JSON canónicos de comunicación
│   └── keys/
│       └── public.pem               # Clave pública para validación RSA
├── docker-compose.yml               # Orquestación de servicios en contenedores
├── docker-compose.balance.yml       # Escenario para pruebas de balanceo
├── docker-compose.test.yml          # Entorno aislado para testing
└── package.json

```

---

## 6. Configuración del entorno local

### Archivos de variables de entorno

Crear los archivos `.env` a partir de sus plantillas:

```powershell
Copy-Item services/auth-service/.env.example services/auth-service/.env
Copy-Item services/core-service/.env.example services/core-service/.env
Copy-Item services/api-gateway/.env.example services/api-gateway/.env
Copy-Item apps/web/.env.example apps/web/.env

```

Configurar los parámetros de cada servicio:

* **Frontend (`apps/web/.env`):**
```env
VITE_API_URL=http://localhost:4000

```


* **Auth Service (`services/auth-service/.env`):**
```env
PORT=4001
MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/acordes_auth
JWT_EXPIRES_IN=1h

```


*(La clave privada para firmar tokens debe ubicarse en `shared/keys/private.pem`)*.
* **Core Service (`services/core-service/.env`):**
```env
CORE_PORT=4002
DATABASE_URL=postgresql://<usuario>:<password>@<host>:5432/<db>?sslmode=require
DATABASE_SSL=true
RESERVATION_TTL_MINUTES=5
RESERVATION_JOB_INTERVAL_SECONDS=30
OUTBOX_POLL_INTERVAL_SECONDS=5
OUTBOX_MAX_ATTEMPTS=3
PAYMENT_WEBHOOK_SECRET=clave_secreta_para_firmar_hmac_sha256
TRUST_GATEWAY_HEADERS=true
NODE_ENV=development

```


* **API Gateway (`services/api-gateway/.env`):**
```env
GATEWAY_PORT=4000
AUTH_SERVICE_URL=http://localhost:4001
CORE_SERVICE_URL=http://localhost:4002
CORS_ORIGIN=http://localhost:5173
PUBLIC_KEY_PATH=../../shared/keys/public.pem
NODE_ENV=development

```



---

## 7. Instalación y ejecución local

### Instalación de dependencias

```powershell
Set-Location apps/web; npm ci; Set-Location ../..
Set-Location services/auth-service; npm ci; Set-Location ../..
Set-Location services/core-service; npm ci; Set-Location ../..
Set-Location services/api-gateway; npm ci; Set-Location ../..

```

### Inicialización de bases de datos

Para aplicar las tablas e índices en PostgreSQL:

```powershell
Set-Location services/core-service
npm run migrate
npm run seed
Set-Location ../..

```

### Puesta en marcha de los servicios

Levantar cada componente en una terminal independiente:

```powershell
# Terminal 1: Auth Service (Puerto 4001)
cd services/auth-service; npm run dev

# Terminal 2: Core Service (Puerto 4002)
cd services/core-service; npm run dev

# Terminal 3: Expirador de Reservas
cd services/core-service; npm run expire-reservations

# Terminal 4: Worker de Outbox
cd services/core-service; npm run worker

# Terminal 5: API Gateway (Puerto 4000)
cd services/api-gateway; npm run dev

# Terminal 6: Frontend React (Puerto 5173)
cd apps/web; npm run dev

```

* Interfaz Web: `http://localhost:5173`
* Chequeo de salud del Gateway: `http://localhost:4000/health`

---

## 8. Flujos de ejecución del Core

### 1. Checkout y Reserva Atómica

1. El cliente envía el listado de productos, cantidades y la versión observada de cada uno.
2. El Core abre una transacción relacional en PostgreSQL.
3. Verifica la existencia de stock suficiente y contrasta la versión contra `inventory.stock`.
4. Si la versión coincide, reserva las unidades e incrementa `version = version + 1`. Si la versión cambió, aborta de inmediato con código `409 Conflict`.
5. Inserta la orden en estado `PENDING_PAYMENT`, define el timestamp de expiración e inserta el evento en `mq.outbox`.
6. Confirma la transacción completa de forma atómica.

### 2. Procesamiento de Pagos y Webhook

1. El endpoint recibe el payload del pago firmado con HMAC-SHA256.
2. Valida la firma contra `PAYMENT_WEBHOOK_SECRET`.
3. Registra el `payment_id` en `payments.webhook_inbox`. Si el ID ya existe, finaliza inmediatamente con `200 OK (already_processed)`.
4. Si el pago es aprobado y la orden está vigente: confirma la compra pasando el pedido a `PAID`, descuenta el stock físico definitivo y genera el evento de compra.
5. Si el pago es rechazado o la orden ya venció: cancela la reserva, actualiza el pedido a `PAYMENT_FAILED` o `EXPIRED` y libera las unidades retenidas.

---

## 9. Pruebas y validación

### Ejecución de tests por componente

```powershell
# Frontend (Linters y compilación)
cd apps/web; npm run lint; npm run build

# Auth Service
cd services/auth-service; npm test

# API Gateway
cd services/api-gateway; npm test

# Core Service
cd services/core-service; npm test

```

### Prueba de estrés y concurrencia

Para verificar la robustez transaccional frente a condiciones de carrera:

```powershell
cd services/core-service
npm run demo:critical

```

Este script comprueba automáticamente:

1. **Carrera por stock limitado:** Lanza 10 peticiones simultáneas sobre un artículo con 1 sola unidad disponible. Verifica que se genere exactamente 1 reserva exitosa y 9 respuestas `409 Conflict`, impidiendo inconsistencias de stock.
2. **Deduplicación de pagos:** Envía 5 peticiones idénticas con el mismo `payment_id`. Confirma que el procesamiento ocurra una sola vez y que los reintentos no alteren el inventario.

---

## 10. Emisión de tokens de prueba

Para interactuar directamente con los endpoints protegidos vía Postman o cURL sin pasar por el formulario de login:

```powershell
node scripts/mint-dev-token.js cliente
node scripts/mint-dev-token.js operador
node scripts/mint-dev-token.js admin

```

El script utiliza la clave privada local y devuelve un token RS256 con los claims correspondientes listo para enviar en la cabecera `Authorization: Bearer <token>`.
