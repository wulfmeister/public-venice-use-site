import { describe, it, expect } from 'vitest';
import {
  isValidUrl,
  isValidZip,
  isValidDataUrl,
  isValidRole,
  isValidWebSearchMode,
  isPositiveInteger,
  isNonEmptyString
} from '../validation';

describe('isValidUrl', () => {
  it('returns true for valid http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('returns true for valid https URLs', () => {
    expect(isValidUrl('https://example.com/path?q=1')).toBe(true);
  });

  it('returns false for ftp URLs', () => {
    expect(isValidUrl('ftp://files.example.com')).toBe(false);
  });

  it('returns false for null/undefined/empty', () => {
    expect(isValidUrl(null)).toBe(false);
    expect(isValidUrl(undefined)).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });

  it('returns false for plain text', () => {
    expect(isValidUrl('not a url')).toBe(false);
  });
});

describe('isValidZip', () => {
  it('returns true for 5-digit zip', () => {
    expect(isValidZip('12345')).toBe(true);
  });

  it('returns true for zip+4 format', () => {
    expect(isValidZip('12345-6789')).toBe(true);
  });

  it('returns false for invalid formats', () => {
    expect(isValidZip('1234')).toBe(false);
    expect(isValidZip('abcde')).toBe(false);
    expect(isValidZip('123456')).toBe(false);
    expect(isValidZip('12345-67')).toBe(false);
  });

  it('trims whitespace', () => {
    expect(isValidZip(' 12345 ')).toBe(true);
  });
});

describe('isValidDataUrl', () => {
  it('returns true for matching mime types', () => {
    expect(isValidDataUrl('data:image/png;base64,abc', ['image/png', 'image/jpeg'])).toBe(true);
  });

  it('returns false for non-matching mime types', () => {
    expect(isValidDataUrl('data:image/gif;base64,abc', ['image/png', 'image/jpeg'])).toBe(false);
  });

  it('returns false for non-data-url strings', () => {
    expect(isValidDataUrl('not-a-data-url', ['image/png'])).toBe(false);
  });
});

describe('isValidRole', () => {
  it('returns true for valid roles', () => {
    expect(isValidRole('user')).toBe(true);
    expect(isValidRole('assistant')).toBe(true);
    expect(isValidRole('system')).toBe(true);
  });

  it('returns false for invalid roles', () => {
    expect(isValidRole('admin')).toBe(false);
    expect(isValidRole('')).toBe(false);
  });
});

describe('isValidWebSearchMode', () => {
  it('returns true for valid modes', () => {
    expect(isValidWebSearchMode('auto')).toBe(true);
    expect(isValidWebSearchMode('on')).toBe(true);
    expect(isValidWebSearchMode('off')).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(isValidWebSearchMode(undefined)).toBe(true);
  });

  it('returns false for invalid modes', () => {
    expect(isValidWebSearchMode('maybe')).toBe(false);
    expect(isValidWebSearchMode('')).toBe(false);
  });
});

describe('isPositiveInteger', () => {
  it('returns true for positive integers', () => {
    expect(isPositiveInteger(1)).toBe(true);
    expect(isPositiveInteger(100)).toBe(true);
  });

  it('returns false for zero, negatives, floats, non-numbers', () => {
    expect(isPositiveInteger(0)).toBe(false);
    expect(isPositiveInteger(-1)).toBe(false);
    expect(isPositiveInteger(1.5)).toBe(false);
    expect(isPositiveInteger('1')).toBe(false);
    expect(isPositiveInteger(null)).toBe(false);
  });
});

describe('isNonEmptyString', () => {
  it('returns true for non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
  });

  it('returns false for empty/whitespace strings', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false);
  });

  it('returns false for non-strings', () => {
    expect(isNonEmptyString(123)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
  });
});
