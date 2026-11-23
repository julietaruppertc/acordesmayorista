# Notarización blockchain de pedidos de alto valor

Estado de esta guía: 22 de noviembre de 2026. Rama de implementación: `feature/blockchain-attestation-paz`.

## 1. Objetivo y alcance

La extensión agrega una evidencia externa e inmutable para pedidos pagados cuyo total alcanza el umbral configurado. PostgreSQL continúa siendo la fuente operativa de verdad: la blockchain no procesa pagos, no reserva stock y no reemplaza ninguna tabla del Core.

Solo se publica un hash `bytes32`. No se envían a la red email, nombre, CUIT, identificador de Mongo, detalle de productos ni importes en texto legible.

El flujo está desactivado por defecto mediante `BLOCKCHAIN_ENABLED=false`. Las pruebas automáticas no llaman a Sepolia ni consumen fondos.

## 2. Decisiones adoptadas

### BLK-01 - Ethereum Sepolia

Se eligió Sepolia por ser la red recomendada para contratos y aplicaciones Ethereum. El `chainId` esperado es `11155111`. Antes de firmar o verificar, el servicio comprueba que el RPC responda ese identificador para evitar publicar accidentalmente en otra red.

### BLK-02 - Contrato de atestación, no escrow

El contrato se denomina `AcordesOrderAttestation`; no es un escrow porque nunca custodia fondos. Por el mismo motivo, la variable correcta es `ATTESTATION_CONTRACT_ADDRESS`, no `ESCROW_CONTRACT_ADDRESS`.

### BLK-03 - Hash y privacidad

El Core construye un objeto canónico de versión 1 con `orderId`, total en centavos enteros, identificador del pago y hash de ítems ordenados por `productId`. El objeto completo permanece fuera de la cadena. Sobre su JSON determinístico se calcula `keccak256`; únicamente el resultado se entrega al contrato.

### BLK-04 - Transactional Outbox existente

No se creó una segunda cola. Cuando el webhook aprueba un pedido que supera el umbral, la misma transacción PostgreSQL consolida el stock, registra el pago, cambia el pedido a `PAID`, encola `ORDER_PAID`, cambia `blockchain_status` a `PENDING` y encola `ATTEST_HIGH_VALUE`. Si cualquier operación falla, toda la transacción se revierte.

### BLK-05 - Relayer asíncrono e idempotencia

El worker procesa `ATTEST_HIGH_VALUE` fuera de la petición HTTP. El contrato rechaza un hash repetido y el servicio consulta `isAttested` antes de enviar. Si la red confirmó pero PostgreSQL no llegó a guardar el resultado, un reintento recupera el evento `OrderAttested` y su hash de transacción en lugar de publicar otra evidencia.

### BLK-06 - Lease del worker

El estado `PROCESSING` y `locked_at` permiten reclamar un evento sin mantener una transacción SQL abierta durante el minado. Un evento abandonado por una caída del worker puede recuperarse después de `OUTBOX_LOCK_TIMEOUT_SECONDS`. Los intentos fallidos vuelven a `PENDING`; al agotar el máximo pasan a `FAILED` junto con el pedido.

## 3. Componentes implementados

| Archivo | Responsabilidad |
| --- | --- |
| `services/core-service/blockchain/contracts/AcordesOrderAttestation.sol` | Registro mínimo e idempotente del hash |
| `services/core-service/blockchain/hardhat.config.js` | Compilación Solidity 0.8.28 |
| `services/core-service/blockchain/test/` | Pruebas locales del contrato |
| `services/core-service/blockchain/scripts/initialize-private-env.js` | Genera billetera de testnet y la guarda solo en `.env` ignorado |
| `services/core-service/blockchain/scripts/deploy-sepolia.js` | Despliega, valida red/saldo y registra dirección/bloque en `.env` |
| `services/core-service/migrations/004_blockchain_attestation.sql` | Columnas de evidencia y lease de Outbox |
| `src/modules/blockchain/blockchain.service.js` | Canonicalización, hash, firma, publicación y verificación |
| `src/modules/payments/payments.service.js` | Generación transaccional de `ATTEST_HIGH_VALUE` |
| `src/workers/outboxWorker.js` | Claim, reintentos, relayer y persistencia del resultado |
| `src/modules/orders/*` | Endpoint de prueba y control de propiedad |
| `shared/contracts/core/blockchain-proof.response.json` | Ejemplo del contrato HTTP |

