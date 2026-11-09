# Integración de main y correcciones — 2026-11-09

## Alcance aplicado

Diego autorizó incorporar main y corregir los hallazgos de la revisión. Se actualizó trabajo/diego desde 7981a90 a 572dcab por fast-forward, sin conflictos ni archivos locales sobrescritos. Incluye gestión de usuarios conectada a Auth, permisos admin/operador del Frontend, CUIT en login/registro, carrito persistente y rutas SPA para Vercel. Depuracion completa sigue sin fusionarse.

La arquitectura permanece Frontend → Gateway → Auth/Mongo o Core/PostgreSQL. No se agregaron servicios, dependencias ni migraciones. Referencias: integridad transaccional y control optimista de stock (D-01/RNF-05, DEC-MVP-03); confidencialidad y permisos (D-02/RNF-04). Estos cambios corrigen la implementación; no amplían por sí solos lo exigido por los TP.

## Correcciones

- Los cuatro endpoints administrativos nuevos devuelven un error interno genérico sin error.message. Validan tipos de email/password/CUIT y los identificadores de edición/borrado, devolviendo 400 antes de consultar Mongo cuando corresponde.
- Cambiar un CUIT por otro vuelve estado_mayorista a PENDIENTE. El mismo CUIT conserva el estado; quitarlo establece NO_APLICA. El mock aplica la misma regla de cambio.
- El catálogo agrega onHand y reserved tanto en lista como en detalle, conservando availableStock y version. El panel ajusta onHand, no availableStock. Si el backend no informa stock físico válido, no se intenta inferirlo. El PATCH conserva expectedVersion y el Core mantiene la protección de reservas.
- El ejemplo JSON y los contratos documentados se actualizan junto con las pruebas.

## Evidencia ejecutada

| Comprobación | Resultado |
| --- | --- |
| Auth | 14 pruebas aprobadas; incluye las cinco nuevas de administración |
| Gateway | 11 pruebas aprobadas; CRUD exige admin, rechaza cliente/operador y conserva Authorization hacia Auth |
| Core/PostgreSQL local | 15 pruebas aprobadas; incluye ajuste físico con reservas y rechazo 409 de versión vieja |
| Compilación Frontend | Aprobada |
| Edge visible | Login admin, listado real, creación de cliente desde la pantalla y ajuste de stock desde el botón aprobados; cero errores JavaScript en ese recorrido |
| Persistencia Mongo local | Cambiar CUIT de un cliente aprobado persistió PENDIENTE |
| Persistencia PostgreSQL local | 10 físicas / 3 reservadas + 2 físicas dejó 12 físicas / 3 reservadas / 9 disponibles |
| Permisos contra APIs reales | Cliente rechazado 403 en las cuatro rutas CRUD administrativas |

Se usó exclusivamente docker-compose.test.yml (acordes-prueba) con MongoDB/PostgreSQL locales. No se usaron Atlas/Supabase, no se habilitó LAN y las cuentas/producto/pedido ficticios del recorrido Edge se limpiaron al finalizar. Las suites reutilizaron volúmenes locales y procesaron también eventos/pedidos locales vencidos de pruebas anteriores. No es evidencia de 250 usuarios ni una prueba cloud.

Capturas de Edge y script transitorio, sin secretos persistidos, en TEMP/acordes-integracion-2026-11-09. No se copiaron .env ni private.pem al worktree de revisión. La copia separada revision-main-2026-11-09 conserva main remoto sin las correcciones para comparación.

## Contratos y pruebas repetibles

Consultar auth-service-handoff.md y core-service-integration.md. Pruebas Auth/Gateway mediante npm test en cada servicio; Core mediante el perfil checks de docker-compose.test.yml, después de construir core-tests y preparar exclusivamente PostgreSQL local. Las instrucciones completas están en entrega-equipo-2026-11-06.md. Reconstruir imágenes de Auth/Core/Gateway al cambiar fuentes: los contenedores no toman código nuevo solo con git pull.

## Pendientes conservados

- Lint del Frontend remoto revisado: 15 errores y 4 advertencias; no se corrigieron en este lote. Compilar no equivale a aprobar lint.
- Pago visual del Frontend sigue sin confirmar PAID; simulador backend, configuración TLS de Supabase, cloud y carga/disponibilidad continúan pendientes.
- JWT ya emitidos conservan claims hasta renovar sesión o expirar; cambiar CUIT/aprobar/borrar una cuenta no revoca tokens emitidos. Volver a iniciar sesión para recibir los datos actuales. No se agregó revocación ni sincronización de sesión en este lote.
- CRUD administrativo nuevo de main permite únicamente gestionar clientes; no crea ni edita roles admin/operador. Se preservó ese alcance; validar con el equipo su correspondencia con la entrega evaluada.
- Listado de usuarios sin paginación y catálogo de Frontend limitado a primera página siguen como límites del MVP.

Diego autorizó publicar las correcciones de este lote en main el 2026-11-09. Se conserva el historial mediante push normal, sin forzar.

## Regresión del flujo completo y cierre
Smoke de APIs reales locales aprobado: registro/login, autorización, checkout, firma HMAC, un pago y un evento frente a cinco notificaciones, Outbox con traza docker-smoke-e2443628-8be0-4092-a585-cd7c978e6e75. Se apagó el entorno de pruebas conservando los volúmenes locales; no se habilitó acceso LAN.

## Vercel comprobado antes de publicar
La API pública de GitHub informó homepage https://acordesmayorista-japp.vercel.app y estado Vercel success para 572dcab, con enlace a su despliegue. Esto confirma evidencia de publicación del Frontend; no acredita que las APIs estén en cloud ni valida contra qué backend/bases está configurada esa SPA. La verificación funcional de las correcciones de este lote sigue siendo local y aislada.
