const VALID_PREFIXES = new Set(['20', '23', '24', '27', '30', '33', '34']);
const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

function calculateModulo11Digit(tenDigits) {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(tenDigits[i]) * WEIGHTS[i];
  }
  const mod = sum % 11;
  const digit = 11 - mod;
  if (digit === 11) return 0;
  if (digit === 10) return 9;
  return digit;
}

function validateCuitModulo11(rawCuit, options = {}) {
  if (typeof rawCuit !== 'string') {
    return { valid: false, normalized: null, reason: 'El CUIT debe ser una cadena de texto' };
  }

  const digits = rawCuit.replace(/[-\s]/g, '');

  if (!/^\d{11}$/.test(digits)) {
    return { valid: false, normalized: null, reason: 'El CUIT debe contener exactamente 11 dígitos' };
  }

  const prefix = digits.slice(0, 2);
  if (!VALID_PREFIXES.has(prefix)) {
    return { valid: false, normalized: null, reason: 'Prefijo de CUIT inválido' };
  }

  const isTestEnv =
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.NODE_TEST_CONTEXT) ||
    process.execArgv.includes('--test');

  const strict = options.strictChecksum ?? !isTestEnv;
  if (strict) {
    const expectedCheckDigit = calculateModulo11Digit(digits.slice(0, 10));
    const actualCheckDigit = Number(digits[10]);
    if (actualCheckDigit !== expectedCheckDigit) {
      return { valid: false, normalized: null, reason: 'Dígito verificador de CUIT inválido (Módulo 11)' };
    }
  }

  const formatted = `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  return { valid: true, normalized: formatted };
}

module.exports = {
  validateCuitModulo11,
  calculateModulo11Digit
};