## 4. Persistencia

La migración agrega a `orders.orders`:

- `blockchain_status`: `NOT_REQUIRED`, `PENDING`, `CONFIRMED` o `FAILED`;
- `blockchain_tx_hash`;
- `blockchain_evidence_hash`;
- `blockchain_network`;
- `blockchain_contract_address`;
- `blockchain_attested_at`.

También amplía `mq.outbox` con estado `PROCESSING` y `locked_at`. Los pedidos existentes quedan en `NOT_REQUIRED`. La migración fue diseñada para ejecutarse más de una vez.

## 5. Variables privadas y públicas

La plantilla versionada contiene nombres y valores ficticios. Los valores reales se guardan exclusivamente en `services/core-service/.env`, que está ignorado por Git.

```ini
BLOCKCHAIN_ENABLED=false
BLOCKCHAIN_RPC_URL=
RELAYER_PRIVATE_KEY=
ATTESTATION_CONTRACT_ADDRESS=
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_CHAIN_ID=11155111
BLOCKCHAIN_DEPLOYMENT_BLOCK=0
BLOCKCHAIN_EXPLORER_URL=https://sepolia.etherscan.io/tx/
BLOCKCHAIN_CONFIRMATIONS=1
BLOCKCHAIN_TX_TIMEOUT_SECONDS=180
HIGH_VALUE_THRESHOLD_ARS=2000000
OUTBOX_LOCK_TIMEOUT_SECONDS=300
```

`RELAYER_PRIVATE_KEY` nunca debe copiarse a GitHub, documentación, Supabase, frontend, variables `VITE_*` ni mensajes grupales. Para Docker/cloud debe cargarse como secreto del proceso `outbox-worker`. El Core HTTP solo necesita RPC, dirección y datos públicos para verificar.

## 6. Preparación y despliegue

```powershell
cd services/core-service/blockchain
npm ci
npm run compile
npm test
npm run init:private-env
npm run deploy:sepolia
```

El inicializador conserva una clave existente o crea una nueva y muestra únicamente la dirección pública. El despliegue aborta si el RPC no es Sepolia o si la billetera no tiene saldo. Después de una confirmación, escribe en el `.env` privado `ATTESTATION_CONTRACT_ADDRESS`, `BLOCKCHAIN_DEPLOYMENT_BLOCK` y `BLOCKCHAIN_ENABLED=true`.

Dirección pública creada para esta rama: `0x52C3914fF9559875962A3e4F510fCe58A6863D65`.

Despliegue realizado el 22/11/2026 en Ethereum Sepolia (`chainId 11155111`):

- contrato: `0x0840CB12A12BeB5a1F8613dD19764545753824f7`;
- transacción de despliegue: `0xe9eff4b0d6922767feecc8f6078f6dcef38d91dff7f0b9e8c0e4267e3de756de`;
- bloque de despliegue: `12191453`;
- relayer: `0x52C3914fF9559875962A3e4F510fCe58A6863D65`.

La dirección, la red, el bloque y las transacciones son datos públicos. La clave privada del relayer y el RPC permanecen únicamente en el `.env` ignorado.

## 7. Endpoint de auditoría

```http
GET /api/orders/:id/blockchain-proof
Authorization: Bearer <token>
```

- Cliente: solo su pedido.
- Admin: cualquier pedido.
- Operador: `403`.

La respuesta incluye estado, red, contrato, hash de evidencia, transacción, enlace al explorador y resultado de la verificación en vivo. Si el RPC no está disponible se conserva la prueba persistida, pero `verificationStatus` informa `NETWORK_UNAVAILABLE`.

## 8. Pruebas ejecutadas

Entorno de base: proyecto Docker aislado `acordes-blockchain-paz`, no Supabase compartido.

