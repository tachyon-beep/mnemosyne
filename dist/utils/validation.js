/**
 * Enhanced Input Validation Utilities
 *
 * Provides comprehensive validation utilities for production-quality input validation
 * beyond basic Zod schemas. Includes business logic validation, resource protection,
 * and user-friendly error messages.
 */
import { z } from 'zod';
/**
 * Enhanced validation error with user-friendly messages
 */
export class ValidationError extends Error {
    field;
    code;
    userMessage;
    suggestions;
    constructor(message, field, code, userMessage, suggestions) {
        super(message);
        this.field = field;
        this.code = code;
        this.userMessage = userMessage;
        this.suggestions = suggestions;
        this.name = 'ValidationError';
    }
}
/**
 * Resource limits for protection against excessive usage
 */
export const RESOURCE_LIMITS = {
    MAX_TIME_RANGE_DAYS: 365,
    MAX_CONVERSATION_IDS: 100,
    MAX_LIMIT: 1000,
    MAX_OFFSET: 50000,
    MAX_MIN_FREQUENCY: 100,
    MAX_STRING_LENGTH: 10000,
    MAX_ARRAY_LENGTH: 1000,
    MIN_DATE: new Date('2020-01-01').getTime(),
    MAX_DATE: new Date('2030-12-31').getTime()
};
/**
 * Enhanced date validation with comprehensive business rules
 */
export function validateDateRange(startDate, endDate, fieldPrefix = '', options = {}) {
    const { maxDays = RESOURCE_LIMITS.MAX_TIME_RANGE_DAYS, allowFuture = false, defaultDays = 30 } = options;
    let start;
    let end;
    const now = Date.now();
    // Parse and validate end date
    if (endDate) {
        if (!isValidDateString(endDate)) {
            throw new ValidationError(`Invalid end date format: ${endDate}`, `${fieldPrefix}endDate`, 'INVALID_DATE_FORMAT', 'End date must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)', ['Use format like "2024-01-15T00:00:00.000Z"', 'Ensure timezone is specified']);
        }
        end = new Date(endDate).getTime();
        if (isNaN(end)) {
            throw new ValidationError(`End date is not a valid date: ${endDate}`, `${fieldPrefix}endDate`, 'INVALID_DATE_VALUE', 'End date contains invalid date values', ['Check month (1-12)', 'Check day of month', 'Check time values']);
        }
        // Check bounds
        if (end < RESOURCE_LIMITS.MIN_DATE || end > RESOURCE_LIMITS.MAX_DATE) {
            throw new ValidationError(`End date outside allowed range: ${endDate}`, `${fieldPrefix}endDate`, 'DATE_OUT_OF_RANGE', 'End date must be between 2020-01-01 and 2030-12-31', [`Provided: ${new Date(end).toISOString()}`, 'Adjust date to be within allowed range']);
        }
        // Future date validation
        if (!allowFuture && end > now) {
            throw new ValidationError(`End date cannot be in the future: ${endDate}`, `${fieldPrefix}endDate`, 'FUTURE_DATE_NOT_ALLOWED', 'End date cannot be in the future for this operation', [`Current time: ${new Date(now).toISOString()}`, 'Use a date up to now']);
        }
    }
    else {
        end = now;
    }
    // Parse and validate start date
    if (startDate) {
        if (!isValidDateString(startDate)) {
            throw new ValidationError(`Invalid start date format: ${startDate}`, `${fieldPrefix}startDate`, 'INVALID_DATE_FORMAT', 'Start date must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)', ['Use format like "2024-01-15T00:00:00.000Z"', 'Ensure timezone is specified']);
        }
        start = new Date(startDate).getTime();
        if (isNaN(start)) {
            throw new ValidationError(`Start date is not a valid date: ${startDate}`, `${fieldPrefix}startDate`, 'INVALID_DATE_VALUE', 'Start date contains invalid date values', ['Check month (1-12)', 'Check day of month', 'Check time values']);
        }
        // Check bounds
        if (start < RESOURCE_LIMITS.MIN_DATE || start > RESOURCE_LIMITS.MAX_DATE) {
            throw new ValidationError(`Start date outside allowed range: ${startDate}`, `${fieldPrefix}startDate`, 'DATE_OUT_OF_RANGE', 'Start date must be between 2020-01-01 and 2030-12-31', [`Provided: ${new Date(start).toISOString()}`, 'Adjust date to be within allowed range']);
        }
        // Future date validation
        if (!allowFuture && start > now) {
            throw new ValidationError(`Start date cannot be in the future: ${startDate}`, `${fieldPrefix}startDate`, 'FUTURE_DATE_NOT_ALLOWED', 'Start date cannot be in the future for this operation', [`Current time: ${new Date(now).toISOString()}`, 'Use a date up to now']);
        }
    }
    else {
        start = end - (defaultDays * 24 * 60 * 60 * 1000);
    }
    // Validate date order
    if (start >= end) {
        throw new ValidationError(`Start date must be before end date: ${new Date(start).toISOString()} >= ${new Date(end).toISOString()}`, `${fieldPrefix}dateRange`, 'INVALID_DATE_ORDER', 'Start date must be before end date', [
            `Start: ${new Date(start).toISOString()}`,
            `End: ${new Date(end).toISOString()}`,
            'Ensure start date is earlier than end date'
        ]);
    }
    // Validate time range duration
    const rangeDays = (end - start) / (1000 * 60 * 60 * 24);
    if (rangeDays > maxDays) {
        throw new ValidationError(`Time range too large: ${rangeDays} days exceeds maximum of ${maxDays} days`, `${fieldPrefix}dateRange`, 'TIME_RANGE_TOO_LARGE', `Time range cannot exceed ${maxDays} days to protect system resources`, [
            `Current range: ${Math.round(rangeDays)} days`,
            `Maximum allowed: ${maxDays} days`,
            'Reduce the time range or split into multiple requests'
        ]);
    }
    // Validate minimum range (at least 1 hour)
    if (rangeDays < (1 / 24)) {
        throw new ValidationError(`Time range too small: ${rangeDays * 24} hours, minimum 1 hour`, `${fieldPrefix}dateRange`, 'TIME_RANGE_TOO_SMALL', 'Time range must be at least 1 hour for meaningful analysis', [
            `Current range: ${Math.round(rangeDays * 24 * 60)} minutes`,
            'Increase the time range to at least 1 hour'
        ]);
    }
    return { start, end };
}
/**
 * Validate conversation ID format and constraints
 */
