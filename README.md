# Acordes Mayorista — Plataforma de Comercio Electrónico B2B / B2C
---

## 1. Descripción y Objetivos Arquitectónicos

Este repositorio contiene la implementación del Producto Mínimo Viable (MVP) para la plataforma **Acordes Mayorista**. El diseño materializa una arquitectura orientada a servicios (SOA) modular y desacoplada, priorizando la validación rigurosa de atributos de calidad y patrones de resiliencia frente a requerimientos de alta concurrencia transaccional e idempotencia.

### Cumplimiento de Restricciones Formales (TP1 / TP2 / TP3)

* **RES-05:** Microservicio de autenticación implementado en Node.js sobre Express.
* **RES-06:** Persistencia de credenciales, roles y datos fiscales de clientes exclusivamente en base NoSQL (MongoDB Atlas).
* **RES-07:** Desacoplamiento físico y de red entre el servicio de identidad y el servidor de dominio/artículos.
* **RES-08:** Protocolo de comunicación estricto vía HTTP/REST y DTOs JSON (excluyendo SOAP).
* **RES-09:** Gestión de catálogo, inventario, pedidos y eventos en base relacional transaccional (PostgreSQL) con aislamiento de esquemas.

---

## 2. Topología y Decisiones Críticas de Arquitectura (ADRs)

```text
                          [ NUBE PÚBLICA (Internet) ]
                                       │
                         ┌─────────────┴─────────────┐
                         │    Aplicación Web SPA     │ (apps/web)
                         │      (React + Vite)       │ Puerto 3000
                         └─────────────┬─────────────┘
                                       │ HTTPS / REST (Punto único de entrada)
                                       ▼
                         ┌───────────────────────────┐
                         │        API GATEWAY        │ (services/api-gateway)
                         │    (Node.js / Express)    │ Puerto 4000
                         └─────────────┬─────────────┘
                                       │
═══════════════════════════════════════╪══════════════════════════════════════════════
                          [ NUBE PRIVADA / RED INTERNA ]
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            │ (Ruteo /auth/*)                                     │ (Ruteo /api/*)
            ▼                                                     ▼
┌───────────────────────────┐                         ┌───────────────────────────┐
│   Servicio Identidad      │                         │  Servicio Core (Dominio)  │
│   (services/auth-service) │                         │ (services/core-service)   │
│   Puerto 4001             │                         │ Puerto 4002               │
└─────────────┬─────────────┘                         └─────────────┬─────────────┘
              │                                                     │
              ▼                                                     ▼
   [ MongoDB Atlas (M0) ]                                 [ PostgreSQL Cloud ]
     • Colección: users                                     • catalog, inventory
                                                            • orders, payments
                                                            • mq_outbox
                                                                    │
                                                                    ▼
                                                      ┌───────────────────────────┐
                                                      │    Worker Notificaciones  │ (Outbox Processor)
                                                      └───────────────────────────┘
```

* **Autenticación Desacoplada y SSO (DEC-02 / RS256):** El servicio de identidad firma tokens de acceso usando una clave privada RSA de 2048 bits. El API Gateway y el Core validan la firma de forma autónoma con la clave pública sin efectuar llamadas sincrónicas a la base de datos de usuarios.
* **Concurrencia Optimista (DEC-01 / DEC-06):** Prevención de sobreventa en checkout mediante versionado numérico (`WHERE version = ?`) y reserva en dos fases con TTL configurable. Ante colisiones, el sistema responde `409 STOCK_VERSION_CONFLICT` garantizando que el stock físico nunca quede en valores negativos.
* **Webhook de Pagos Idempotente (DEC-05):** Inserción atómica en la tabla `payments.webhook_inbox` sujeta a clave única. Respuestas `200 OK` automáticas ante reintentos para no duplicar pedidos ni cobros.
* **Desacoplamiento de Eventos (DEC-07):** Implementación del patrón *Transactional Outbox*. La emisión de eventos de compra se confirma en la misma transacción relacional de la orden (`mq.outbox`), procesada luego en segundo plano por un worker desacoplado.
* **Propiedad y Aislamiento de Datos (DEC-08):** Una única instancia relacional aislada en esquemas lógicos independientes (`catalog`, `inventory`, `orders`, `payments`, `mq`).

---

## 3. Estructura del Monorepo

