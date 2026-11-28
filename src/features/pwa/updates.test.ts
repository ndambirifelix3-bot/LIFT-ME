import { describe, expect, it } from '@jest/globals';
import { isStaleCodeError } from './updates';

describe('isStaleCodeError', () => {
  it('spots missing-file errors from an old app version', () => {
    expect(isStaleCodeError(new Error('Loading chunk 12 failed.'))).toBe(true);
    expect(isStaleCodeError(new SyntaxError("Unexpected token '<'"))).toBe(true);
    expect(isStaleCodeError(new TypeError('Failed to fetch dynamically imported module: https://x/a.js'))).toBe(true);
  });
  it('ignores ordinary errors', () => {
    expect(isStaleCodeError(new Error('quote_expired'))).toBe(false);
    expect(isStaleCodeError(undefined)).toBe(false);
  });
});
