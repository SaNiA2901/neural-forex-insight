/**
 * Redis Client Manager with Production Features
 * High-performance Redis client with connection pooling, error handling, and metrics
 */

import { createClient, RedisClientType, RedisModules, RedisFunctions, RedisScripts } from 'redis';
import { logger } from '@/utils/logger';
import { errorHandler, ErrorCategory } from '@/utils/errorHandler';

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  database?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
  keepAlive?: number;
  connectionTimeout?: number;
  commandTimeout?: number;
}

export interface RedisMetrics {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  averageResponseTime: number;
  connectionUptime: number;
  lastError?: string;
  isConnected: boolean;
}

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  version?: string;
  tags?: string[];
}

class RedisClientManager {
  private static instance: RedisClientManager;
  private client: RedisClientType<RedisModules, RedisFunctions, RedisScripts> | null = null;
  private config: RedisConfig;
  private metrics: RedisMetrics;
  private connectionStartTime: number = 0;
  private isConnecting: boolean = false;
  private fallbackCache: Map<string, CacheItem> = new Map();
  private maxFallbackSize = 1000;

  private constructor() {
    this.config = {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      database: parseInt(process.env.REDIS_DATABASE || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectionTimeout: 10000,
      commandTimeout: 5000
    };

    this.metrics = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      averageResponseTime: 0,
      connectionUptime: 0,
      isConnected: false
    };

    this.initializeClient();
  }

  static getInstance(): RedisClientManager {
    if (!RedisClientManager.instance) {
      RedisClientManager.instance = new RedisClientManager();
    }
    return RedisClientManager.instance;
  }

  private async initializeClient(): Promise<void> {
    if (this.isConnecting || this.client?.isReady) {
      return;
    }

    this.isConnecting = true;

    try {
      const clientConfig: any = {
        socket: {
          host: this.config.host,
          port: this.config.port,
          connectTimeout: this.config.connectionTimeout,
          commandTimeout: this.config.commandTimeout,
          keepAlive: this.config.keepAlive,
          noDelay: true
        },
        database: this.config.database
      };

      if (this.config.password) {
        clientConfig.password = this.config.password;
      }

      if (this.config.url) {
        this.client = createClient({ url: this.config.url });
      } else {
        this.client = createClient(clientConfig);
      }

      // Error handling
      this.client.on('error', (error) => {
        logger.error('Redis client error', { error });
        this.metrics.isConnected = false;
        this.metrics.lastError = error.message;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.connectionStartTime = Date.now();
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.metrics.isConnected = true;
        this.updateConnectionUptime();
      });

      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.metrics.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting');
      });

