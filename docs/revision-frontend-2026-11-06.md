# Revisión de cambios e integración Frontend — 2026-11-06

## Repositorio e integración

Estado inicial: trabajo/diego limpio en 4fb2a72. Tras git fetch origin, main y feature/frontend-acordes apuntaban a e4c0b1b; la rama depuracion apuntaba a f8f2893. Se incorporó origin/main por fast-forward, sin conflictos, a trabajo/diego. Commits recibidos: b68e71a (Frontend de Camila) y e4c0b1b (ejemplo CORS en 5173). No se hicieron commits ni push.

Diego autorizó revisar ambas ramas e integrar depuracion solo si era compatible. Se revisó en un worktree detached independiente; no se integró porque cambia el contrato de errores de Auth sin actualizar sus documentos y elimina docs/estado-local-diego-2026-11-01.md y apps/web/README.md. Las pruebas aprobadas no demuestran compatibilidad de esos cambios. No hay conflicto de Git entre las ramas; el bloqueo es de contrato y contenido que se elimina.

## Comprobaciones realizadas

- Frontend: npm ci desde lockfile; npm run build aprobado (Vite 5.4.21).
- Frontend lint: 12 errores y 3 advertencias. Props sin validar, imports/variables sin uso, Fast Refresh y dependencia de useEffect. La compilación pasa; lint no pasa.
- Main: Gateway 10 pruebas y Auth 6 pruebas aprobadas.
- Depuracion: Auth 6 pruebas aprobadas con dependencia local y claves efímeras de tests. No se copió la clave privada al worktree. Core: 13 pruebas aprobadas al montar su src en solo lectura dentro de core-tests contra PostgreSQL local. El lockfile de depuracion no se reinstaló en esa prueba: se usó la imagen existente, por lo que esta evidencia no valida la instalación de su lockfile.
- Edge headless, modo real: catálogo desde Gateway, protección de checkout sin sesión, registro particular, login, carrito y checkout con expectedVersion aprobado. El pedido se persistió en PENDING_PAYMENT.
- Pago visual aprobado: cero llamadas al webhook; una consulta real al Core confirmó PENDING_PAYMENT. No hubo error JavaScript en el recorrido automatizado.
- Vista de 390px: catálogo sin desbordamiento horizontal. No implica una auditoría completa de accesibilidad, responsive ni compatibilidad de navegadores.
- Se abrió también una ventana privada de Edge a pedido de Diego para pruebas manuales.

## Entorno utilizado

Vite: escucha 127.0.0.1:3000, abierto en navegador como http://localhost:3000 para coincidir con CORS del Compose. Variables solo del proceso: VITE_API_URL=http://127.0.0.1:4000 y VITE_DEMO_MODE=false. No se crearon .env del Frontend ni se modificaron los .env privados.

Backend: docker-compose.test.yml, proyecto acordes-prueba. APIs reales en contenedores y Gateway publicado solo en 127.0.0.1:4000. Auth usa MongoDB local acordes_auth_test; Core usa PostgreSQL local acordes_test. Auth/Core/bases permanecen en la red interna. No se utilizaron MongoDB Atlas ni Supabase. Migraciones/semillas se ejecutaron únicamente en PostgreSQL local. Hay datos persistentes de demostraciones anteriores en los volúmenes.

Las capturas y resultados del navegador se guardaron fuera del repo, en la carpeta temporal de Windows acordes-front-review-2026-11-06. Los scripts temporales no guardan tokens en resultados ni capturas de consola.

## Hallazgos de integración por prioridad

