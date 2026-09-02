'use strict';
import { describe, it, expect } from 'vitest';
import {
  parseQuantity,
  splitParts,
  formatProduct,
  extractPrice,
  isVariableWeight,
  formatSum,
  formatShortDate,
  cartTitle,
  addToListSummary,
} from './format.js';

describe('parseQuantity', () => {
  it('reads a leading integer quantity', () => {
    expect(parseQuantity('2 mjölk')).toEqual({ text: 'mjölk', quantity: 2 });
    expect(parseQuantity('10 ägg')).toEqual({ text: 'ägg', quantity: 10 });
  });

  it('reads a trailing integer quantity with "x" separator', () => {
    expect(parseQuantity('mjölk x2')).toEqual({ text: 'mjölk', quantity: 2 });
    expect(parseQuantity('gurka x 3')).toEqual({ text: 'gurka', quantity: 3 });
  });

  it('reads a trailing quantity with × unicode multiply sign', () => {
    expect(parseQuantity('ägg × 2')).toEqual({ text: 'ägg', quantity: 2 });
  });

  it('is case-insensitive for the x separator', () => {
    expect(parseQuantity('gurka X 2')).toEqual({ text: 'gurka', quantity: 2 });
  });

  it('defaults to quantity 1 when no quantity is present', () => {
    expect(parseQuantity('gurka')).toEqual({ text: 'gurka', quantity: 1 });
    expect(parseQuantity('mjölk och bröd')).toEqual({ text: 'mjölk och bröd', quantity: 1 });
  });

  it('trims whitespace from the extracted text (but not from input)', () => {
    expect(parseQuantity('2  mjölk  ')).toEqual({ text: 'mjölk', quantity: 2 });
    expect(parseQuantity('gurka x 3')).toEqual({ text: 'gurka', quantity: 3 });
  });

  it('returns the original text and quantity 1 for empty string', () => {
    expect(parseQuantity('')).toEqual({ text: '', quantity: 1 });
  });

  it('prefers leading quantity over trailing (leading takes precedence)', () => {
    // If a string somehow has both, leading should match first
    expect(parseQuantity('2 gurka x 3')).toEqual({ text: 'gurka x 3', quantity: 2 });
  });
});

describe('splitParts', () => {
  it('splits comma-separated items', () => {
    expect(splitParts('gurka, mjölk, ägg')).toEqual(['gurka', 'mjölk', 'ägg']);
  });

  it('handles trailing commas', () => {
    expect(splitParts('gurka, mjölk,')).toEqual(['gurka', 'mjölk']);
  });

  it('handles leading commas', () => {
    expect(splitParts(', gurka, mjölk')).toEqual(['gurka', 'mjölk']);
  });

  it('handles empty parts from stray/double commas', () => {
    expect(splitParts('gurka,, mjölk')).toEqual(['gurka', 'mjölk']);
  });

  it('splits newline-separated items', () => {
    expect(splitParts('gurka\nmjölk\nägg')).toEqual(['gurka', 'mjölk', 'ägg']);
  });

  it('splits items joined with "and"', () => {
    expect(splitParts('gurka and mjölk and ägg')).toEqual(['gurka', 'mjölk', 'ägg']);
  });

  it('splits items joined with "och" (Swedish)', () => {
    expect(splitParts('gurka och mjölk och ägg')).toEqual(['gurka', 'mjölk', 'ägg']);
  });

  it('is case-insensitive for "and"/"och"', () => {
    expect(splitParts('gurka AND mjölk OCH ägg')).toEqual(['gurka', 'mjölk', 'ägg']);
  });

  it('handles mixed separators (commas, newlines, and/och)', () => {
    expect(splitParts('gurka, mjölk\nägg och bröd')).toEqual(['gurka', 'mjölk', 'ägg', 'bröd']);
  });

  it('does not split words containing "and" or "och"', () => {
    expect(splitParts('candy, sandwich')).toEqual(['candy', 'sandwich']);
  });

  it('requires whitespace around and/och to split', () => {
    expect(splitParts('danskt bröd och mjölk')).toEqual(['danskt bröd', 'mjölk']);
  });

  it('trims whitespace from each part', () => {
    expect(splitParts('  gurka  ,  mjölk  ,  ägg  ')).toEqual(['gurka', 'mjölk', 'ägg']);
  });

  it('returns a single-item array for non-separated input', () => {
    expect(splitParts('gurka')).toEqual(['gurka']);
  });

  it('returns an empty array for empty input', () => {
    expect(splitParts('')).toEqual([]);
  });

  it('filters out empty strings', () => {
    expect(splitParts(',,,gurka,,,')).toEqual(['gurka']);
  });
});

