/**
 * Secure cryptographic utilities for financial applications
 * Replaces insecure Math.random with crypto.getRandomValues
 */

export class SecureCrypto {
  private static instance: SecureCrypto;
  private seededRNG: boolean = false;
  private seed: number = 0;

  private constructor() {}

  static getInstance(): SecureCrypto {
    if (!SecureCrypto.instance) {
      SecureCrypto.instance = new SecureCrypto();
    }
    return SecureCrypto.instance;
  }

  /**
   * Secure random number generation for production
   * Uses crypto.getRandomValues for cryptographically secure randomness
   */
  secureRandom(): number {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return array[0] / (0xffffffff + 1);
    } else if (typeof require !== 'undefined') {
      // Node.js environment
      const crypto = require('crypto');
      return crypto.randomBytes(4).readUInt32BE(0) / (0xffffffff + 1);
    } else {
      // Fallback (not recommended for production)
      console.warn('SECURITY WARNING: Using Math.random fallback. This is not cryptographically secure!');
      return Math.random();
    }
  }

  /**
   * Seeded random number generator for reproducible tests
   * Only use for testing, never in production!
   */
  seededRandom(): number {
    if (!this.seededRNG) {
      console.warn('Seeded RNG not initialized. Use setSeed() first.');
      return this.secureRandom();
    }
    
    // Linear congruential generator (for testing only)
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }

  /**
   * Set seed for reproducible testing
   * WARNING: Only use in test environment!
   */
  setSeed(seed: number): void {
    if (import.meta.env.NODE_ENV === 'production') {
      throw new Error('SECURITY ERROR: Seeded random should never be used in production!');
    }
    this.seed = seed;
    this.seededRNG = true;
  }

  /**
   * Reset to secure random (production mode)
   */
  resetToSecure(): void {
    this.seededRNG = false;
    this.seed = 0;
  }

  /**
   * Generate secure random integer in range [min, max]
   */
  secureRandomInt(min: number, max: number): number {
    const range = max - min + 1;
    return Math.floor(this.secureRandom() * range) + min;
  }

  /**
   * Generate secure random float in range [min, max)
   */
  secureRandomFloat(min: number, max: number): number {
    return this.secureRandom() * (max - min) + min;
  }

  /**
   * Shuffle array using Fisher-Yates algorithm with secure randomness
   */
  secureShuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.secureRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Generate UUID v4 using secure randomness
   */
  generateSecureUUID(): string {
    const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return template.replace(/[xy]/g, (c) => {
      const r = Math.floor(this.secureRandom() * 16);
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Export singleton instance
export const secureCrypto = SecureCrypto.getInstance();

// Utility functions for easy import
export const secureRandom = () => secureCrypto.secureRandom();
export const secureRandomInt = (min: number, max: number) => secureCrypto.secureRandomInt(min, max);
export const secureRandomFloat = (min: number, max: number) => secureCrypto.secureRandomFloat(min, max);
export const secureShuffleArray = <T>(array: T[]) => secureCrypto.secureShuffleArray(array);