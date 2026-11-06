# Recomendaciones de depuracion para el final — 2026-11-06

## Decisión de integración

Diego autorizó incorporar imágenes/logo de origin/main y seguir evaluando recomendaciones de depuracion. Se integró main por fast-forward hasta 16257e9, conservando los archivos locales pendientes. Se actualizó el ejemplo canónico de catálogo y su documentación para imageUrl nullable conforme DEC-MVP-11. No se integró el commit completo f8f2893 de depuracion. No se hicieron nuevos commits/push ni se inició ningún servicio.

Depuracion parte de e4c0b1b, antes de imágenes/logo. Para evaluar sus aportes se usa su diff respecto del ancestro común; no debe restaurarse su árbol completo sobre main, porque eso presentaría cambios más recientes como eliminaciones. El commit también elimina el punto de control y el README de Frontend. Los aportes útiles deben extraerse como parches pequeños sobre la versión actual y conservar la documentación vigente.

## 1. Prioridad alta: comprobar liberación al expirar reservas

Archivo propuesto: services/core-service/src/jobs/expireReservations.js. Depuracion captura el resultado del UPDATE inventory.stock y exige rowCount===1; si no, lanza RESERVATION_STATE_CONFLICT, código ya usado en pagos para conflictos de reserva.

Problema actual: si una reserva está inconsistente y el UPDATE devuelve cero filas, el job igualmente marca EXPIRED y genera ORDER_EXPIRED. Eso registra una liberación que no ocurrió. La validación propuesta hace que la transacción falle en vez de confirmar ese estado.

Respaldo: D-01 / RNF-05, integridad del stock y transacciones; DEC-MVP-03, atomicidad, y reglas vigentes de expiración del Core. No requiere otro servicio ni cambiar el checkout.

Evidencia: se ejecutó el código actual y el de depuracion con dependencias simuladas en vm de Node, sin conectarse a bases. Con un pedido vencido y UPDATE de reserva rowCount=0, el actual continuó hasta marcar pedido y emitir evento; depuracion devolvió RESERVATION_STATE_CONFLICT antes de esas acciones y la transacción simulada tomó el camino rollback. Esto verifica la rama lógica, no reemplaza una prueba PostgreSQL real de rollback.

Siguiente lote recomendado para aprobación: parche mínimo de la comprobación, test contra PostgreSQL aislado de reserva inconsistente y rollback (incluyendo un pedido de varios productos), conservación de expiración normal y documentación con Paz. No ejecutar el job contra Supabase compartida para demostrar el fallo.

## 2. Prioridad media: errores de Auth seguros y comprensibles

Archivos propuestos: authController.js e index.js, más pruebas y contrato de Auth/consumo del Frontend. La intención útil es evitar devolver error.message de errores internos al cliente y centralizar el manejo.

No incorporar tal cual: cambia respuestas de error textuales a códigos BAD_REQUEST, CONFLICT, INVALID_CREDENTIALS, etc., sin actualizar el contrato. useAuth.js muestra error antes de message, por lo que el usuario podría ver CONFLICT en lugar de una explicación. El middleware nuevo devuelve 500 para cualquier error no clasificado y registra el objeto completo; conviene clasificar validación/duplicados y sanitizar logs.

Respaldo: D-02 / RNF-04, confidencialidad y control de acceso; D-07, separación de responsabilidades. Acordar con Julieta y Camila antes de cambiar error/message o códigos. Pruebas requeridas: campos mal tipados, credenciales inválidas, ObjectId inválido, duplicados incluidos los concurrentes, error interno sin filtración de detalles y mensajes de interfaz.

## 3. Baja prioridad: normalización de email

Depuracion agrega toLowerCase().trim() en los controladores. El User actual ya tiene lowercase:true y trim:true en el esquema. Se comprobó sin Mongo mediante el casteo de una consulta Mongoose que un email ficticio con espacios/mayúsculas se normaliza a minúsculas y sin espacios.

Por eso no tratar el cambio como una función faltante. Si se conserva la normalización explícita por claridad, validar primero que email sea string y cubrir registro/login. No reescribir Auth solo por este motivo.

## 4. Opcional: req.user en requireAdmin

Depuracion adjunta al request el payload ya validado. Puede servir para auditoría futura; hoy el controlador de aprobación no lo consume. RS256, issuer y rol admin ya se verifican en el middleware existente. La nueva propiedad no justifica por sí sola reemplazar el archivo completo ni agrega una validación de rol nueva. Conservar pruebas existentes si se adopta en un lote acordado.

## 5. Limpieza de Git y lockfile

La reorganización de .gitignore conserva los secretos excluidos; el patrón node_modules/ ya cubre directorios anidados, por lo que **/node_modules/ es principalmente explícito/redundante. Los .gitkeep de carpetas con archivos pueden retirarse, pero no es un requisito arquitectónico y no aporta evidencia de stock/seguridad.

No eliminar docs/estado-local-diego-2026-11-01.md ni el README útil del Frontend. No sustituir el lockfile por el de la rama antigua sin motivo: sus cambios eliminan metadatos libc y agregan peer, sin nuevas versiones funcionales. Regenerarlo solo si una actualización de dependencias lo requiere y validar Windows/Alpine.

## Orden propuesto de pequeños lotes

1. Validación de expiración con test de rollback en base aislada, coordinado con Paz.
2. Configuración de Frontend y permisos/estado mayorista ya detectados, coordinados con Camila/Julieta.
3. Manejo de errores de Auth con contrato y mensajes acordados.
4. Simulador de pago backend mínimo conforme el Plan, después de lo ya decidido con Diego.
5. Cloud, certificado TLS, worker continuo y evidencia final de requisitos pendientes.

Este orden es una propuesta, no implementación autorizada de cada lote. No atribuir a las mejoras evidencia de 250 usuarios o disponibilidad. La revisión previa de depuracion obtuvo 6 pruebas Auth y 13 Core aprobadas con las limitaciones registradas en revision-frontend-2026-11-06.md; esas suites no cubren todavía el caso nuevo de reserva inconsistente ni todos los contratos de error.

## Pruebas posteriores ejecutadas
Se ejecutaron las correcciones en Docker y Edge; ver docs/pruebas-correcciones-2026-11-06.md. La regresión de expiración falló antes y pasó con el candidato, con 14 pruebas Core y 6 Auth aprobadas. Se confirmó el problema de mensajes de Auth en el Frontend. No son ya solo recomendaciones de lectura: hay evidencia ejecutada, con los candidatos conservados aparte.

## Decisión aplicada
Se integró selectivamente el guard de expiración con rollback real y se adaptó Auth para ocultar errores internos sin cambiar los mensajes consumidos por Frontend. El resto de depuracion permanece sin integrar. Ver pruebas-correcciones-2026-11-06.md para resultados y límites del alcance.