export function validateConversationId(conversationId, fieldName = 'conversationId', required = true) {
    if (!conversationId) {
        if (required) {
            throw new ValidationError('Conversation ID is required', fieldName, 'REQUIRED_FIELD', 'Conversation ID is required for this operation', ['Provide a valid conversation ID']);
        }
        return conversationId;
    }
    // Length validation
    if (conversationId.length < 8) {
        throw new ValidationError(`Conversation ID too short: ${conversationId.length} characters`, fieldName, 'ID_TOO_SHORT', 'Conversation ID must be at least 8 characters long', [`Provided: ${conversationId.length} characters`, 'Minimum: 8 characters']);
    }
    if (conversationId.length > 100) {
        throw new ValidationError(`Conversation ID too long: ${conversationId.length} characters`, fieldName, 'ID_TOO_LONG', 'Conversation ID cannot exceed 100 characters', [`Provided: ${conversationId.length} characters`, 'Maximum: 100 characters']);
    }
    // Format validation (UUID or secure random string)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const secureIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!uuidPattern.test(conversationId) && !secureIdPattern.test(conversationId)) {
        throw new ValidationError(`Invalid conversation ID format: ${conversationId}`, fieldName, 'INVALID_ID_FORMAT', 'Conversation ID must be a UUID or contain only letters, numbers, hyphens, and underscores', [
            'Valid UUID: 123e4567-e89b-12d3-a456-426614174000',
            'Valid ID: abc123_def-456',
            'Invalid characters were found in the ID'
        ]);
    }
    return conversationId;
}
/**
 * Validate conversation ID array with resource limits
 */
