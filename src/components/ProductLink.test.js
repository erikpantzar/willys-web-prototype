'use strict';
import { describe, it, expect } from 'vitest';
import { productUrl, productLinkHtml } from './ProductLink.js';

describe('productUrl', () => {
  it('prefixes a site-relative product path with the willys.se origin', () => {
    expect(productUrl('/produkt/Mjolk-Langre-Hallbarhet-3procent-101233931_ST')).toBe(
      'https://www.willys.se/produkt/Mjolk-Langre-Hallbarhet-3procent-101233931_ST'
    );
  });

  it('returns null for null, undefined and empty values', () => {
    expect(productUrl(null)).toBeNull();
    expect(productUrl(undefined)).toBeNull();
    expect(productUrl('')).toBeNull();
  });

  it('only builds a link for paths that start with a slash', () => {
    expect(productUrl('produkt/x')).toBeNull();
    expect(productUrl('https://evil.example/x')).toBeNull();
    expect(productUrl(42)).toBeNull();
  });
});

describe('productLinkHtml', () => {
  it('renders nothing without a usable path', () => {
    expect(productLinkHtml(null)).toBe('');
    expect(productLinkHtml('nope')).toBe('');
  });

  it('renders a new-tab anchor with an accessible label', () => {
    const html = productLinkHtml('/produkt/Gurka-123_ST', { label: 'Gurka' });
    expect(html).toContain('href="https://www.willys.se/produkt/Gurka-123_ST"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('aria-label="Open Gurka on willys.se"');
  });

  it('escapes the label', () => {
    expect(productLinkHtml('/p/x', { label: 'a"b' })).toContain('aria-label="Open a&quot;b on willys.se"');
  });
});
