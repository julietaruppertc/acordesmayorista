# Sesión temporal por hotspot — 2026-11-06

## Autorización y alcance

Diego autorizó acceso únicamente desde la IPv4 172.20.10.4, en la misma red móvil. IP del servidor en Wi-Fi: 172.20.10.10/28; Windows mantiene el perfil Público. No se modificó el router ni se creó túnel público ni se cambió la categoría de red. No corresponde al despliegue cloud final del TP.

URL para la sesión: http://172.20.10.10:3000. Gateway: http://172.20.10.10:4000. Usar esa URL también desde la PC de Diego para coincidir con CORS.

## Configuración temporal aplicada

Se conservaron Vite y Gateway escuchando en loopback. Se inició un relay TCP de Python en la IP LAN exacta, puertos 3000/4000, que valida la IP real del socket antes de reenviar a 127.0.0.1 en el mismo puerto. Solo admite 172.20.10.4 y la propia IP 172.20.10.10 para comprobaciones locales. No confía en X-Forwarded-For ni en cabeceras del navegador. Este proceso es temporal y no forma parte del backend del producto.

Windows ya tenía bloqueado Node en redes públicas; esa protección se conservó. Se crearon dos reglas con grupo Acordes-LAN-Temporal-20261106 y nombres Acordes-LAN-20261106-3000 / Acordes-LAN-20261106-4000. Ambas son inbound TCP, perfil Public, interfaz Wi-Fi, LocalAddress 172.20.10.10, RemoteAddress 172.20.10.4, puerto específico y programa Python exacto. EdgeTraversalPolicy Block. No se habilitó acceso para LocalSubnet ni Any. Hubo un ajuste de la ruta del programa en esas reglas, sin ampliar direcciones o puertos.

Archivos de sesión guardados fuera del repo en TEMP/acordes-lan-2026-11-06: relay.py, gateway-lan.yml, firewall-enable.ps1, firewall-disable.ps1 y firewall-program.ps1. No contienen credenciales de bases. No deben usarse para otra IP/red sin revisar configuración y autorización.

El Gateway cloud-check se recreó con el override temporal que fija CORS_ORIGIN=http://172.20.10.10:3000. El resto de su configuración es docker-compose.cloud-check.yml. Vite se reinició con VITE_API_URL=http://172.20.10.10:4000 y VITE_DEMO_MODE=false, manteniendo --host 127.0.0.1 --port 3000 --strictPort.

Auth y Core permanecen sin puertos publicados. Atlas y Supabase siguen siendo las bases compartidas de prueba autorizadas por Diego. Las acciones realizadas por los compañeros impactan allí. El pago visual sigue sin confirmar pagos reales del Core.

## Verificación

Desde la propia PC: HTTP 200 en LAN puerto 3000, /health y /api/products en puerto 4000; Access-Control-Allow-Origin correcto. Edge headless abrió la dirección LAN y obtuvo catálogo real HTTP 200. No se crearon usuarios ni pedidos adicionales durante estas comprobaciones de conectividad.

El compañero confirmó que desde 172.20.10.4 carga la página y el catálogo. La conectividad entre clientes del hotspot funciona para esta sesión. No ampliar reglas ni desactivar firewall si no conecta; revisar primero IP, aislamiento y reglas de bloqueo. La autorización por IP es una restricción de red, no identidad criptográfica de la persona; utilizar cuentas ficticias y contraseñas exclusivas de prueba porque el tramo navegador/PC usa HTTP.

## Cierre obligatorio de la sesión

1. Detener el proceso Python cuyo comando apunta exclusivamente al relay.py de esta sesión; verificar que desaparecen los listeners LAN de 3000/4000.
2. Ejecutar firewall-disable.ps1 como administrador para retirar únicamente el grupo Acordes-LAN-Temporal-20261106. No tocar las reglas de bloqueo de Node ni restablecer todo el firewall.
3. Si se continúa probando solo en esta PC, recrear Gateway usando únicamente docker-compose.cloud-check.yml para restaurar CORS localhost:3000, y reiniciar Vite con VITE_API_URL=http://127.0.0.1:4000.
4. Si se termina toda la prueba, detener también Vite, ejecutar down sobre acordes-cloud-check y cerrar Docker Desktop.
5. Comprobar listeners y ausencia de las dos reglas temporales. No borrar bases cloud ni volúmenes de pruebas locales.

La IP del hotspot puede cambiar al reconectar. No dejar esta entrada ejecutándose al cambiar de red. No se hicieron commits ni push ni cambios al código funcional de Frontend/Auth/Core/Gateway en esta habilitación.

Prueba adicional de origen no autorizado desde esta PC: Windows rechazó el enlace de socket antes de completar la conexión (OSError); no constituye una prueba de rechazo desde un tercer dispositivo. La restricción se comprobó en la configuración de firewall y en el control explícito de IP del relay. No se afirmó una verificación remota desde una IP no autorizada.


## Cierre de la sesión LAN

Diego solicitó cerrar todas las sesiones y retirar el acceso a su PC. Se detuvieron el relay TCP y Vite, se eliminaron las dos reglas del grupo Acordes-LAN-Temporal-20261106 mediante UAC (código 0), se ejecutó down sobre acordes-cloud-check y se solicitó detener Docker Desktop. Verificación de Windows: cero listeners en 3000, 4000, 4001 y 4002, cero reglas del grupo temporal y cero procesos relay de esta sesión. No se borraron datos de Atlas/Supabase ni volúmenes locales; los bloqueos existentes de Node se conservaron.

Durante la sesión Diego y su compañera reportaron una prueba manual concurrente del mismo producto: un checkout fue aceptado y el otro rechazado al superar el stock conjunto disponible. Es evidencia reportada por los usuarios; no se inspeccionaron el código HTTP ni los registros de Supabase de ese caso específico antes del cierre. No atribuirle confirmación de pago: la pantalla de pago continúa siendo visual.
