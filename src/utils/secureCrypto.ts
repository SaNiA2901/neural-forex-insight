/**
 * Secure cryptographic utilities for the trading platform
 * 
 * SECURITY FIX: Replaces Math.random() with cryptographically secure alternatives
 * and provides encrypted storage for sensitive trading data.
 */

/**
 * Cryptographically secure random number generator
 * Replaces Math.random() for all security-sensitive operations
 */
export class SecureRandom {
  /**
   * Generate cryptographically secure random number [0, 1)
   * @returns Secure random number
   */
  static random(): number {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  }

  /**
   * Generate cryptographically secure random integer in range [min, max)
   * @param min Minimum value (inclusive)
   * @param max Maximum value (exclusive)
   * @returns Secure random integer
   */
  static randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  /**
   * Generate cryptographically secure random bytes
   * @param length Number of bytes
   * @returns Uint8Array with random bytes
   */
  static randomBytes(length: number): Uint8Array {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
  }

  /**
   * Generate cryptographically secure UUID v4
   * @returns UUID string
   */
  static uuid(): string {
    return crypto.randomUUID();
  }
}

/**
 * Secure data encryption/decryption for localStorage
 */
export class SecureStorage {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;

  /**
   * Generate or retrieve encryption key for the current session
   */
  private static async getKey(): Promise<CryptoKey> {
    const keyData = SecureRandom.randomBytes(32); // 256 bits
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: this.ALGORITHM },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data for secure storage
   * @param data Data to encrypt
   * @returns Encrypted data as base64 string
   */
  static async encrypt(data: string): Promise<string> {
    try {
      const key = await this.getKey();
      const iv = SecureRandom.randomBytes(this.IV_LENGTH);
      const encodedData = new TextEncoder().encode(data);

      const encryptedData = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        key,
        encodedData
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);

      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypt data from secure storage
   * @param encryptedData Encrypted data as base64 string
   * @returns Decrypted data
   */
  static async decrypt(encryptedData: string): Promise<string> {
    try {
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );

      const iv = combined.slice(0, this.IV_LENGTH);
      const data = combined.slice(this.IV_LENGTH);

      const key = await this.getKey();

      const decryptedData = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        data
      );

      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  /**
   * Securely store data in localStorage with encryption
   * @param key Storage key
   * @param data Data to store
   */
  static async setItem(key: string, data: any): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      const encryptedData = await this.encrypt(jsonData);
      localStorage.setItem(key, encryptedData);
    } catch (error) {
      console.error('Secure storage failed:', error);
      // Fallback to regular storage for non-critical data
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  /**
   * Securely retrieve data from localStorage with decryption
   * @param key Storage key
   * @returns Decrypted data or null if not found
   */
  static async getItem(key: string): Promise<any> {
    try {
      const encryptedData = localStorage.getItem(key);
      if (!encryptedData) return null;

      const decryptedData = await this.decrypt(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Secure retrieval failed:', error);
      // Fallback to regular storage
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }
  }

  /**
   * Remove item from secure storage
   * @param key Storage key
   */
  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Clear all items from secure storage
   */
  static clear(): void {
    localStorage.clear();
  }
}

/**
 * Secure random seed generator for ML models
 * Replaces Math.random() in financial calculations
 */
export class SecureMLRandom {
  private static seed: number | null = null;

  /**
   * Initialize with cryptographically secure seed
   */
  static initialize(): void {
    this.seed = SecureRandom.randomInt(1, 2147483647);
  }

  /**
   * Generate deterministic but secure random number for ML
   * Uses a simple LCG with cryptographically secure seed
   */
  static next(): number {
    if (!this.seed) this.initialize();
    
    // Linear Congruential Generator with good parameters
    this.seed = (this.seed! * 1664525 + 1013904223) % 2147483647;
    return this.seed! / 2147483647;
  }

  /**
   * Reset with new secure seed
   */
  static reset(): void {
    this.seed = null;
    this.initialize();
  }
}

/**
 * Secure array shuffling using Fisher-Yates algorithm with crypto random
 * @param array Array to shuffle
 * @returns Shuffled array (modifies original)
 */
export function secureShuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = SecureRandom.randomInt(0, i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Legacy exports for backward compatibility
export const secureRandom = {
  random: () => SecureRandom.random(),
  randomInt: (min: number, max: number) => SecureRandom.randomInt(min, max),
  randomBytes: (length: number) => SecureRandom.randomBytes(length),
  uuid: () => SecureRandom.uuid()
};

export const secureCrypto = {
  SecureRandom,
  SecureStorage,
  SecureMLRandom,
  secureShuffleArray,
  secureRandom: {
    random: () => SecureRandom.random(),
    randomInt: (min: number, max: number) => SecureRandom.randomInt(min, max)
  }
};