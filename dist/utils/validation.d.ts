/**
 * Enhanced Input Validation Utilities
 *
 * Provides comprehensive validation utilities for production-quality input validation
 * beyond basic Zod schemas. Includes business logic validation, resource protection,
 * and user-friendly error messages.
 */
/**
 * Enhanced validation error with user-friendly messages
 */
export declare class ValidationError extends Error {
    field: string;
    code: string;
    userMessage: string;
    suggestions?: string[];
    constructor(message: string, field: string, code: string, userMessage: string, suggestions?: string[]);
}
/**
 * Resource limits for protection against excessive usage
 */
export declare const RESOURCE_LIMITS: {
    readonly MAX_TIME_RANGE_DAYS: 365;
    readonly MAX_CONVERSATION_IDS: 100;
    readonly MAX_LIMIT: 1000;
    readonly MAX_OFFSET: 50000;
    readonly MAX_MIN_FREQUENCY: 100;
    readonly MAX_STRING_LENGTH: 10000;
    readonly MAX_ARRAY_LENGTH: 1000;
    readonly MIN_DATE: number;
    readonly MAX_DATE: number;
};
/**
 * Enhanced date validation with comprehensive business rules
 */
export declare function validateDateRange(startDate?: string, endDate?: string, fieldPrefix?: string, options?: {
    maxDays?: number;
    allowFuture?: boolean;
    defaultDays?: number;
}): {
    start: number;
    end: number;
};
/**
 * Validate conversation ID format and constraints
 */
export declare function validateConversationId(conversationId: string, fieldName?: string, required?: boolean): string;
/**
 * Validate conversation ID array with resource limits
 */
export declare function validateConversationIds(conversationIds: string[] | undefined, fieldName?: string, maxCount?: 100): string[] | undefined;
/**
 * Validate pagination parameters with business rules
 */
export declare function validatePagination(limit?: number, offset?: number, maxLimit?: 1000, maxOffset?: 50000): {
    limit: number;
    offset: number;
};
/**
 * Validate frequency threshold parameters
 */
export declare function validateFrequency(frequency: number | undefined, fieldName?: string, min?: number, max?: 100, defaultValue?: number): number;
/**
 * Validate string array with length and content constraints
 */
export declare function validateStringArray(array: string[] | undefined, fieldName: string, options?: {
    maxLength?: number;
    maxItemLength?: number;
    minItemLength?: number;
    allowEmpty?: boolean;
    allowDuplicates?: boolean;
}): string[] | undefined;
/**
 * Enhanced granularity validation with business rules
 */
export declare function validateGranularity(granularity?: string, timeRangeDays?: number): string;
/**
 * Convert ValidationError to user-friendly format for tool responses
 */
export declare function formatValidationError(error: ValidationError): {
    success: false;
    error: string;
    field: string;
    code: string;
    userMessage: string;
    suggestions?: string[];
};
/**
 * Enhanced wrapper for validation in tool implementations
 */
export declare function withEnhancedValidation<T>(validationFn: () => T, context?: string): T;
//# sourceMappingURL=validation.d.ts.map