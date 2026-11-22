const { buildEvidence, decimalToCents } = require('../src/modules/blockchain/blockchain.service');

describe('Evidencia blockchain canónica', () => {
  it('convierte importes decimales a centavos sin usar punto flotante', () => {
    expect(decimalToCents('2000000.00')).toBe(200000000n);
    expect(decimalToCents('10.5')).toBe(1050n);
  });

  it('produce el mismo hash sin importar el orden original de los ítems', () => {
    const base = {
      orderId: '00000000-0000-4000-8000-000000000001',
      total: '2500000.00',
      paymentId: 'payment-1'
    };
    const items = [
      { productId: 'b', unitPrice: '500000.00', quantity: 1 },
      { productId: 'a', unitPrice: '1000000.00', quantity: 2 }
    ];
    const left = buildEvidence({ ...base, items });
    const right = buildEvidence({ ...base, items: [...items].reverse() });

    expect(left.evidenceHash).toBe(right.evidenceHash);
    expect(left.canonical.itemsHash).toBe(right.canonical.itemsHash);
  });

  it('cambia la evidencia si cambia una cantidad del pedido', () => {
    const base = {
      orderId: '00000000-0000-4000-8000-000000000001',
      total: '2500000.00',
      paymentId: 'payment-1'
    };
    const first = buildEvidence({
      ...base,
      items: [{ productId: 'a', unitPrice: '2500000.00', quantity: 1 }]
    });
    const second = buildEvidence({
      ...base,
      items: [{ productId: 'a', unitPrice: '1250000.00', quantity: 2 }]
    });

    expect(first.evidenceHash).not.toBe(second.evidenceHash);
  });
});