export function validateConversationIds(conversationIds, fieldName = 'conversationIds', maxCount = RESOURCE_LIMITS.MAX_CONVERSATION_IDS) {
    if (!conversationIds) {
        return undefined;
    }
    if (!Array.isArray(conversationIds)) {
        throw new ValidationError('Conversation IDs must be an array', fieldName, 'INVALID_TYPE', 'Conversation IDs must be provided as an array', ['Use format: ["id1", "id2", "id3"]']);
    }
    if (conversationIds.length === 0) {
        throw new ValidationError('Conversation IDs array cannot be empty', fieldName, 'EMPTY_ARRAY', 'At least one conversation ID is required when providing conversation IDs', ['Add at least one valid conversation ID to the array']);
    }
    if (conversationIds.length > maxCount) {
        throw new ValidationError(`Too many conversation IDs: ${conversationIds.length} exceeds maximum of ${maxCount}`, fieldName, 'ARRAY_TOO_LARGE', `Cannot process more than ${maxCount} conversation IDs in a single request`, [
            `Provided: ${conversationIds.length} IDs`,
            `Maximum: ${maxCount} IDs`,
            'Split into multiple requests or reduce the number of IDs'
        ]);
    }
    // Validate each ID and check for duplicates
    const seenIds = new Set();
    const duplicates = [];
    conversationIds.forEach((id, index) => {
        try {
            validateConversationId(id, `${fieldName}[${index}]`, true);
        }
        catch (error) {
            if (error instanceof ValidationError) {
                // Re-throw with array context
                throw new ValidationError(error.message, `${fieldName}[${index}]`, error.code, `Invalid conversation ID at position ${index}: ${error.userMessage}`, error.suggestions);
            }
            throw error;
        }
        if (seenIds.has(id)) {
            duplicates.push(id);
        }
        else {
            seenIds.add(id);
        }
    });
    if (duplicates.length > 0) {
        throw new ValidationError(`Duplicate conversation IDs found: ${duplicates.join(', ')}`, fieldName, 'DUPLICATE_VALUES', 'Conversation ID array contains duplicate values', [
            `Duplicates: ${duplicates.join(', ')}`,
            'Remove duplicate conversation IDs from the array'
        ]);
    }
    return conversationIds;
}
/**
 * Validate pagination parameters with business rules
 */
export function validatePagination(limit, offset, maxLimit = RESOURCE_LIMITS.MAX_LIMIT, maxOffset = RESOURCE_LIMITS.MAX_OFFSET) {
    // Validate limit
    if (limit !== undefined) {
        if (!Number.isInteger(limit) || limit < 1) {
            throw new ValidationError(`Invalid limit: ${limit}`, 'limit', 'INVALID_PAGINATION_LIMIT', 'Limit must be a positive integer', [`Provided: ${limit}`, 'Use a positive integer (1, 10, 100)']);
        }
        if (limit > maxLimit) {
            throw new ValidationError(`Limit too large: ${limit} exceeds maximum of ${maxLimit}`, 'limit', 'LIMIT_TOO_LARGE', `Limit cannot exceed ${maxLimit} items to protect system resources`, [
                `Provided: ${limit}`,
                `Maximum: ${maxLimit}`,
                'Use a smaller limit or implement pagination'
            ]);
        }
    }
    // Validate offset
    if (offset !== undefined) {
        if (!Number.isInteger(offset) || offset < 0) {
            throw new ValidationError(`Invalid offset: ${offset}`, 'offset', 'INVALID_PAGINATION_OFFSET', 'Offset must be zero or a positive integer', [`Provided: ${offset}`, 'Use zero or a positive integer (0, 10, 100)']);
        }
        if (offset > maxOffset) {
            throw new ValidationError(`Offset too large: ${offset} exceeds maximum of ${maxOffset}`, 'offset', 'OFFSET_TOO_LARGE', `Offset cannot exceed ${maxOffset} to protect system resources`, [
                `Provided: ${offset}`,
                `Maximum: ${maxOffset}`,
                'Use pagination with smaller offsets or search/filter to narrow results'
            ]);
        }
    }
    return {
        limit: limit || 20,
        offset: offset || 0
    };
}
/**
 * Validate frequency threshold parameters
 */
