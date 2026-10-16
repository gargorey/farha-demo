import { describe, expect, it } from 'vitest';
import { formatSaudiMobile, normalizeSaudiMobile } from './phone';

describe('Saudi mobile numbers', () => {
  it.each(['0551234567', '551234567', '+966551234567', '00966551234567', '+966 55 123 4567', '٠٥٥١٢٣٤٥٦٧'])('normalizes %s', (input) => {
    expect(normalizeSaudiMobile(input)).toBe('+966551234567');
  });
  it.each(['0451234567', '12345', '+971551234567', '05512345678', ''])('rejects %s', (input) => {
    expect(normalizeSaudiMobile(input)).toBeNull();
  });
  it('formats for display', () => {
    expect(formatSaudiMobile('+966551234567')).toBe('+966 55 123 4567');
  });
});
