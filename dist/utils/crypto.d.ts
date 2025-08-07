/**
 * Cryptographic utilities for secure data storage
 *
 * This module provides utilities for encrypting and decrypting sensitive data
 * such as API keys using AES-256-CBC encryption with HMAC authentication.
 */
import { EncryptedData } from '../types/repositories.js';
/**
 * Encrypt sensitive data using AES-256-CBC with HMAC authentication
 */
export declare function encrypt(plaintext: string): Promise<EncryptedData>;
/**
 * Decrypt sensitive data using AES-256-CBC with HMAC verification
 */
export declare function decrypt(encryptedData: EncryptedData): Promise<string>;
/**
 * Securely compare two strings to prevent timing attacks
 */
export declare function secureCompare(a: string, b: string): boolean;
/**
 * Generate a secure random key for encryption
 */
export declare function generateEncryptionKey(): string;
/**
 * Check if encryption is properly configured
 */
export declare function isEncryptionConfigured(): boolean;
/**
 * Validate encrypted data structure
 */
export declare function isValidEncryptedData(data: any): data is EncryptedData;
//# sourceMappingURL=crypto.d.ts.map