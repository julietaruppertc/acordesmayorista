# Paso 0 — Seguridad del servicio Auth

Fecha de revisión: 2026-11-01.

## Decisión acordada

El registro público crea solamente usuarios con rol `cliente`. Las cuentas `admin` y `operador` se crean directamente en MongoDB mediante el procedimiento administrado por el equipo; este cambio no crea ni modifica esas cuentas.

La aprobación o rechazo de mayoristas exige un JWT de Auth válido con rol `admin`. Auth verifica el token por sí mismo y no toma decisiones de autorización basadas en `X-User-Role`. El Gateway también deberá exigir el rol correspondiente y conservar el encabezado `Authorization` al enviar esta ruta a Auth.

## Cambios realizados

| Archivo | Cambio |
| --- | --- |
| `services/auth-service/src/controllers/authController.js` | El registro ignora el rol enviado por el cliente y guarda siempre `cliente`. Se conservan la validación de email y contraseña, el hash de la contraseña, el control de duplicados y el estado mayorista según CUIT. |
| `services/auth-service/src/middleware/requireAdmin.js` | Verifica un Bearer JWT con RS256, clave pública, emisor `acordes-auth-service` y vencimiento. Exige `sub` y rol `admin`. Responde `401` ante token ausente o inválido y `403` ante otro rol. |
| `services/auth-service/src/routes/authRoutes.js` | Aplica `requireAdmin` únicamente a `PATCH /auth/users/:id/approve-wholesale`. |
| `scripts/mint-dev-token.js` | Agrega el emisor `iss: acordes-auth-service` a los tokens de desarrollo para que cumplan el contrato. |
| `services/auth-service/package.json` | Agrega el comando `npm test`. |
| `services/auth-service/tests/authSecurity.test.js` | Cubre registro con roles enviados por el cliente, conservación del estado mayorista y del rechazo de duplicados, cabecera de rol falsificada, token de cliente, token de administrador, emisor incorrecto y vencimiento. |
| `docs/auth-service-handoff.md` | Actualiza el contrato de registro y aprobación, los códigos de error, la integración con Gateway y el comando de prueba. |

## Validación realizada

- `npm test` en `services/auth-service`: 6 pruebas aprobadas, 0 fallidas.
- `node --check` en los archivos JavaScript modificados: sin errores de sintaxis.
- Token de desarrollo `admin`: verificado localmente con la clave pública y el emisor esperado, sin imprimir el token.
- `git diff --check`: sin errores.

Las pruebas de Auth simulan MongoDB; no se ejecutaron operaciones contra la base de datos ni pruebas de integración con el Gateway. No se creó ninguna cuenta administrativa. Las dependencias instaladas para probar quedaron en `node_modules`, que está ignorado por Git.

## Pendiente de integración

1. El Gateway debe validar JWT y permisos en el borde, y reenviar `Authorization` a la ruta administrativa de Auth.
2. Verificar el flujo completo con servicios locales cuando esté disponible el Gateway.
3. Confirmar con el equipo quién administra la creación directa de cuentas `admin` y `operador` en MongoDB.

Los archivos locales de credenciales y claves privadas no forman parte de este cambio y no deben incluirse en commits.
