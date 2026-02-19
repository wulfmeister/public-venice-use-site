import { describe, it, expect } from 'vitest';
import { generateScopedId } from '../id-generator';

describe('generateScopedId', () => {
  it('generates an ID with the given prefix', () => {
    const id = generateScopedId('msg');
    expect(id).toMatch(/^msg_/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateScopedId('test')));
    expect(ids.size).toBe(100);
  });

  it('supports different prefixes', () => {
    expect(generateScopedId('conv')).toMatch(/^conv_/);
    expect(generateScopedId('img')).toMatch(/^img_/);
  });
});