export function validateFrequency(frequency, fieldName = 'minFrequency', min = 1, max = RESOURCE_LIMITS.MAX_MIN_FREQUENCY, defaultValue = 1) {
    if (frequency === undefined) {
        return defaultValue;
    }
    if (!Number.isInteger(frequency)) {
        throw new ValidationError(`Invalid frequency: ${frequency}`, fieldName, 'INVALID_FREQUENCY_TYPE', 'Frequency must be an integer', [`Provided: ${frequency}`, 'Use an integer value']);
    }
    if (frequency < min) {
        throw new ValidationError(`Frequency too low: ${frequency} is less than minimum of ${min}`, fieldName, 'FREQUENCY_TOO_LOW', `Frequency must be at least ${min}`, [
            `Provided: ${frequency}`,
            `Minimum: ${min}`,
            'Increase the frequency threshold'
        ]);
    }
    if (frequency > max) {
        throw new ValidationError(`Frequency too high: ${frequency} exceeds maximum of ${max}`, fieldName, 'FREQUENCY_TOO_HIGH', `Frequency cannot exceed ${max} to ensure meaningful results`, [
            `Provided: ${frequency}`,
            `Maximum: ${max}`,
            'Use a lower frequency threshold'
        ]);
    }
    return frequency;
}
/**
 * Validate string array with length and content constraints
 */
export function validateStringArray(array, fieldName, options = {}) {
    if (!array) {
        return undefined;
    }
    const { maxLength = RESOURCE_LIMITS.MAX_ARRAY_LENGTH, maxItemLength = RESOURCE_LIMITS.MAX_STRING_LENGTH, minItemLength = 1, allowEmpty = false, allowDuplicates = true } = options;
    if (!Array.isArray(array)) {
        throw new ValidationError(`Invalid array type: ${typeof array}`, fieldName, 'INVALID_TYPE', `${fieldName} must be an array of strings`, ['Use format: ["item1", "item2", "item3"]']);
    }
    if (!allowEmpty && array.length === 0) {
        throw new ValidationError('Array cannot be empty', fieldName, 'EMPTY_ARRAY', `${fieldName} cannot be empty`, ['Add at least one item to the array']);
    }
    if (array.length > maxLength) {
        throw new ValidationError(`Array too large: ${array.length} items exceeds maximum of ${maxLength}`, fieldName, 'ARRAY_TOO_LARGE', `${fieldName} cannot have more than ${maxLength} items`, [
            `Provided: ${array.length} items`,
            `Maximum: ${maxLength} items`,
            'Reduce the number of items'
        ]);
    }
    // Validate each string
    const seen = new Set();
    const duplicates = [];
    array.forEach((item, index) => {
        if (typeof item !== 'string') {
            throw new ValidationError(`Invalid item type at index ${index}: ${typeof item}`, `${fieldName}[${index}]`, 'INVALID_ITEM_TYPE', `All items in ${fieldName} must be strings`, [`Item at index ${index} is ${typeof item}`, 'Ensure all items are strings']);
        }
        if (item.length < minItemLength) {
            throw new ValidationError(`Item too short at index ${index}: ${item.length} characters`, `${fieldName}[${index}]`, 'ITEM_TOO_SHORT', `Items in ${fieldName} must be at least ${minItemLength} characters`, [`Item: "${item}" (${item.length} chars)`, `Minimum: ${minItemLength} characters`]);
        }
        if (item.length > maxItemLength) {
            throw new ValidationError(`Item too long at index ${index}: ${item.length} characters`, `${fieldName}[${index}]`, 'ITEM_TOO_LONG', `Items in ${fieldName} cannot exceed ${maxItemLength} characters`, [`Item length: ${item.length} chars`, `Maximum: ${maxItemLength} characters`]);
        }
        if (!allowDuplicates) {
            if (seen.has(item)) {
                duplicates.push(item);
            }
            else {
                seen.add(item);
            }
        }
    });
    if (!allowDuplicates && duplicates.length > 0) {
        throw new ValidationError(`Duplicate items found: ${duplicates.join(', ')}`, fieldName, 'DUPLICATE_ITEMS', `${fieldName} cannot contain duplicate items`, [
            `Duplicates: ${duplicates.join(', ')}`,
            'Remove duplicate items from the array'
        ]);
    }
    return array;
}
/**
 * Enhanced granularity validation with business rules
 */