```text
acordesmayorista/
├── apps/
│   └── web/                                 # Frontend SPA (React 18 + Vite + Tailwind CSS)
├── docs/
│   ├── auth-service-handoff.md              # Contratos, variables y criptografía de Auth
│   ├── core-service-decisions.md            # Registro formal de decisiones técnicas (DEC-MVP-01 a 12)
│   └── core-service-integration.md          # Especificación de integración, variables y puertos del Core
├── scripts/
│   └── mint-dev-token.js                    # Generador offline de tokens JWT (RS256) para desarrollo
├── services/
│   ├── api-gateway/                         # Punto de entrada, ruteo reverso y validación JWT
│   ├── auth-service/                        # Microservicio de identidad, registro y SSO (MongoDB Atlas)
│   └── core-service/                        # Microservicio de dominio: catálogo, stock, pedidos y pagos (PostgreSQL)
├── shared/
│   ├── contracts/
│   │   └── core/                            # DTOs y contratos JSON canónicos para el dominio
│   └── keys/
│       └── public.pem                       # Clave pública RSA distribuida para validación de firma
├── .env.example                             # Plantilla unificada de variables de entorno
└── docker-compose.yml                       # Orquestación de infraestructura y servicios locales
```

---

## 4. Matriz de Servicios y Puertos

| Componente | Directorio | Runtime | Puerto | Base de Datos | Autenticación / Rol |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend SPA** | `apps/web` | React 18 / Vite | `3000` | N/A | Bearer JWT en header `Authorization` |
| **API Gateway** | `services/api-gateway` | Node.js / Express | `4000` | N/A | Validación con `public.pem` |
| **Auth Service** | `services/auth-service` | Node.js / Express | `4001` | MongoDB Atlas | Emisor de JWT (firma con `private.pem`) |
| **Core Service** | `services/core-service` | Node.js / Express | `4002` | PostgreSQL | Headers `X-User-Id` y `X-User-Role` |

---

## 5. Puesta en Marcha en Entorno Local

### Prerrequisitos
* Node.js v18 LTS o superior
* Docker y Docker Compose instalados
* Instancia accesible de MongoDB Atlas y PostgreSQL (local o cloud)

### Paso 1: Configuración de variables de entorno

Copiar las plantillas base en cada microservicio y definir las credenciales correspondientes:

```bash
# Servicio de Autenticación
cp services/auth-service/.env.example services/auth-service/.env

# Servicio Core
cp services/core-service/.env.example services/core-service/.env
```

Asegurar que la clave privada RSA de desarrollo resida en `shared/keys/private.pem` (distribuida por canal seguro, excluida de Git).

### Paso 2: Instalación y ejecución de servicios

```bash
# 1. Dependencias y arranque de Auth Service
cd services/auth-service
npm install
npm run dev

# 2. Migraciones, datos semilla y arranque del Core Service
cd ../core-service
npm install
npm run migrate
npm run seed
npm run dev
```

### Paso 3: Generación de Tokens de Desarrollo (Trabajo Desacoplado)

Para interactuar con endpoints protegidos sin depender del Frontend ni del flujo interactivo de login:

```bash
# Desde la raíz del repositorio
node scripts/mint-dev-token.js cliente
node scripts/mint-dev-token.js operador
node scripts/mint-dev-token.js admin
```

---

## 6. Validación de Escenarios Críticos (Mesa de Examen)

El repositorio incluye suites de automatización y scripts reproducibles para auditar los atributos de calidad evaluados por la cátedra:

### Concurrencia Optimista e Idempotencia
Con el servicio Core y PostgreSQL en ejecución, ejecutar desde `services/core-service`:

```bash
npm run demo:critical
```

**Comportamiento esperado en consola:**
1. **Concurrencia:** 10 checkouts simultáneos compiten por una unidad física (`stock = 1`). Se procesa exitosamente 1 solicitud y se rechazan 9 transacciones con código HTTP `409 STOCK_VERSION_CONFLICT`, preservando el inventario sin balance negativo.
2. **Idempotencia:** Envío de 5 webhooks de pago idénticos con el mismo `paymentId`. El primero impacta el pedido y la reserva; los 4 restantes devuelven `200 OK` (`already_processed`) sin duplicar deducciones de mercadería ni generar eventos redundantes.

### Procesamiento de Notificaciones (Transactional Outbox)
Para iniciar el consumidor en segundo plano que sondea y despacha eventos de compra confirmada:

```bash
npm run worker
```

---

## 7. Documentación Técnica Detallada

Para consultar diagramas, especificaciones DTO, contratos JSON y actas de decisiones, remitirse a la carpeta `docs/`:
* [`docs/auth-service-handoff.md`](docs/auth-service-handoff.md): Especificación técnica del servicio de identidad y emisión de JWT.
* [`docs/core-service-integration.md`](docs/core-service-integration.md): Contratos de checkout, webhook de pagos y propagación de headers.
* [`docs/core-service-decisions.md`](docs/core-service-decisions.md): Decisiones arquitectónicas formales de persistencia, reservas y outbox.
* [`shared/contracts/core/`](shared/contracts/core/): Schemas JSON canónicos de request y response.
