/**
 * Money and units utility module.
 * Source: .claude/skills/money-and-units/SKILL.md and plan invariant 6.
 *
 * Rules:
 * 1. Integers only. All money amounts travel and are stored in minor units (e.g. cents, kobo).
 * 2. Format at the edge. Never use floating-point arithmetic for balances, rates, or sums.
 * 3. Strict parsing. Rejects multiple decimals, invalid characters, and excess decimal precision.
 * 4. The server is the authority: fee and rate math is never re-calculated on client.
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  decimals: number;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  NGN: { code: 'NGN', symbol: '₦', decimals: 2 },
  USD: { code: 'USD', symbol: '$', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', decimals: 2 },
};

/**
 * Formats minor units (e.g. 150000 kobo) into a human-readable string (e.g. "₦1,500.00").
 */
export function formatMoney(amountMinor: number | bigint, currency = 'NGN'): string {
  const conf = CURRENCIES[currency.toUpperCase()] || { code: currency, symbol: currency + ' ', decimals: 2 };
  const minor = BigInt(amountMinor);
  const isNegative = minor < 0n;
  const absMinor = isNegative ? -minor : minor;

  const factor = 10n ** BigInt(conf.decimals);
  const whole = absMinor / factor;
  const fraction = absMinor % factor;

  const wholeStr = whole.toLocaleString('en-US');
  const fractionStr = fraction.toString().padStart(conf.decimals, '0');

  const formatted = `${conf.symbol}${wholeStr}.${fractionStr}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Converts minor units to raw decimal string without symbol, suitable for inputs or copying.
 */
export function minorToDecimal(amountMinor: number | bigint, currency = 'NGN'): string {
  const conf = CURRENCIES[currency.toUpperCase()] || { code: currency, symbol: '', decimals: 2 };
  const minor = BigInt(amountMinor);
  const isNegative = minor < 0n;
  const absMinor = isNegative ? -minor : minor;

  const factor = 10n ** BigInt(conf.decimals);
  const whole = absMinor / factor;
  const fraction = absMinor % factor;

  const fractionStr = fraction.toString().padStart(conf.decimals, '0');
  const result = `${whole.toString()}.${fractionStr}`;
  return isNegative ? `-${result}` : result;
}

/**
 * Parses user string input (e.g. "1,500.50" or "250") strictly into minor units (integer).
 * Throws an Error with a field-level explanation on invalid input.
 */
export function parseMoney(input: string, currency = 'NGN'): number {
  if (!input || !input.trim()) {
    throw new Error('Amount is required');
  }

  const conf = CURRENCIES[currency.toUpperCase()] || { code: currency, symbol: '', decimals: 2 };
  const clean = input.trim().replace(/,/g, '');

  if (!/^\d+(\.\d+)?$/.test(clean)) {
    throw new Error('Please enter a valid positive number');
  }

  const parts = clean.split('.');
  const wholePart = parts[0];
  const decimalPart = parts[1] || '';

  if (decimalPart.length > conf.decimals) {
    throw new Error(`Amount cannot have more than ${conf.decimals} decimal places for ${currency}`);
  }

  const paddedDecimal = decimalPart.padEnd(conf.decimals, '0');
  const totalMinorStr = wholePart + paddedDecimal;

  const minor = Number(totalMinorStr);
  if (!Number.isSafeInteger(minor)) {
    throw new Error('Amount exceeds maximum allowable limit');
  }

  return minor;
}

/**
 * Validates whether ledger lines per currency sum to exactly zero.
 * Returns true if balanced, false if unbalanced, with per-currency net minor totals.
 */
export function verifyLedgerProof(entries: Array<{ amountMinor: number | bigint; currency: string }>): {
  isBalanced: boolean;
  totalsByCurrency: Record<string, bigint>;
} {
  const totals: Record<string, bigint> = {};

  for (const entry of entries) {
    const curr = entry.currency.toUpperCase();
    const current = totals[curr] || 0n;
    totals[curr] = current + BigInt(entry.amountMinor);
  }

  let isBalanced = true;
  for (const curr in totals) {
    if (totals[curr] !== 0n) {
      isBalanced = false;
      break;
    }
  }

  return { isBalanced, totalsByCurrency: totals };
}
