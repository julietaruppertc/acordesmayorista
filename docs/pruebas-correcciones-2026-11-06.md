# Pruebas ejecutadas de correcciones — 2026-11-06

## Alcance

Diego aclaró que quería ejecutar las correcciones. Se preparó un worktree detached revision-correcciones sobre la versión actual 16257e9 (imágenes/logo ya integrados). Allí se aplicaron exclusivamente los controladores, middleware, rutas e index de Auth, y expireReservations.js de origin/depuracion. No se aplicaron sus eliminaciones de documentación, lockfile ni reorganización de Git. La rama principal de trabajo conserva sus fuentes funcionales; las correcciones candidatas se probaron mediante montajes de solo lectura en Docker.

Se usó docker-compose.test.yml con un override temporal de TEMP/acordes-correcciones-2026-11-06/candidate.yml. Las bases fueron exclusivamente MongoDB/PostgreSQL locales del proyecto acordes-prueba, sin leer .env cloud. No se tocaron Atlas, Supabase, firewall ni acceso LAN. Frontend y Gateway escucharon solo en loopback.

## Resultados

| Prueba ejecutada | Resultado |
| --- | --- |
| Regresión nueva contra código actual: expirar reserva inconsistente | Falla reproducida: la promesa resuelve y expira pedidos, en vez de rechazar la inconsistencia |
| Mismo caso con corrección de depuracion | Aprobado: RESERVATION_STATE_CONFLICT, stock/versiones sin cambios, pedido sigue PENDING_PAYMENT y sin evento |
| Suite completa Core candidato | 14 pruebas aprobadas en PostgreSQL local: 13 existentes + regresión nueva |
| Seguridad Auth candidato | 6 pruebas aprobadas; claves efímeras de tests, sin copiar private.pem al worktree |
| Registro, login, JWT, permisos, checkout y pago firmado por Gateway | Aprobado con APIs reales candidatas y bases locales |
| Cinco notificaciones del mismo pago | Un solo pago y evento; cuatro already_processed |
| Worker Outbox puntual | Evento procesado conservando traza |
| Frontend en Edge headless | Catálogo, registro/login, carrito y checkout con expectedVersion aprobados; sin errores JavaScript en el recorrido |
| Imagen del producto | JPG real cargado con naturalWidth > 0; fixture de ruta cargada solo en la base local |
| Vista móvil 390px | Sin desbordamiento horizontal en catálogo |
| Login inválido con Auth candidato | HTTP 401 correcto, pero la pantalla muestra INVALID_CREDENTIALS, confirmando incompatibilidad del mensaje |

Traza del flujo completo: docker-smoke-f72be7d2-ba27-4995-82d2-141f0ac1c567.

## Regresión de expiración: qué se probó realmente

El test creó un pedido local vencido de dos productos, con una reserva válida y otra inconsistente (quantity 1 pero reserved 0). Con el código actual expireBatch no rechaza el fallo del UPDATE. Con el candidato se verificó con PostgreSQL real que stock y version de ambos productos permanecen iguales, el pedido continúa pendiente y no hay evento en Outbox. El test limpia exclusivamente sus registros ficticios al terminar.

No se reemplazó esa comprobación por un mock de transacción: el rollback del candidato ocurrió mediante withTransaction y PostgreSQL. La primera ejecución contra el código actual se esperaba fallida y efectivamente falló; luego la suite completa del candidato aprobó. El expirador procesó también pedidos locales vencidos de pruebas anteriores durante la ejecución de referencia. Todo ese impacto fue en la base aislada; no equivale a una corrida del expirador en Supabase.

## Auth: compatibilidad funcional y de mensajes

La prueba comparativa de controladores mantuvo códigos HTTP 400, 409 y 401. Cambiaron los cuerpos:

- Campos faltantes: error textual anterior frente a BAD_REQUEST + message.
- Duplicado: error textual anterior frente a CONFLICT + message.
- Credenciales inválidas: error textual anterior frente a INVALID_CREDENTIALS + message.

