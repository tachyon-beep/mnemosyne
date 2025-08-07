/**
 * Enhanced Validation Utilities Tests
 * 
 * Tests for comprehensive input validation with business rules,
 * resource protection, and user-friendly error messages.
 */

import { 
  validateDateRange, 
  validateConversationId,
  validateConversationIds,
  validatePagination,
  validateFrequency,
  validateStringArray,
  validateGranularity,
  ValidationError,
  formatValidationError,
  withEnhancedValidation,
  RESOURCE_LIMITS
} from '../../../src/utils/validation.js';

describe('Enhanced Validation Utils', () => {
  describe('validateDateRange', () => {
    it('should validate valid date range', () => {
      const result = validateDateRange('2024-01-01T00:00:00.000Z', '2024-01-31T23:59:59.999Z');
      
      expect(result.start).toBe(new Date('2024-01-01T00:00:00.000Z').getTime());
      expect(result.end).toBe(new Date('2024-01-31T23:59:59.999Z').getTime());
    });

    it('should use defaults when dates not provided', () => {
      const now = Date.now();
      const result = validateDateRange();
      
      expect(result.end).toBeCloseTo(now, -3); // Within 1000ms
      expect(result.start).toBeCloseTo(now - (30 * 24 * 60 * 60 * 1000), -3); // 30 days ago
    });

    it('should reject invalid date format', () => {
      expect(() => {
        validateDateRange('invalid-date', '2024-01-31T00:00:00.000Z');
      }).toThrow(ValidationError);
      
      try {
        validateDateRange('invalid-date', '2024-01-31T00:00:00.000Z');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe('INVALID_DATE_FORMAT');
        expect((error as ValidationError).field).toBe('startDate');
        expect((error as ValidationError).userMessage).toContain('ISO 8601 format');
        expect((error as ValidationError).suggestions).toContain('Use format like "2024-01-15T00:00:00.000Z"');
      }
    });

    it('should reject start date after end date', () => {
      expect(() => {
        validateDateRange('2024-02-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
      }).toThrow(ValidationError);
      
      try {
        validateDateRange('2024-02-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
      } catch (error) {
        expect((error as ValidationError).code).toBe('INVALID_DATE_ORDER');
        expect((error as ValidationError).userMessage).toContain('Start date must be before end date');
      }
    });

    it('should reject time range exceeding maximum days', () => {
      const start = '2023-01-01T00:00:00.000Z';
      const end = '2024-12-31T00:00:00.000Z'; // ~730 days
      
      expect(() => {
        validateDateRange(start, end, '', { maxDays: 365 });
      }).toThrow(ValidationError);
      
      try {
        validateDateRange(start, end, '', { maxDays: 365 });
      } catch (error) {
        expect((error as ValidationError).code).toBe('TIME_RANGE_TOO_LARGE');
        expect((error as ValidationError).userMessage).toContain('cannot exceed 365 days');
      }
    });

    it('should reject future dates when not allowed', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
      
      expect(() => {
        validateDateRange(undefined, futureDate, '', { allowFuture: false });
      }).toThrow(ValidationError);
      
      try {
        validateDateRange(undefined, futureDate, '', { allowFuture: false });
      } catch (error) {
        expect((error as ValidationError).code).toBe('FUTURE_DATE_NOT_ALLOWED');
      }
    });

    it('should reject time range too small', () => {
      const start = '2024-01-01T00:00:00.000Z';
      const end = '2024-01-01T00:30:00.000Z'; // 30 minutes
      
      expect(() => {
        validateDateRange(start, end);
      }).toThrow(ValidationError);
      
      try {
        validateDateRange(start, end);
      } catch (error) {
        expect((error as ValidationError).code).toBe('TIME_RANGE_TOO_SMALL');
        expect((error as ValidationError).userMessage).toContain('at least 1 hour');
      }
    });
  });

  describe('validateConversationId', () => {
    it('should validate valid UUID', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = validateConversationId(validUuid);
      expect(result).toBe(validUuid);
    });

    it('should validate valid secure ID', () => {
      const validId = 'abc123_def-456';
      const result = validateConversationId(validId);
      expect(result).toBe(validId);
    });

    it('should reject ID that is too short', () => {
      expect(() => {
        validateConversationId('abc123');
      }).toThrow(ValidationError);
      
      try {
        validateConversationId('abc123');
      } catch (error) {
        expect((error as ValidationError).code).toBe('ID_TOO_SHORT');
        expect((error as ValidationError).userMessage).toContain('at least 8 characters');
      }
    });

    it('should reject ID with invalid characters', () => {
      expect(() => {
        validateConversationId('invalid@id#here');
      }).toThrow(ValidationError);
      
      try {
        validateConversationId('invalid@id#here');
      } catch (error) {
        expect((error as ValidationError).code).toBe('INVALID_ID_FORMAT');
        expect((error as ValidationError).userMessage).toContain('letters, numbers, hyphens, and underscores');
      }
    });

    it('should handle optional validation correctly', () => {
      const result = validateConversationId('', 'conversationId', false);
      expect(result).toBe('');
    });

    it('should require ID when marked as required', () => {
      expect(() => {
        validateConversationId('', 'conversationId', true);
      }).toThrow(ValidationError);
      
      try {
        validateConversationId('', 'conversationId', true);
      } catch (error) {
        expect((error as ValidationError).code).toBe('REQUIRED_FIELD');
      }
    });
  });

  describe('validateConversationIds', () => {
    it('should validate valid array of conversation IDs', () => {
      const ids = ['123e4567-e89b-12d3-a456-426614174000', 'abc123_def-456'];
      const result = validateConversationIds(ids);
      expect(result).toEqual(ids);
    });

    it('should reject array exceeding maximum count', () => {
      const ids = new Array(101).fill(0).map((_, i) => `conversation-id-${i.toString().padStart(3, '0')}`);
      
      expect(() => {
        validateConversationIds(ids, 'conversationIds', 100);
      }).toThrow(ValidationError);
      
      try {
        validateConversationIds(ids, 'conversationIds', 100);
      } catch (error) {
        expect((error as ValidationError).code).toBe('ARRAY_TOO_LARGE');
        expect((error as ValidationError).userMessage).toContain('100 conversation IDs');
      }
    });

    it('should reject empty array', () => {
      expect(() => {
        validateConversationIds([]);
      }).toThrow(ValidationError);
      
      try {
        validateConversationIds([]);
      } catch (error) {
        expect((error as ValidationError).code).toBe('EMPTY_ARRAY');
      }
    });

    it('should reject array with duplicates', () => {
      const ids = ['duplicate-id-12345678', 'duplicate-id-12345678'];
      
      expect(() => {
        validateConversationIds(ids);
      }).toThrow(ValidationError);
      
      try {
        validateConversationIds(ids);
      } catch (error) {
        expect((error as ValidationError).code).toBe('DUPLICATE_VALUES');
        expect((error as ValidationError).userMessage).toContain('duplicate values');
      }
    });

    it('should provide context for invalid ID in array', () => {
      const ids = ['valid-id-12345678', 'bad@id'];
      
      expect(() => {
        validateConversationIds(ids);
      }).toThrow(ValidationError);
      
      try {
        validateConversationIds(ids);
      } catch (error) {
        expect((error as ValidationError).field).toBe('conversationIds[1]');
        expect((error as ValidationError).userMessage).toContain('position 1');
      }
    });
  });

  describe('validatePagination', () => {
    it('should validate valid pagination parameters', () => {
      const result = validatePagination(10, 20);
      expect(result).toEqual({ limit: 10, offset: 20 });
    });

    it('should use defaults for undefined parameters', () => {
      const result = validatePagination();
      expect(result).toEqual({ limit: 20, offset: 0 });
    });

    it('should reject negative limit', () => {
      expect(() => {
        validatePagination(-1, 0);
      }).toThrow(ValidationError);
      
      try {
        validatePagination(-1, 0);
      } catch (error) {
        expect((error as ValidationError).code).toBe('INVALID_PAGINATION_LIMIT');
        expect((error as ValidationError).userMessage).toContain('positive integer');
      }
    });

    it('should reject limit exceeding maximum', () => {
      expect(() => {
        validatePagination(1001, 0, 1000);
      }).toThrow(ValidationError);
      
      try {
        validatePagination(1001, 0, 1000);
      } catch (error) {
        expect((error as ValidationError).code).toBe('LIMIT_TOO_LARGE');
        expect((error as ValidationError).userMessage).toContain('1000 items');
      }
    });

    it('should reject negative offset', () => {
      expect(() => {
        validatePagination(10, -1);
      }).toThrow(ValidationError);
      
      try {
        validatePagination(10, -1);
      } catch (error) {
        expect((error as ValidationError).code).toBe('INVALID_PAGINATION_OFFSET');
      }
    });
  });

  describe('validateFrequency', () => {
    it('should validate valid frequency', () => {
      const result = validateFrequency(5);
      expect(result).toBe(5);
    });

    it('should use default for undefined frequency', () => {
      const result = validateFrequency(undefined, 'minFrequency', 1, 100, 3);
      expect(result).toBe(3);
    });

    it('should reject non-integer frequency', () => {
      expect(() => {
        validateFrequency(3.14);
      }).toThrow(ValidationError);
      
      try {
        validateFrequency(3.14);
      } catch (error) {
        expect((error as ValidationError).code).toBe('INVALID_FREQUENCY_TYPE');
      }
    });

    it('should reject frequency below minimum', () => {
      expect(() => {
        validateFrequency(0, 'minFrequency', 1);
      }).toThrow(ValidationError);
      
      try {
        validateFrequency(0, 'minFrequency', 1);
      } catch (error) {
        expect((error as ValidationError).code).toBe('FREQUENCY_TOO_LOW');
      }
    });

    it('should reject frequency above maximum', () => {
      expect(() => {
        validateFrequency(101, 'minFrequency', 1, 100);
      }).toThrow(ValidationError);
      
      try {
        validateFrequency(101, 'minFrequency', 1, 100);
      } catch (error) {
        expect((error as ValidationError).code).toBe('FREQUENCY_TOO_HIGH');
      }
    });
  });

  describe('validateStringArray', () => {
    it('should validate valid string array', () => {
      const array = ['item1', 'item2', 'item3'];
      const result = validateStringArray(array, 'testArray');
      expect(result).toEqual(array);
    });

    it('should return undefined for undefined array', () => {
      const result = validateStringArray(undefined, 'testArray');
      expect(result).toBeUndefined();
    });

    it('should reject non-array input', () => {
      expect(() => {
        validateStringArray('not-an-array' as any, 'testArray');
      }).toThrow(ValidationError);
      
      try {
        validateStringArray('not-an-array' as any, 'testArray');
      } catch (error) {
        expect((error as ValidationError).code).toBe('INVALID_TYPE');
        expect((error as ValidationError).userMessage).toContain('array of strings');
      }
    });

    it('should reject empty array when not allowed', () => {
      expect(() => {
        validateStringArray([], 'testArray', { allowEmpty: false });
      }).toThrow(ValidationError);
      
      try {
        validateStringArray([], 'testArray', { allowEmpty: false });
      } catch (error) {
        expect((error as ValidationError).code).toBe('EMPTY_ARRAY');
      }
    });

    it('should reject array exceeding maximum length', () => {
      const longArray = new Array(11).fill('item');
      
      expect(() => {
        validateStringArray(longArray, 'testArray', { maxLength: 10 });
      }).toThrow(ValidationError);
      
      try {
        validateStringArray(longArray, 'testArray', { maxLength: 10 });
      } catch (error) {
        expect((error as ValidationError).code).toBe('ARRAY_TOO_LARGE');
      }
    });

    it('should reject array with non-string items', () => {
      const mixedArray = ['valid', 123, 'also-valid'] as any[];
      
      expect(() => {
        validateStringArray(mixedArray, 'testArray');
      }).toThrow(ValidationError);
      
      try {
        validateStringArray(mixedArray, 'testArray');
      } catch (error) {
        expect((error as ValidationError).field).toBe('testArray[1]');
        expect((error as ValidationError).code).toBe('INVALID_ITEM_TYPE');
      }
    });

    it('should reject items that are too short', () => {
      const array = ['ok', 'x', 'also-ok'];
      
      expect(() => {
        validateStringArray(array, 'testArray', { minItemLength: 2 });
      }).toThrow(ValidationError);
      
      try {
        validateStringArray(array, 'testArray', { minItemLength: 2 });
      } catch (error) {
        expect((error as ValidationError).code).toBe('ITEM_TOO_SHORT');
        expect((error as ValidationError).field).toBe('testArray[1]');
      }
    });

    it('should reject duplicates when not allowed', () => {
      const array = ['unique', 'duplicate', 'duplicate'];
      
      expect(() => {
        validateStringArray(array, 'testArray', { allowDuplicates: false });
      }).toThrow(ValidationError);
      
      try {
        validateStringArray(array, 'testArray', { allowDuplicates: false });
      } catch (error) {
        expect((error as ValidationError).code).toBe('DUPLICATE_ITEMS');
        expect((error as ValidationError).userMessage).toContain('duplicate');
      }
    });
  });

  describe('validateGranularity', () => {
    it('should validate valid granularity', () => {
      const result = validateGranularity('daily');
      expect(result).toBe('daily');
    });

    it('should reject invalid granularity', () => {
      expect(() => {
        validateGranularity('invalid');
      }).toThrow(ValidationError);
      
      try {
        validateGranularity('invalid');
      } catch (error) {
        expect((error as ValidationError).code).toBe('INVALID_GRANULARITY');
        expect((error as ValidationError).userMessage).toContain('hourly, daily, weekly, monthly');
      }
    });

    it('should auto-select appropriate granularity for short time ranges', () => {
      const result = validateGranularity(undefined, 1); // 1 day
      expect(result).toBe('hourly');
    });

    it('should auto-select appropriate granularity for medium time ranges', () => {
      const result = validateGranularity(undefined, 15); // 15 days
      expect(result).toBe('daily');
    });

    it('should auto-select appropriate granularity for long time ranges', () => {
      const result = validateGranularity(undefined, 60); // 60 days
      expect(result).toBe('weekly');
    });

    it('should auto-select appropriate granularity for very long time ranges', () => {
      const result = validateGranularity(undefined, 120); // 120 days
      expect(result).toBe('monthly');
    });

    it('should reject hourly granularity for long time ranges', () => {
      expect(() => {
        validateGranularity('hourly', 10); // 10 days
      }).toThrow(ValidationError);
      
      try {
        validateGranularity('hourly', 10);
      } catch (error) {
        expect((error as ValidationError).code).toBe('GRANULARITY_TIME_MISMATCH');
        expect((error as ValidationError).userMessage).toContain('up to 7 days');
      }
    });

    it('should reject monthly granularity for short time ranges', () => {
      expect(() => {
        validateGranularity('monthly', 15); // 15 days
      }).toThrow(ValidationError);
      
      try {
        validateGranularity('monthly', 15);
      } catch (error) {
        expect((error as ValidationError).code).toBe('GRANULARITY_TIME_MISMATCH');
        expect((error as ValidationError).userMessage).toContain('at least 30 days');
      }
    });
  });

  describe('formatValidationError', () => {
    it('should format validation error correctly', () => {
      const error = new ValidationError(
        'Test error',
        'testField',
        'TEST_CODE',
        'User-friendly message',
        ['Suggestion 1', 'Suggestion 2']
      );

      const formatted = formatValidationError(error);

      expect(formatted).toEqual({
        success: false,
        error: 'User-friendly message',
        field: 'testField',
        code: 'TEST_CODE',
        userMessage: 'User-friendly message',
        suggestions: ['Suggestion 1', 'Suggestion 2']
      });
    });
  });

  describe('withEnhancedValidation', () => {
    it('should execute validation function and return result', () => {
      const result = withEnhancedValidation(() => {
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should re-throw ValidationError as-is', () => {
      const originalError = new ValidationError(
        'Test error',
        'testField',
        'TEST_CODE',
        'User message'
      );

      expect(() => {
        withEnhancedValidation(() => {
          throw originalError;
        });
      }).toThrow(ValidationError);
    });

    it('should convert other errors to ValidationError', () => {
      expect(() => {
        withEnhancedValidation(() => {
          throw new Error('Generic error');
        });
      }).toThrow(ValidationError);
      
      try {
        withEnhancedValidation(() => {
          throw new Error('Generic error');
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe('VALIDATION_ERROR');
        expect((error as ValidationError).userMessage).toContain('Validation failed');
      }
    });

    it('should include context in error messages', () => {
      try {
        withEnhancedValidation(() => {
          throw new Error('Generic error');
        }, 'custom context');
      } catch (error) {
        expect((error as ValidationError).userMessage).toContain('custom context');
      }
    });
  });

  describe('RESOURCE_LIMITS', () => {
    it('should have reasonable default limits', () => {
      expect(RESOURCE_LIMITS.MAX_TIME_RANGE_DAYS).toBe(365);
      expect(RESOURCE_LIMITS.MAX_CONVERSATION_IDS).toBe(100);
      expect(RESOURCE_LIMITS.MAX_LIMIT).toBe(1000);
      expect(RESOURCE_LIMITS.MAX_OFFSET).toBe(50000);
      expect(RESOURCE_LIMITS.MAX_MIN_FREQUENCY).toBe(100);
      expect(RESOURCE_LIMITS.MAX_STRING_LENGTH).toBe(10000);
      expect(RESOURCE_LIMITS.MAX_ARRAY_LENGTH).toBe(1000);
    });
  });
});