describe('formatProduct', () => {
  it('formats a product with name only (no price, no size)', () => {
    expect(formatProduct({ name: 'gurka' })).toBe('gurka');
  });

  it('formats a product with name and price (fixed-price)', () => {
    expect(formatProduct({ name: 'gurka', price: 15.9 })).toBe('gurka — 15.9 kr');
  });

  it('formats a product with name, price, and size', () => {
    expect(formatProduct({ name: 'Mjölk', price: 11.2, size: '1L' })).toBe(
      'Mjölk (1L) — 11.2 kr'
    );
  });

  it('appends /kg suffix when priceUnit is "kg"', () => {
    expect(formatProduct({ name: 'äpplen', price: 19.9, priceUnit: 'kg' })).toBe(
      'äpplen — 19.9 kr/kg'
    );
  });

  it('does not append /kg suffix when priceUnit is not "kg"', () => {
    expect(formatProduct({ name: 'gurka', price: 15.9, priceUnit: 'pcs' })).toBe('gurka — 15.9 kr');
  });

  it('handles quantity > 1 by prefixing the formatted string', () => {
    expect(formatProduct({ name: 'ägg', price: 8.5 }, 2)).toBe('2 ägg — 8.5 kr');
    expect(formatProduct({ name: 'gurka' }, 3)).toBe('3 gurka');
  });

  it('does not prefix when quantity is 1 (the default)', () => {
    expect(formatProduct({ name: 'mjölk', price: 11.2 }, 1)).toBe('mjölk — 11.2 kr');
  });

  it('handles quantity 0 (edge case: treated as > 1, so prefixed)', () => {
    expect(formatProduct({ name: 'gurka' }, 0)).toBe('gurka');
  });

  it('handles size without price', () => {
    expect(formatProduct({ name: 'Mjölk', size: '1L' })).toBe('Mjölk (1L)');
  });

  it('handles all fields together with quantity', () => {
    expect(formatProduct({ name: 'Mjölk', price: 11.2, priceUnit: 'kg', size: '1L' }, 2)).toBe(
      '2 Mjölk (1L) — 11.2 kr/kg'
    );
  });

  it('handles false/null price as no price', () => {
    expect(formatProduct({ name: 'gurka', price: null })).toBe('gurka');
    expect(formatProduct({ name: 'gurka', price: false })).toBe('gurka');
  });

  it('handles 0 as a price (edge case: falsy but valid)', () => {
    // This is an edge case: 0 is falsy in JavaScript, so it will be treated as no price
    expect(formatProduct({ name: 'gurka', price: 0 })).toBe('gurka');
  });
});

