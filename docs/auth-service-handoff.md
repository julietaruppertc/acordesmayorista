# Integración y Especificación del Servicio Auth

Gestiona el registro de usuarios, autenticación y emisión federada de identidades (SSO) mediante Access Tokens JWT firmados asimétricamente con RSA (RS256). Persiste exclusivamente en MongoDB Atlas. No administra artículos, inventario ni pedidos, y permanece desacoplado de la base relacional PostgreSQL.

## Servicio y variables

- Carpeta: `services/auth-service`
- Puerto: `4001`
- Health: `GET /health`
- Certificado SPKI: `GET /auth/public-key`
- Inicio API: `npm start`
- Desarrollo local: `npm run dev`
- Generador de tokens de prueba: `node scripts/mint-dev-token.js <rol>`

Variables obligatorias en entorno (`.env`):

```env
PORT=4001
MONGO_URI=mongodb+srv://<usuario>:<password>@cluster0.pzx2vs7.mongodb.net/acordes_auth?retryWrites=true&w=majority
JWT_EXPIRES_IN=1h
NODE_ENV=production
```

*(El cluster Atlas cuenta con regla de red `0.0.0.0/0` habilitada para admitir resolución desde entornos cloud y desarrollo local).*

## Criptografía asimétrica y pares de claves (RS256)

La arquitectura no comparte secretos simétricos entre servicios ni realiza consultas sincrónicas de validación hacia MongoDB:

- **Clave Privada (`shared/keys/private.pem`):** Permanece excluida del repositorio (`.gitignore`). Utilizada exclusivamente por `auth-service` para firmar tokens y por `scripts/mint-dev-token.js`.
- **Clave Pública (`shared/keys/public.pem`):** Versionada en el repositorio y accesible vía HTTP en `GET /auth/public-key`. Utilizada por el API Gateway y el Servicio Core para verificar la autenticidad del emisor.

## Contrato del Access Token JWT

### Payload estructurado

```json
{
  "sub": "6ae64618ac9dd2f5bd66ef1d",
  "email": "mayorista@acordes.com",
  "rol": "cliente",
  "cuit": "20381234564",
  "estado_mayorista": "APROBADO",
  "iat": 1793476133,
  "exp": 1793479733,
  "iss": "acordes-auth-service"
}
```

### Claims admitidos

| Claim | Tipo | Descripción y dominio de valores |
| :--- | :--- | :--- |
| `sub` | `string` | ObjectId canónico del usuario en MongoDB (`_id`). |
| `email` | `string` | Correo electrónico normalizado en minúsculas. |
| `rol` | `string` | `cliente` \| `operador` \| `admin`. |
| `cuit` | `string \| null` | CUIT tributario si solicitó cuenta comercial; `null` si es consumidor final. |
| `estado_mayorista` | `string` | `NO_APLICA` \| `PENDIENTE` \| `APROBADO` \| `RECHAZADO`. |
| `iss` | `string` | Emisor estático (`acordes-auth-service`). |

## Rutas de la API

| Método | Ruta | Uso | Restricción / Rol |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Chequeo de proceso y estado del pool de Mongo | Pública |
| `GET` | `/auth/public-key` | Obtención de certificado RSA público | Pública |
| `POST` | `/auth/register` | Alta de clientes particulares o mayoristas | Pública |
| `POST` | `/auth/login` | Validación de credenciales y emisión JWT | Pública |
| `PATCH` | `/auth/users/:id/approve-wholesale` | Aprobación o rechazo comercial de cuenta | Requiere `admin` |

### Contrato de registro (`POST /auth/register`)

```json
{
  "email": "mayorista@acordes.com",
  "password": "Password123!",
  "cuit": "20381234564"
}
```

*Nota: El registro público siempre crea usuarios con `rol: "cliente"`, incluso si el solicitante envía otro rol. La presencia de `cuit` asigna automáticamente `estado_mayorista: "PENDIENTE"`. En su ausencia, el estado asignado es `"NO_APLICA"`. Las cuentas `admin` y `operador` se crean mediante el procedimiento administrado por el equipo en MongoDB.*

### Contrato de login (`POST /auth/login`)