useAuth.js prioriza error sobre message. Edge confirmó que se muestra el código. Las seis pruebas de seguridad aprobadas no cubren la compatibilidad de mensajes, por eso no basta con ellas para integrar Auth sin adaptación. La corrección está probada; este punto necesita cambiar el contrato/documentación y el consumo del Front de manera conjunta, o conservar los errores públicos existentes.

## Pago visual

La pantalla actual de pago sigue siendo simulación del navegador: después de mostrar aprobación no se envió webhook y el pedido real siguió PENDING_PAYMENT. La comprobación del webhook real sí pasó desde docker-smoke.js. Las correcciones de depuracion no resuelven ese pendiente; no se desarrolló un nuevo simulador en esta tarea.

## Artefactos y estado de integración

- Worktree conservado en ../revision-correcciones con los cinco archivos candidatos y services/core-service/tests/expirationRollback.integration.test.js para poder extraer el parche/test tras la decisión de Diego. No contiene .env cloud ni private.pem.
- Montajes y scripts temporales: TEMP/acordes-correcciones-2026-11-06.
- Capturas/resultados del navegador: TEMP/acordes-correcciones-front-2026-11-06.
- La prueba nueva no se copió a la suite actual sin su corrección, porque dejaría fallando la rama de trabajo. La combinación corrección+test quedó lista y probada en la copia.
- Imágenes/logo de main permanecen integrados. Las correcciones candidatas de depuracion todavía no reemplazan las fuentes de la rama de trabajo. No se hicieron commits ni push.

## Cierre

Se detuvo Vite, se retiraron contenedores y redes de acordes-prueba con down sin -v y se solicitó detener Docker Desktop. Los datos ficticios locales y las evidencias se conservaron. No se habilitó acceso desde otras computadoras.

Siguiente decisión concreta: incorporar guard de liberación + su test, y resolver compatibilidad de mensajes de Auth antes de integrar esos archivos. No se requieren nuevas capas o servicios para el guard; mantiene transacciones, SQL explícito e integridad del stock del TP.

## Integración selectiva autorizada y verificada

Se incorporaron a la rama de trabajo la comprobación de rowCount al liberar reservas y su prueba real de rollback PostgreSQL. En Auth se adoptó únicamente ocultar error.message en las tres respuestas HTTP 500: ahora devuelven {"error":"Ocurrió un error interno."}. Los mensajes públicos 400/401/409, rutas, roles y DTO permanecen con su contrato existente. No se integraron el middleware/index/rutas candidatos, normalización redundante, eliminación de documentos ni lockfile de depuracion.

Esta selección responde a integridad transaccional del stock (D-01/RNF-05 y DEC-MVP-03) y confidencialidad (D-02/RNF-04). El análisis de IA se considera una propuesta; cada incorporación requiere evidencia y compatibilidad con lo ya implementado.

Verificación del código final: 9 pruebas Auth, 10 Gateway y 14 Core aprobadas. El smoke real por Gateway aprobó registro/login RS256, autorización, checkout, HMAC, cuatro notificaciones duplicadas y procesamiento Outbox con un único pago/evento. Traza: docker-smoke-dfd37b0b-e510-4603-94d5-9bd2cdacbca2. Solo bases Docker locales de acordes-prueba; sin Atlas, Supabase ni acceso LAN.

El historial anterior de este archivo describe la evaluación previa en worktree; esta sección actualiza el estado de integración. No se realizaron commit ni push. No equivale a una prueba de carga de 250 usuarios ni resuelve el simulador de pago del Frontend.

### Edge visible sobre código integrado
Recorrido con Edge visible y pausas: catálogo real, checkout sin sesión redirige a login, credenciales inválidas muestran el mensaje humano esperado, registro/login reales, carrito y checkout HTTP 201 con expectedVersion. Pedido ficticio 1ed0a544-ced6-46f7-9ffd-429078780976, pendiente de pago; no se ejecutó el pago visual. Vista móvil sin desborde y cero errores JavaScript. Capturas y resultado en TEMP/acordes-correcciones-visible-2026-11-06. Se cerró la ventana automatizada al finalizar.
