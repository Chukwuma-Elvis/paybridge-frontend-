import { describe, it, expect } from 'vitest';
import { formatMoney, parseMoney, minorToDecimal, verifyLedgerProof } from '../src/utils/money';

describe('Money and Units Utility', () => {
  describe('formatMoney', () => {
    it('formats NGN minor units correctly', () => {
      expect(formatMoney(0, 'NGN')).toBe('₦0.00');
      expect(formatMoney(1, 'NGN')).toBe('₦0.01');
      expect(formatMoney(10, 'NGN')).toBe('₦0.10');
      expect(formatMoney(100, 'NGN')).toBe('₦1.00');
      expect(formatMoney(150000, 'NGN')).toBe('₦1,500.00');
      expect(formatMoney(100000050, 'NGN')).toBe('₦1,000,000.50');
    });

    it('formats USD minor units correctly', () => {
      expect(formatMoney(2500, 'USD')).toBe('$25.00');
      expect(formatMoney(99, 'USD')).toBe('$0.99');
    });

    it('formats negative balances correctly for ledger reversals or deductions', () => {
      expect(formatMoney(-5000, 'NGN')).toBe('-₦50.00');
      expect(formatMoney(-1, 'USD')).toBe('-$0.01');
    });
  });

  describe('minorToDecimal', () => {
    it('converts minor units to exact string representation without currency symbol', () => {
      expect(minorToDecimal(150050, 'NGN')).toBe('1500.50');
      expect(minorToDecimal(5, 'USD')).toBe('0.05');
      expect(minorToDecimal(0, 'NGN')).toBe('0.00');
    });
  });

  describe('parseMoney', () => {
    it('parses valid inputs into integer minor units', () => {
      expect(parseMoney('100', 'NGN')).toBe(10000);
      expect(parseMoney('1,000.50', 'NGN')).toBe(100050);
      expect(parseMoney('0.01', 'NGN')).toBe(1);
      expect(parseMoney('0.1', 'NGN')).toBe(10);
      expect(parseMoney('250.00', 'USD')).toBe(25000);
    });

    it('rejects invalid, negative or over-precise amounts', () => {
      expect(() => parseMoney('', 'NGN')).toThrow('Amount is required');
      expect(() => parseMoney('abc', 'NGN')).toThrow('Please enter a valid positive number');
      expect(() => parseMoney('-50', 'NGN')).toThrow('Please enter a valid positive number');
      expect(() => parseMoney('10.999', 'NGN')).toThrow('Amount cannot have more than 2 decimal places for NGN');
    });
  });

  describe('verifyLedgerProof', () => {
    it('confirms a balanced double-entry set sums to zero per currency', () => {
      const entries = [
        { amountMinor: 50000, currency: 'NGN' },
        { amountMinor: -50000, currency: 'NGN' },
        { amountMinor: 1000, currency: 'USD' },
        { amountMinor: -1000, currency: 'USD' }
      ];
      const proof = verifyLedgerProof(entries);
      expect(proof.isBalanced).toBe(true);
      expect(proof.totalsByCurrency['NGN']).toBe(0n);
      expect(proof.totalsByCurrency['USD']).toBe(0n);
    });

    it('flags unbalanced ledger sets', () => {
      const entries = [
        { amountMinor: 50000, currency: 'NGN' },
        { amountMinor: -40000, currency: 'NGN' }
      ];
      const proof = verifyLedgerProof(entries);
      expect(proof.isBalanced).toBe(false);
      expect(proof.totalsByCurrency['NGN']).toBe(10000n);
    });
  });
});
