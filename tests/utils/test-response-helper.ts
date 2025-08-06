/**
 * Helper to extract the actual response data from MCP tool responses
 * 
 * MCP tools return responses wrapped in:
 * {
 *   content: [{
 *     type: 'text',
 *     text: JSON.stringify({ success: true, data: actualResponse })
 *   }]
 * }
 */

import { MCPToolResult } from '../../src/types/mcp.js';

export interface ParsedResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any[];
}

/**
 * Parse the MCP tool response and extract the actual data
 */
export function parseToolResponse<T = any>(result: MCPToolResult): T {
  if (!result.content || !result.content[0] || !result.content[0].text) {
    throw new Error('Invalid tool response structure');
  }
  
  const parsed = JSON.parse(result.content[0].text) as ParsedResponse<T>;
  
  if (!parsed.success) {
    throw new Error(parsed.error || 'Tool execution failed');
  }
  
  if (!parsed.data) {
    throw new Error('No data in successful response');
  }
  
  return parsed.data;
}

/**
 * Parse response and handle errors gracefully
 */
export function parseToolResponseSafe<T = any>(result: MCPToolResult): ParsedResponse<T> {
  if (!result.content || !result.content[0] || !result.content[0].text) {
    return { success: false, error: 'Invalid tool response structure' };
  }
  
  try {
    return JSON.parse(result.content[0].text) as ParsedResponse<T>;
  } catch (error) {
    return { success: false, error: 'Failed to parse response JSON' };
  }
}