      // Connect with retry logic
      await this.connectWithRetry();

    } catch (error) {
      logger.error('Failed to initialize Redis client', { error });
      this.metrics.isConnected = false;
      this.metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      this.isConnecting = false;
    }
  }

  private async connectWithRetry(maxRetries: number = 3, retryDelay: number = 1000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (this.client) {
          await this.client.connect();
          logger.info('Redis connection established', { attempt });
          return;
        }
      } catch (error) {
        logger.warn(`Redis connection attempt ${attempt} failed`, { error, attempt, maxRetries });
        
        if (attempt === maxRetries) {
          errorHandler.handleError(error as Error, ErrorCategory.NETWORK, { context: 'redis_connection', maxRetriesExceeded: true });
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  async executeCommand<T = any>(
    command: () => Promise<T>,
    commandName: string,
    fallbackValue?: T
  ): Promise<T | null> {
    const startTime = performance.now();
    this.metrics.totalCommands++;

    try {
      if (!this.client?.isReady) {
        await this.ensureConnection();
      }

      const result = await command();
      
      const responseTime = performance.now() - startTime;
      this.updateAverageResponseTime(responseTime);
      this.metrics.successfulCommands++;
      
      logger.debug('Redis command executed', { 
        command: commandName, 
        responseTime: Math.round(responseTime * 100) / 100 
      });
      
      return result;

    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.metrics.failedCommands++;
      
      errorHandler.handleError(error as Error, ErrorCategory.DATA_PROCESSING, { context: 'redis_set', key: commandName, ttlSeconds: responseTime });
      
      logger.warn('Redis command failed, using fallback', { 
        command: commandName, 
        error, 
        responseTime: Math.round(responseTime * 100) / 100 
      });
      
      return fallbackValue ?? null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      
      const command = ttlSeconds 
        ? () => this.client!.setEx(key, ttlSeconds, serialized)
        : () => this.client!.set(key, serialized);

      const result = await this.executeCommand(command, 'SET');
      
      // Fallback to memory cache if Redis fails
      if (result === null && this.fallbackCache.size < this.maxFallbackSize) {
        this.fallbackCache.set(key, {
          data: value,
          timestamp: Date.now(),
          ttl: ttlSeconds || 3600,
        });
        return true;
      }
      
      return result === 'OK';

    } catch (error) {
      errorHandler.handleError(error as Error, ErrorCategory.DATA_PROCESSING, { context: 'redis_set', key, ttlSeconds });
      return false;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const result = await this.executeCommand(
        () => this.client!.get(key),
        'GET'
      );

      if (result !== null) {
        try {
          return typeof result === 'string' ? JSON.parse(result) : result;
        } catch {
          return result as T;
        }
      }

      // Check fallback cache
      const fallbackItem = this.fallbackCache.get(key);
      if (fallbackItem) {
        const now = Date.now();
        if (now - fallbackItem.timestamp < fallbackItem.ttl * 1000) {
          return fallbackItem.data;
        } else {
          this.fallbackCache.delete(key);
        }
      }

      return null;

    } catch (error) {
      errorHandler.handleError(error as Error, ErrorCategory.DATA_PROCESSING, { context: 'redis_get', key });
      
      // Return from fallback cache on error
      const fallbackItem = this.fallbackCache.get(key);
      return fallbackItem ? fallbackItem.data : null;
    }
  }

  async delete(key: string): Promise<number> {
    try {
      const result = await this.executeCommand(
        () => this.client!.del(key),
        'DEL'
      );

      // Also remove from fallback cache
      this.fallbackCache.delete(key);
      
      return result || 0;

    } catch (error) {
      errorHandler.handleError(error as Error, ErrorCategory.DATA_PROCESSING, { context: 'redis_delete', key });
      this.fallbackCache.delete(key);
      return 0;
    }
  }

  async deleteByTags(tags: string[]): Promise<number> {
    try {
      // This is a simplified implementation
      // In production, you'd want to use Redis modules like RedisSearch for tag-based operations
      const promises = tags.map(tag => this.delete(`tag:${tag}`));
      const results = await Promise.all(promises);
      return results.reduce((sum, count) => sum + count, 0);

    } catch (error) {
      errorHandler.handleError(error as Error, ErrorCategory.DATA_PROCESSING, { context: 'redis_delete_by_tags', tags });
      return 0;
    }
  }

  async clear(): Promise<boolean> {
    try {
      const result = await this.executeCommand(
        () => this.client!.flushDb(),
        'FLUSHDB'
      );

      // Clear fallback cache
      this.fallbackCache.clear();
      
      return result === 'OK';

    } catch (error) {
      errorHandler.handleError(error as Error, ErrorCategory.DATA_PROCESSING, { context: 'redis_clear' });
      this.fallbackCache.clear();
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.executeCommand(
        () => this.client!.ping(),
        'PING'
      );
      return result === 'PONG';

    } catch (error) {
      logger.warn('Redis health check failed', { error });
      return false;
    }
  }

  getClient(): RedisClientType<RedisModules, RedisFunctions, RedisScripts> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client;
  }

  getMetrics(): RedisMetrics {
    this.updateConnectionUptime();
    return { 
      ...this.metrics,
      // Add fallback cache metrics
      fallbackCacheSize: this.fallbackCache.size,
      fallbackCacheHitRate: this.metrics.failedCommands > 0 ? 
        (this.fallbackCache.size / this.metrics.failedCommands) * 100 : 0
    } as RedisMetrics & { fallbackCacheSize: number; fallbackCacheHitRate: number };
  }

  getConfig(): RedisConfig {
    return { ...this.config };
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
        logger.info('Redis client disconnected gracefully');
      } catch (error) {
        logger.error('Error during Redis disconnect', { error });
      } finally {
        this.client = null;
        this.metrics.isConnected = false;
      }
    }
  }

  // Private helper methods
  private async ensureConnection(): Promise<void> {
    if (!this.client?.isReady && !this.isConnecting) {
      await this.initializeClient();
    }
  }

  private updateAverageResponseTime(responseTime: number): void {
    const samples = 100; // Rolling average of last 100 commands
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (samples - 1) + responseTime) / samples;
  }

  private updateConnectionUptime(): void {
    if (this.metrics.isConnected && this.connectionStartTime) {
      this.metrics.connectionUptime = Date.now() - this.connectionStartTime;
    }
  }

  // Cleanup fallback cache periodically
  private cleanupFallbackCache(): void {
    const now = Date.now();
    for (const [key, item] of this.fallbackCache.entries()) {
      if (now - item.timestamp > item.ttl * 1000) {
        this.fallbackCache.delete(key);
      }
    }
  }

  // Start cleanup interval
  startCleanupInterval(intervalMs: number = 60000): void {
    setInterval(() => {
      this.cleanupFallbackCache();
    }, intervalMs);
  }
}

// Export singleton instance and class
export const redisClient = RedisClientManager.getInstance();
export { RedisClientManager };