/**
 * Tests for logger utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger } from '../../../src/utils/logger.js';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have required log methods', () => {
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('should accept message parameter', () => {
    expect(() => logger.info('Test message')).not.toThrow();
  });

  it('should accept additional parameters', () => {
    expect(() => logger.info('Test', { key: 'value' })).not.toThrow();
    expect(() => logger.error('Error', new Error('test'))).not.toThrow();
  });

  it('should handle error objects', () => {
    const error = new Error('Test error');
    expect(() => logger.error('Error occurred:', error)).not.toThrow();
  });

  it('should handle undefined and null', () => {
    expect(() => logger.info('Test', undefined)).not.toThrow();
    expect(() => logger.info('Test', null)).not.toThrow();
  });
});
