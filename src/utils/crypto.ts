/**
 * Cryptographic utilities for secure data storage
 * 
 * This module provides utilities for encrypting and decrypting sensitive data
 * such as API keys using AES-256-CBC encryption with HMAC authentication.
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt, createHmac, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { EncryptedData } from '../types/repositories.js';

const scryptAsync = promisify(scrypt);

/**
 * Default encryption algorithm
 */
const ALGORITHM = 'aes-256-cbc';

/**
 * Key derivation parameters
 */
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

/**
 * Get encryption key from environment or generate one
 */
function getEncryptionPassword(): string {
  const password = process.env.MCP_ENCRYPTION_KEY;
  if (!password) {
    throw new Error('MCP_ENCRYPTION_KEY environment variable is required for secure storage');
  }
  return password;
}

/**
 * Derive encryption key from password using scrypt
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Encrypt sensitive data using AES-256-CBC with HMAC authentication
 */
export async function encrypt(plaintext: string): Promise<EncryptedData> {
  try {
    const password = getEncryptionPassword();
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    
    // Derive key from password
    const key = await deriveKey(password, salt);
    
    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Create HMAC for authentication
    const hmac = createHmac('sha256', key);
    hmac.update(salt);
    hmac.update(iv);
    hmac.update(encrypted, 'base64');
    const tag = hmac.digest();
    
    // Combine salt + iv + tag for storage
    const combined = Buffer.concat([salt, iv, tag]);
    
    return {
      encrypted,
      iv: combined.toString('base64'),
      tag: tag.toString('base64')
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt sensitive data using AES-256-CBC with HMAC verification
 */
export async function decrypt(encryptedData: EncryptedData): Promise<string> {
  try {
    const password = getEncryptionPassword();
    
    // Parse the combined data
    const combined = Buffer.from(encryptedData.iv, 'base64');
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const receivedTag = combined.subarray(SALT_LENGTH + IV_LENGTH);
    
    // Derive key from password
    const key = await deriveKey(password, salt);
    
    // Verify HMAC
    const hmac = createHmac('sha256', key);
    hmac.update(salt);
    hmac.update(iv);
    hmac.update(encryptedData.encrypted, 'base64');
    const computedTag = hmac.digest();
    
    if (!timingSafeEqual(receivedTag, computedTag)) {
      throw new Error('Authentication failed - data may have been tampered with');
    }
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Securely compare two strings to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Generate a secure random key for encryption
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('base64');
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.MCP_ENCRYPTION_KEY;
}

/**
 * Validate encrypted data structure
 */
export function isValidEncryptedData(data: any): data is EncryptedData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.encrypted === 'string' &&
    typeof data.iv === 'string' &&
    typeof data.tag === 'string'
  );
}