export function validateGranularity(granularity, timeRangeDays) {
    const validGranularities = ['hourly', 'daily', 'weekly', 'monthly'];
    if (granularity && !validGranularities.includes(granularity)) {
        throw new ValidationError(`Invalid granularity: ${granularity}`, 'granularity', 'INVALID_GRANULARITY', 'Granularity must be one of: hourly, daily, weekly, monthly', [
            `Provided: ${granularity}`,
            `Valid options: ${validGranularities.join(', ')}`,
            'Choose an appropriate granularity for your analysis'
        ]);
    }
    // Auto-select appropriate granularity based on time range
    if (!granularity && timeRangeDays) {
        if (timeRangeDays <= 2) {
            granularity = 'hourly';
        }
        else if (timeRangeDays <= 31) {
            granularity = 'daily';
        }
        else if (timeRangeDays <= 90) {
            granularity = 'weekly';
        }
        else {
            granularity = 'monthly';
        }
    }
    // Validate granularity makes sense for time range
    if (granularity && timeRangeDays) {
        if (granularity === 'hourly' && timeRangeDays > 7) {
            throw new ValidationError(`Hourly granularity not suitable for ${timeRangeDays} days`, 'granularity', 'GRANULARITY_TIME_MISMATCH', 'Hourly granularity is only suitable for time ranges up to 7 days', [
                `Time range: ${timeRangeDays} days`,
                'Use "daily" or "weekly" granularity for longer periods',
                'Or reduce the time range to 7 days or less'
            ]);
        }
        if (granularity === 'monthly' && timeRangeDays < 30) {
            throw new ValidationError(`Monthly granularity not suitable for ${timeRangeDays} days`, 'granularity', 'GRANULARITY_TIME_MISMATCH', 'Monthly granularity requires at least 30 days of data', [
                `Time range: ${timeRangeDays} days`,
                'Use "hourly" or "daily" granularity for shorter periods',
                'Or increase the time range to at least 30 days'
            ]);
        }
    }
    return granularity || 'daily';
}
/**
 * Check if string is a valid ISO 8601 date
 */
function isValidDateString(dateString) {
    // Basic ISO 8601 pattern check
    const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return iso8601Pattern.test(dateString);
}
/**
 * Convert ValidationError to user-friendly format for tool responses
 */
export function formatValidationError(error) {
    return {
        success: false,
        error: error.userMessage,
        field: error.field,
        code: error.code,
        userMessage: error.userMessage,
        suggestions: error.suggestions
    };
}
/**
 * Enhanced wrapper for validation in tool implementations
 */
export function withEnhancedValidation(validationFn, context = 'input validation') {
    try {
        return validationFn();
    }
    catch (error) {
        if (error instanceof ValidationError) {
            throw error; // Re-throw our enhanced errors
        }
        if (error instanceof z.ZodError) {
            // Convert Zod errors to our format
            const firstError = error.errors[0];
            throw new ValidationError(error.message, firstError.path.join('.'), 'SCHEMA_VALIDATION_ERROR', firstError.message, ['Check the input format and try again']);
        }
        // Wrap other errors
        throw new ValidationError(error instanceof Error ? error.message : String(error), 'unknown', 'VALIDATION_ERROR', `Validation failed during ${context}`, ['Check your input parameters', 'Ensure all required fields are provided']);
    }
}
//# sourceMappingURL=validation.js.map