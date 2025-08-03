/**
 * Abstract base class for all MCP Tools in the persistence system
 * 
 * This class provides common functionality for tool validation, error handling,
 * and response formatting. All concrete tool implementations must extend this class.
 */

import { z } from 'zod';
import { MCPTool, MCPToolResult } from '../types/mcp';
import { SuccessResponse, ErrorResponse } from '../types/interfaces';

/**
 * Tool execution context passed to all tools
 */
export interface ToolContext {
  /** Unique request ID for tracing */
  requestId: string;
  /** Timestamp when the tool execution started */
  timestamp: number;
  /** Additional context data */
  metadata?: Record<string, any>;
}

/**
 * Base class for all MCP tools providing common functionality
 */
export abstract class BaseTool<TInput = any, TOutput = any> {
  protected readonly tool: MCPTool;
  protected readonly inputSchema: z.ZodSchema<any>;

  constructor(tool: MCPTool, inputSchema: z.ZodSchema<any>) {
    this.tool = tool;
    this.inputSchema = inputSchema;
  }

  /**
   * Get the tool definition for MCP protocol
   */
  public getTool(): MCPTool {
    return this.tool;
  }

  /**
   * Get the tool name
   */
  public getName(): string {
    return this.tool.name;
  }

  /**
   * Get the tool description
   */
  public getDescription(): string {
    return this.tool.description;
  }

  /**
   * Execute the tool with the given input and context
   */
  public async execute(input: unknown, context: ToolContext): Promise<MCPToolResult> {
    try {
      // Validate input using Zod schema
      const validatedInput = this.validateInput(input);
      
      // Execute the tool-specific implementation
      const result = await this.executeImpl(validatedInput, context);
      
      // Format and return the response
      return this.formatSuccessResponse(result);
    } catch (error) {
      // Handle errors and format error response
      return this.formatErrorResponse(error, context);
    }
  }

  /**
   * Validate input using the tool's Zod schema
   */
  public validateInput(input: unknown): TInput {
    try {
      return this.inputSchema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid input parameters', error.errors);
      }
      throw error;
    }
  }

  /**
   * Abstract method that concrete tools must implement
   */
  protected abstract executeImpl(input: TInput, context: ToolContext): Promise<TOutput>;

  /**
   * Format a successful response for MCP protocol
   */
  protected formatSuccessResponse(data: TOutput): MCPToolResult {
    const response: SuccessResponse<TOutput> = {
      success: true,
      data
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response)
      }]
    };
  }

  /**
   * Format an error response for MCP protocol
   */
  protected formatErrorResponse(error: unknown, _context: ToolContext): MCPToolResult {
    let errorResponse: ErrorResponse;

    if (error instanceof ValidationError) {
      errorResponse = {
        success: false,
        error: 'ValidationError',
        message: error.message,
        details: error.details
      };
    } else if (error instanceof NotFoundError) {
      errorResponse = {
        success: false,
        error: 'NotFoundError',
        message: error.message
      };
    } else if (error instanceof ConflictError) {
      errorResponse = {
        success: false,
        error: 'ConflictError',
        message: error.message
      };
    } else if (error instanceof DatabaseError) {
      // Log the full database error but don't expose it to the user
      console.error(`Database error in ${this.tool.name}:`, error.originalError);
      
      errorResponse = {
        success: false,
        error: 'DatabaseError',
        message: 'A database error occurred while processing your request'
      };
    } else if (error instanceof Error) {
      // Log unexpected errors but don't expose internal details
      console.error(`Unexpected error in ${this.tool.name}:`, error);
      
      errorResponse = {
        success: false,
        error: 'InternalError',
        message: 'An internal error occurred while processing your request'
      };
    } else {
      // Handle non-Error objects
      console.error(`Unknown error in ${this.tool.name}:`, error);
      
      errorResponse = {
        success: false,
        error: 'UnknownError',
        message: 'An unknown error occurred while processing your request'
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(errorResponse)
      }],
      isError: true
    };
  }

  /**
   * Create a tool context for execution
   */
  public static createContext(overrides?: Partial<ToolContext>): ToolContext {
    return {
      requestId: generateRequestId(),
      timestamp: Date.now(),
      ...overrides
    };
  }

  /**
   * Utility method to safely extract string from unknown input
   */
  protected safeString(value: unknown, fieldName: string): string {
    if (typeof value === 'string') {
      return value;
    }
    throw new ValidationError(`Field '${fieldName}' must be a string`);
  }

  /**
   * Utility method to safely extract number from unknown input
   */
  protected safeNumber(value: unknown, fieldName: string): number {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    throw new ValidationError(`Field '${fieldName}' must be a valid number`);
  }

  /**
   * Utility method to safely extract boolean from unknown input
   */
  protected safeBoolean(value: unknown, fieldName: string): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    throw new ValidationError(`Field '${fieldName}' must be a boolean`);
  }
}

/**
 * Custom error classes for better error handling
 */
export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Type guard to check if an error is a known error type
 */
export function isKnownError(error: unknown): error is ValidationError | NotFoundError | ConflictError | DatabaseError {
  return error instanceof ValidationError ||
         error instanceof NotFoundError ||
         error instanceof ConflictError ||
         error instanceof DatabaseError;
}

/**
 * Utility function to wrap database operations and convert errors
 */
export async function wrapDatabaseOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Preserve certain error types that have specific meaning
    if (error instanceof NotFoundError || 
        error instanceof ValidationError || 
        error instanceof ConflictError) {
      throw error;
    }
    
    if (error instanceof Error) {
      throw new DatabaseError(errorMessage, error);
    }
    throw new DatabaseError(errorMessage);
  }
}