1. Pago sin persistencia: apps/web/src/views/Payment.jsx, simulatePayment, modifica sessionStorage y muestra compra confirmada mediante setTimeout. No confirma el pedido en Core ni envía HMAC. Requiere acordar un simulador backend; no colocar el secreto de webhook en Frontend ni implementar aprobación en navegador.
2. Roles de administración: App.jsx permite solo operador en /operador/stock y /operador/usuarios. El backend permite admin en stock y exige admin para aprobación mayorista. Con una cuenta admin real creada directamente en Mongo local, Edge redirigió /operador/stock a inicio; el backend admitió su autorización y respondió 400 a un UUID inválido (no 403).
3. Mayorista pendiente: ProtectedRoute condiciona el chequeo a user.cuit, pero el login real devuelve user sin cuit. Una cuenta con estado PENDIENTE pudo entrar a /checkout en Edge. Debe acordarse el uso de estado_mayorista o ajustar el DTO con Julieta; no se modificaron contratos durante esta revisión.
4. Gestión mayorista simulada: WholesaleManagement.jsx llama siempre a mockGetWholesaleRequests y mockUpdateWholesaleStatus. No aprueba cuentas reales del backend.
5. Configuración incompleta: api.js depende de VITE_API_URL y no hay plantilla de Frontend. El catálogo cae a mocks si no conecta. El ejemplo del Gateway ahora usa CORS 5173, pero docker-compose.test.yml conserva 3000. La prueba usó 3000 explícitamente sin modificar código. Configurar URL/origen exactos para cada integrante.
6. Stock reservado: OperatorStock calcula nuevo onHand usando availableStock. Con reservas existentes, stock físico y disponible son distintos; revisar con Paz antes de validar esta pantalla como integrada.
7. Limpieza de código: lint falla; no se corrigieron archivos de Camila durante esta revisión.

## Pruebas manuales y persistencia

Abrir http://localhost:3000. Crear cuenta particular ficticia, login, agregar una unidad de un producto disponible y confirmar checkout con datos ficticios. Esperado: nuevo usuario en Mongo local, pedido PENDING_PAYMENT en PostgreSQL, reserved aumenta y version cambia. El stock físico on_hand no disminuye hasta pago real aprobado por Core. La pantalla de pago actual no produce esa transición.

Desde la raíz, consultas de lectura:

```powershell
docker compose -f docker-compose.test.yml exec mongo mongosh acordes_auth_test --quiet --eval 'db.users.find({}, {email:1, rol:1, estado_mayorista:1}).sort({_id:-1}).limit(5).toArray()'
docker compose -f docker-compose.test.yml exec postgres psql -U acordes_test -d acordes_test -c 'SELECT id, status, total, created_at FROM orders.orders ORDER BY created_at DESC LIMIT 5;'
docker compose -f docker-compose.test.yml exec postgres psql -U acordes_test -d acordes_test -c 'SELECT p.name, s.on_hand, s.reserved, s.on_hand - s.reserved AS available, s.version FROM catalog.products p JOIN inventory.stock s ON s.product_id = p.id ORDER BY p.name;'
```

No consultar ni compartir hashes de contraseñas. Refrescar catálogo para ver reservas recientes. El carrito vive en memoria y puede perderse al recargar: no es evidencia de pérdida del pedido en base. No ejecutar seed mientras se comparan datos antes/después.

Los volúmenes conservan usuarios/pedidos al hacer down sin -v y al reiniciar Docker. No usar down -v para una prueba de persistencia: elimina los datos. El expirador no se ejecuta continuamente en este Compose, por lo que reservas pendientes no se liberan automáticamente al esperar cinco minutos; eso requiere probar el proceso específico de forma controlada.

## Cierre

Diego pidió probar manualmente desde Edge y recibió confirmación de que el entorno es local aislado. Se conserva temporalmente abierto mientras realiza sus pruebas; no afirmar que está apagado. Al terminar, detener Vite y ejecutar docker compose -f docker-compose.test.yml down; verificar lista de contenedores y puertos 3000/4000 vacíos, y cerrar Docker Desktop. No se modificaron reglas de firewall.

Próximo lote propuesto: acordar roles/estado mayorista con Camila y Julieta, resolver configuración de API/CORS y lint, y diseñar simulador backend con Paz antes de cambios funcionales. No se requiere publicar nada para completar la revisión local.

Actualización de cierre: Diego solicitó finalizar la sesión para trasladarse. Se ejecutó down sobre acordes-prueba sin -v: contenedores y redes retirados, datos ficticios conservados en volúmenes locales. Se detuvo el proceso Vite de esta prueba y se solicitó cerrar Docker Desktop. La siguiente sesión requiere volver a iniciar el entorno; no se realizaron nuevos commits ni push.