- Contrato Hardhat: 4/4 pruebas (almacenamiento, duplicado, relayer no autorizado y hash vacío).
- Migraciones `001` a `004` sobre una base vacía y segunda ejecución para comprobar idempotencia.
- Core: 27/27 pruebas; pedido superior a $2.000.000, evento único, persistencia confirmada, permisos, reintentos, agotamiento de intentos, canonicalización y recuperación de leases.
- Gateway: 13/13 pruebas; cliente/admin permitidos y operador rechazado.
- Auth: 17/17 pruebas, incluida auditoría de CUIT con IA.
- Frontend: build de producción correcto.

El lint global del frontend ya fallaba en archivos ajenos a esta extensión (PropTypes, imports faltantes y variables sin usar). No se modificaron esos archivos para evitar mezclar responsabilidades; el detalle debe resolverse en la rama de frontend.

### Evidencia real en Sepolia y Supabase

El 22/11/2026 se ejecutó el recorrido real con Core y worker como procesos separados:

- pedido: `6262a435-25eb-4ec8-91b1-451955ca56ad`;
- total: `$2.500.000` (dos unidades del producto seleccionado);
- pago simulado: aprobado mediante el webhook HMAC;
- estado del pedido: `PAID`;
- estado blockchain: `CONFIRMED`;
- evento `ORDER_PAID`: `PROCESSED`, un intento y sin error;
- evento `ATTEST_HIGH_VALUE`: `PROCESSED`, un intento y sin error;
- hash de evidencia: `0x5e1cb17c6427bf31a03b95054f229c78af0c8f17ad2f97ffa89d0268b8251167`;
- transacción de atestación: `0x813b27f0b63acae251efd6bf86b9e296847512a6164236ae52e2e1fc1767c64d`;
- verificación del endpoint: `verified=true` y `verificationStatus=VERIFIED`.

La migración `004` se aplicó en Supabase después de haber sido validada dos veces en PostgreSQL aislado. La prueba consumió stock real de demostración y Sepolia ETH de la billetera técnica; no se ejecutan suites destructivas contra Supabase.

La auditoría del Core quedó sin vulnerabilidades después de actualizaciones compatibles. Hardhat conserva una alerta de desarrollo por su dependencia transitiva de Zod 3; no existe actualmente un parche compatible en la rama Hardhat 3. Hardhat no forma parte de la imagen de ejecución del Core.

## 9. Prueba de punta a punta

Una vez financiada la billetera y desplegado el contrato:

1. aplicar `npm run migrate` en el PostgreSQL autorizado;
2. copiar variables públicas y secretos al entorno del worker;
3. iniciar Core, worker, Gateway y frontend;
4. crear un pedido superior a `HIGH_VALUE_THRESHOLD_ARS`;
5. aprobarlo desde el panel admin;
6. comprobar `orders.orders.blockchain_status = 'CONFIRMED'`;
7. comprobar `mq.outbox.event_type = 'ATTEST_HIGH_VALUE'` y `status = 'PROCESSED'`;
8. consultar `/api/orders/:id/blockchain-proof`;
9. abrir `explorerUrl` y contrastar la transacción.

La primera ejecución compartida ya fue realizada y documentada. Las repeticiones deben coordinarse porque crean un pedido/pago real de demostración, descuentan stock de Supabase y consumen una pequeña cantidad de Sepolia ETH. Las pruebas automáticas continúan usando PostgreSQL y blockchain locales, sin costo.

## 10. Integración del equipo

- Diego: cargar secretos en Compose/cloud y mantener la política del Gateway para la ruta de prueba.
- Camila: consumir el endpoint y mostrar estados `PENDING`, `CONFIRMED`, `FAILED` y `NOT_REQUIRED`.
- Julieta: no necesita modificar Auth; la IA y la notarización son integraciones independientes.
- Paz: contrato, migración, servicio, worker, pruebas y despliegue.

## 11. Rollback

Para desactivar sin perder evidencia, configurar `BLOCKCHAIN_ENABLED=false`. Esto evita nuevos eventos y llamadas a la red. No se deben borrar hashes ya confirmados ni intentar revertir la blockchain. La migración agrega columnas compatibles y no cambia pedidos por debajo del umbral o con la función desactivada.
