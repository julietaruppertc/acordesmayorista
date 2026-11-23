const { ethers } = require('ethers');
const env = require('../../config/env');
const { pool } = require('../../config/database');
const contractAbi = require('./contractAbi');

let provider;

function decimalToCents(value) {
  const normalized = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Importe decimal inválido: ${normalized}`);
  }
  const [whole, decimals = ''] = normalized.split('.');
  return BigInt(whole) * 100n + BigInt(decimals.padEnd(2, '0'));
}

function buildEvidence(snapshot) {
  const items = [...snapshot.items]
    .map((item) => ({
      productId: String(item.productId),
      unitPriceCents: decimalToCents(item.unitPrice).toString(),
      quantity: Number(item.quantity)
    }))
    .sort((left, right) => left.productId.localeCompare(right.productId));

  const itemsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(items)));
  const canonical = {
    version: 1,
    orderId: String(snapshot.orderId),
    totalCents: decimalToCents(snapshot.total).toString(),
    paymentId: String(snapshot.paymentId),
    itemsHash
  };
  const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(canonical)));
  return { canonical, evidenceHash };
}

async function loadSnapshot(orderId, paymentId) {
  const orderResult = await pool.query(
    `SELECT o.id, o.total, p.external_payment_id
       FROM orders.orders o
       JOIN payments.payments p ON p.order_id = o.id AND p.status = 'APPROVED'
      WHERE o.id = $1 AND p.external_payment_id = $2 AND o.status = 'PAID'`,
    [orderId, paymentId]
  );
  const order = orderResult.rows[0];
  if (!order) throw new Error('No existe un pedido pagado con el pago indicado para notarizar.');

  const itemResult = await pool.query(
    `SELECT product_id, unit_price, quantity
       FROM orders.order_items
      WHERE order_id = $1
      ORDER BY product_id`,
    [orderId]
  );
  if (itemResult.rowCount === 0) throw new Error('El pedido no contiene ítems para notarizar.');

  return {
    orderId: order.id,
    total: order.total,
    paymentId: order.external_payment_id,
    items: itemResult.rows.map((item) => ({
      productId: item.product_id,
      unitPrice: item.unit_price,
      quantity: item.quantity
    }))
  };
}

function getProvider() {
  if (!provider) provider = new ethers.JsonRpcProvider(env.BLOCKCHAIN_RPC_URL);
  return provider;
}

async function assertExpectedNetwork(currentProvider) {
  const network = await currentProvider.getNetwork();
  if (Number(network.chainId) !== env.BLOCKCHAIN_CHAIN_ID) {
    throw new Error(
      `La red blockchain respondió chainId ${network.chainId}; se esperaba ${env.BLOCKCHAIN_CHAIN_ID}.`
    );
  }
}

function getReadContract(currentProvider) {
  return new ethers.Contract(env.ATTESTATION_CONTRACT_ADDRESS, contractAbi, currentProvider);
}

async function waitWithTimeout(promise, milliseconds) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new Error('Tiempo de espera agotado al confirmar la transacción blockchain.')),
          milliseconds
        );
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function findAttestationTransaction(contract, evidenceHash) {
  const events = await contract.queryFilter(
    contract.filters.OrderAttested(evidenceHash),
    env.BLOCKCHAIN_DEPLOYMENT_BLOCK,
    'latest'
  );
  return events.at(-1)?.transactionHash || null;
}

async function attestHighValueOrder({ orderId, paymentId }) {
  if (!env.BLOCKCHAIN_ENABLED) throw new Error('La notarización blockchain está deshabilitada.');
  if (!env.RELAYER_PRIVATE_KEY)
    throw new Error('RELAYER_PRIVATE_KEY no está configurada en el worker.');

  const snapshot = await loadSnapshot(orderId, paymentId);
  if (Number(snapshot.total) < env.HIGH_VALUE_THRESHOLD_ARS) {
    throw new Error('El pedido no alcanza el umbral configurado para notarización.');
  }

  const evidence = buildEvidence(snapshot);
  const currentProvider = getProvider();
  await assertExpectedNetwork(currentProvider);
  const readContract = getReadContract(currentProvider);

  if (await readContract.isAttested(evidence.evidenceHash)) {
    const transactionHash = await findAttestationTransaction(readContract, evidence.evidenceHash);
    if (!transactionHash) {
      throw new Error('La evidencia existe on-chain, pero no se pudo recuperar su transacción.');
    }
    return { ...evidence, transactionHash, alreadyAttested: true };
  }

  const wallet = new ethers.Wallet(env.RELAYER_PRIVATE_KEY, currentProvider);
  const writeContract = readContract.connect(wallet);
  const transaction = await writeContract.attest(evidence.evidenceHash);
  await waitWithTimeout(
    transaction.wait(env.BLOCKCHAIN_CONFIRMATIONS),
    env.BLOCKCHAIN_TX_TIMEOUT_SECONDS * 1000
  );
  return {
    ...evidence,
    transactionHash: transaction.hash,
    alreadyAttested: false
  };
}

async function verifyEvidenceHash(evidenceHash) {
  if (!env.BLOCKCHAIN_ENABLED) return { verified: null, reason: 'BLOCKCHAIN_DISABLED' };
  const currentProvider = getProvider();
  await assertExpectedNetwork(currentProvider);
  const contract = getReadContract(currentProvider);
  return { verified: await contract.isAttested(evidenceHash), reason: null };
}

function explorerUrl(transactionHash) {
  return transactionHash ? `${env.BLOCKCHAIN_EXPLORER_URL}${transactionHash}` : null;
}

function resetProviderForTests() {
  provider = undefined;
}

module.exports = {
  attestHighValueOrder,
  buildEvidence,
  decimalToCents,
  explorerUrl,
  resetProviderForTests,
  verifyEvidenceHash
};