```json
{
  "email": "mayorista@acordes.com",
  "password": "Password123!"
}
```

Respuesta exitosa (`200 OK`):

```json
{
  "message": "Autenticación exitosa",
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6ae64618ac9dd2f5bd66ef1d",
    "email": "mayorista@acordes.com",
    "rol": "cliente",
    "estado_mayorista": "PENDIENTE"
  }
}
```

### Contrato de aprobación (`PATCH /auth/users/:id/approve-wholesale`)

```json
{
  "estado": "APROBADO"
}
```

Valores válidos para `estado`: `"APROBADO"` o `"RECHAZADO"`.

Auth exige `Authorization: Bearer <token>` en esta ruta. Verifica la firma RS256, el emisor `acordes-auth-service`, la vigencia y el rol `admin` sin confiar en `X-User-Role`. Responde `401` si falta el token o es inválido, y `403` si el usuario autenticado no es administrador.

## Para Gateway y despliegue

1. **Ruteo inverso:** Desviar todo prefijo `/auth/*` hacia `http://auth-service:4001/auth/*`.
2. **Validación de firma:** Cargar `shared/keys/public.pem` (o consumir `/auth/public-key`) y rechazar peticiones con tokens inválidos o vencidos con `401 Unauthorized`.
3. **Propagación hacia el Core:** En peticiones dirigidas a `/api/*`, inyectar los encabezados extraídos del payload decodificado:

```text
X-User-Id: claim sub
X-User-Role: claim rol
X-User-Wholesale-Status: claim estado_mayorista
X-Trace-Id: identificador generado o propagado
```

4. **Aprobación mayorista:** En `PATCH /auth/users/:id/approve-wholesale`, conservar `Authorization: Bearer <token>` al reenviar la petición. Auth verifica el token de forma independiente.

## Para Servicio Core

1. **Aislamiento de persistencia:** El Core no interactúa con MongoDB ni ejecuta validaciones criptográficas de clave privada.
2. **Identificación de pedidos:** Asociar el cliente en `orders.orders.user_id` utilizando el identificador recibido en `X-User-Id`.
3. **Diferenciación tarifaria:** Validar `X-User-Wholesale-Status === 'APROBADO'` para aplicar listas de precios mayoristas.

## Para Frontend

1. **Almacenamiento de credencial:** Conservar el string `token` devuelto por el login en memoria o `sessionStorage`.
2. **Cabecera obligatoria:** Adjuntar en cada petición hacia el Gateway:

```text
Authorization: Bearer <token>
```

3. **Modo desacoplado de desarrollo:** Utilizar el script generador para obtener tokens válidos sin iniciar la API de autenticación:

```bash
node scripts/mint-dev-token.js cliente
node scripts/mint-dev-token.js operador
node scripts/mint-dev-token.js admin
```

## Respuestas de error

```json
{
  "error": "El email ya se encuentra registrado"
}
```

| HTTP | Causa |
| :--- | :--- |
| `400` | Campos obligatorios ausentes o formato de ObjectId inválido |
| `401` | Credenciales incorrectas o usuario inexistente |
| `401` | Falta el token (`TOKEN_REQUIRED`) o el token de aprobación es inválido (`INVALID_TOKEN`) |
| `403` | El token de aprobación es válido, pero el rol no es `admin` (`FORBIDDEN`) |
| `404` | Usuario no encontrado al intentar actualizar estado mayorista |
| `409` | Conflicto por email duplicado en base de datos |
| `500` | Falla interna de conexión con el cluster MongoDB Atlas |

## Pruebas locales

Desde `services/auth-service`, ejecutar `npm test`. Las pruebas de seguridad usan un par RSA generado durante la ejecución y simulan la persistencia de usuarios; no necesitan conexión a MongoDB ni la clave privada de desarrollo.

## Límites conocidos del MVP

- No se implementa lista negra ni revocación centralizada en tiempo real; la invalidación de credenciales se apoya en el tiempo de expiración corto (`JWT_EXPIRES_IN=1h`).
- El par de claves se almacena en el sistema de archivos local y variables de entorno, prescindiendo de servicios dedicados de Key Vault o KMS externos.
