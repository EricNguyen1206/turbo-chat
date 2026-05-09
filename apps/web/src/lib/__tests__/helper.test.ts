import { describe, it, expect } from 'vitest';
import { censorPassword, getSummaryName, formatDateStr } from '../helper';

describe('censorPassword', () => {
  it('should return the same value for empty string', () => {
    expect(censorPassword('')).toBe('');
  });

  it('should mask approximately 70% of characters', () => {
    const password = 'abcdefghij'; // 10 chars, 70% = 7 masked
    const result = censorPassword(password);

    const maskedCount = result.split('').filter((c) => c === '*').length;
    expect(maskedCount).toBe(7);
    expect(result.length).toBe(password.length);
  });

  it('should preserve some original characters', () => {
    const password = 'abcdefghij';
    const result = censorPassword(password);

    // At least some characters should remain from the original
    const originalChars = result
      .split('')
      .filter((c) => c !== '*');
    expect(originalChars.length).toBeGreaterThan(0);
  });

  it('should contain only asterisks and original characters', () => {
    const password = 'test1234';
    const result = censorPassword(password);

    const validChars = new Set([...password, '*']);
    result.split('').forEach((char) => {
      expect(validChars.has(char)).toBe(true);
    });
  });

  it('should handle a single character password', () => {
    const result = censorPassword('a');
    // 70% of 1 = 0, so nothing gets censored
    expect(result).toBe('a');
  });

  it('should return the input unchanged for falsy values', () => {
    expect(censorPassword('')).toBe('');
  });
});

describe('getSummaryName', () => {
  it('should return first character for a single-word name', () => {
    expect(getSummaryName('Kyle')).toBe('K');
  });

  it('should return first character of last name for a two-word name', () => {
    expect(getSummaryName('Minh Tri')).toBe('T');
  });

  it('should return first character of last name for a multi-word name', () => {
    expect(getSummaryName('John Michael Smith')).toBe('S');
  });

  it('should handle a single character name', () => {
    expect(getSummaryName('A')).toBe('A');
  });

  it('should be case-sensitive and return exact character', () => {
    expect(getSummaryName('alice')).toBe('a');
  });

  it('should handle trailing spaces gracefully', () => {
    // "John " splits to ["John", ""] so isSpaceName is "" which is !== undefined
    // Last element "" has charAt(0) which is '', fallback to ''
    const result = getSummaryName('John ');
    expect(result).toBe('');
  });
});

describe('formatDateStr', () => {
  it('should format a valid ISO date string', () => {
    // Use a date that is unambiguous across locales
    const result = formatDateStr('2024-06-15T14:30:00.000Z');

    // The result should contain a date portion and a time portion separated by a space
    const parts = result.split(' ');
    expect(parts.length).toBeGreaterThanOrEqual(2);

    // Date portion should be MM/DD/YYYY format
    expect(parts[0]).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('should produce a string containing both date and time', () => {
    const result = formatDateStr('2024-01-01T00:00:00.000Z');
    // Should have a space separating date and time
    expect(result).toContain(' ');
  });

  it('should format the date portion as MM/DD/YYYY', () => {
    const result = formatDateStr('2024-12-25T10:00:00.000Z');
    const datePart = result.split(' ')[0];
    expect(datePart).toContain('/');
    expect(datePart.length).toBe(10); // MM/DD/YYYY
  });

  it('should format the time portion with AM/PM', () => {
    const result = formatDateStr('2024-06-15T14:30:00.000Z');
    // Time should include AM or PM
    expect(result).toMatch(/\d+:\d+\s*(AM|PM)/i);
  });

  it('should handle midnight correctly', () => {
    const result = formatDateStr('2024-06-15T00:00:00.000Z');
    // Result depends on local timezone, just verify format is valid
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} \d+:\d+\s*(AM|PM)/i);
  });
});