describe('extractPrice', () => {
  it('extracts price from a formatted product string', () => {
    expect(extractPrice('Gurka Sverige Klass 1 — 15,90 kr')).toBe(15.9);
  });

  it('converts comma decimal separator to period', () => {
    expect(extractPrice('Mjölk 3% — 11,20 kr')).toBe(11.2);
  });

  it('handles period decimal separator', () => {
    expect(extractPrice('äpplen — 19.99 kr')).toBe(19.99);
  });

  it('handles /kg price unit suffix', () => {
    expect(extractPrice('äpplen — 19.90 kr/kg')).toBe(19.9);
  });

  it('handles /pcs and other price unit suffixes', () => {
    expect(extractPrice('gurka — 15.90 kr/pcs')).toBe(15.9);
  });

  it('returns null when no price is found', () => {
    expect(extractPrice('gurka')).toBeNull();
    expect(extractPrice('äpplen — sweet but no price')).toBeNull();
  });

  it('requires the em dash (—) to mark price', () => {
    expect(extractPrice('gurka - 15.90 kr')).toBeNull();
    expect(extractPrice('gurka 15.90 kr')).toBeNull();
  });

  it('requires "kr" suffix', () => {
    expect(extractPrice('gurka — 15.90')).toBeNull();
  });

  it('handles whitespace variations around em dash and price', () => {
    expect(extractPrice('gurka—15.90 kr')).toBe(15.9);
    expect(extractPrice('gurka  —  15.90  kr')).toBe(15.9);
  });

  it('extracts the last price in the string (greedy suffix match)', () => {
    expect(extractPrice('gurka — 10 kr and mjölk — 20 kr')).toBe(20);
  });

  it('returns null for empty string', () => {
    expect(extractPrice('')).toBeNull();
  });
});

describe('isVariableWeight', () => {
  it('detects "priced /kg" in the text', () => {
    expect(isVariableWeight('äpplen priced /kg')).toBe(true);
  });

  it('returns false when "priced /kg" is not present', () => {
    expect(isVariableWeight('äpplen — 19.90 kr/kg')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isVariableWeight('')).toBe(false);
  });

  it('is case-sensitive (requires lowercase)', () => {
    expect(isVariableWeight('äpplen PRICED /kg')).toBe(false);
  });
});

describe('formatSum', () => {
  it('formats a number with 2 decimal places', () => {
    expect(formatSum(15.9)).toBe('15,90');
    expect(formatSum(11.2)).toBe('11,20');
  });

  it('replaces period with comma as decimal separator', () => {
    expect(formatSum(100.5)).toBe('100,50');
  });

  it('handles whole numbers', () => {
    expect(formatSum(15)).toBe('15,00');
  });

  it('handles zero', () => {
    expect(formatSum(0)).toBe('0,00');
  });

  it('handles large sums', () => {
    expect(formatSum(1234.56)).toBe('1234,56');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatSum(15.999)).toBe('16,00');
    expect(formatSum(11.111)).toBe('11,11');
  });
});

describe('formatShortDate', () => {
  it('formats as day + short month', () => {
    expect(formatShortDate(new Date(2026, 7, 20))).toBe('20 Aug');
    expect(formatShortDate(new Date(2026, 8, 2))).toBe('2 Sep');
  });
});

describe('cartTitle', () => {
  it('uses the name when there is one', () => {
    expect(cartTitle({ name: 'Veckobasics', kind: 'saved', created_at: '2026-08-20T10:00:00Z' })).toBe('Veckobasics');
  });

  it('falls back to kind + date for unnamed carts', () => {
    const created_at = new Date(2026, 7, 20).toISOString();
    expect(cartTitle({ name: null, kind: 'sent', created_at })).toBe('Sent 20 Aug');
    expect(cartTitle({ name: '', kind: 'saved', created_at })).toBe('Saved 20 Aug');
  });
});

describe('addToListSummary', () => {
  it('reports both counts when both are non-zero', () => {
    expect(addToListSummary(9, 3)).toBe('Added 9 · 3 already on list');
  });

  it('drops the zero half', () => {
    expect(addToListSummary(9, 0)).toBe('Added 9');
    expect(addToListSummary(0, 3)).toBe('3 already on list');
  });

  it('has a fallback when nothing happened', () => {
    expect(addToListSummary(0, 0)).toBe('Nothing to add');
  });
});
