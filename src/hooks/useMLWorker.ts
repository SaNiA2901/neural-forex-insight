/**
 * ML Worker Hook
 * Provides interface for using ML computation Web Worker
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/utils/errorHandler';

interface MLWorkerTask {
  id: string;
  type: 'FEATURE_EXTRACTION' | 'PREDICTION' | 'TRAINING';
  payload: any;
  onProgress?: (progress: number, status: string) => void;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

interface MLWorkerHookResult {
  executeTask: (task: Omit<MLWorkerTask, 'id'>) => Promise<any>;
  cancelTask: (taskId: string) => void;
  isWorkerAvailable: boolean;
  activeTasks: string[];
}

export const useMLWorker = (): MLWorkerHookResult => {
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerAvailable, setIsWorkerAvailable] = useState(false);
  const [activeTasks, setActiveTasks] = useState<string[]>([]);
  const pendingTasks = useRef<Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    onProgress?: (progress: number, status: string) => void;
  }>>(new Map());

  // Initialize worker
  useEffect(() => {
    try {
      // Check if Web Workers are supported
      if (typeof Worker === 'undefined') {
        logger.warn('Web Workers not supported in this environment');
        return;
      }

      // Create worker
      workerRef.current = new Worker(
        new URL('../workers/mlWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // Handle worker messages
      workerRef.current.onmessage = (event) => {
        const { id, type, payload } = event.data;
        const task = pendingTasks.current.get(id);

        if (!task) return;

        switch (type) {
          case 'SUCCESS':
            task.resolve(payload);
            pendingTasks.current.delete(id);
            setActiveTasks(prev => prev.filter(taskId => taskId !== id));
            logger.debug('ML Worker task completed', { taskId: id });
            break;

          case 'ERROR':
            task.reject(new Error(payload.error));
            pendingTasks.current.delete(id);
            setActiveTasks(prev => prev.filter(taskId => taskId !== id));
            logger.error('ML Worker task failed', { taskId: id, error: payload.error });
            break;

          case 'PROGRESS':
            if (task.onProgress) {
              task.onProgress(payload.progress, payload.status);
            }
            break;
        }
      };

      // Handle worker errors
      workerRef.current.onerror = (error) => {
        logger.error('ML Worker error', { error });
        errorHandler.handleError(new Error('ML Worker error'), { 
          context: 'ml-worker',
          error 
        });
        setIsWorkerAvailable(false);
      };

      setIsWorkerAvailable(true);
      logger.info('ML Worker initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize ML Worker', { error });
      setIsWorkerAvailable(false);
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      pendingTasks.current.clear();
      setActiveTasks([]);
      setIsWorkerAvailable(false);
    };
  }, []);

  // Execute ML task
  const executeTask = useCallback(async (task: Omit<MLWorkerTask, 'id'>): Promise<any> => {
    if (!workerRef.current || !isWorkerAvailable) {
      throw new Error('ML Worker not available');
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      // Store task callbacks
      pendingTasks.current.set(taskId, {
        resolve,
        reject,
        onProgress: task.onProgress
      });

      // Add to active tasks
      setActiveTasks(prev => [...prev, taskId]);

      // Send task to worker
      workerRef.current!.postMessage({
        id: taskId,
        type: task.type,
        payload: task.payload
      });

      logger.debug('ML Worker task started', { taskId, type: task.type });

      // Set timeout for task (prevent hanging)
      setTimeout(() => {
        if (pendingTasks.current.has(taskId)) {
          pendingTasks.current.delete(taskId);
          setActiveTasks(prev => prev.filter(id => id !== taskId));
          reject(new Error('ML Worker task timeout'));
        }
      }, 300000); // 5 minutes timeout
    });
  }, [isWorkerAvailable]);

  // Cancel task
  const cancelTask = useCallback((taskId: string) => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({
      id: taskId,
      type: 'CANCEL',
      payload: {}
    });

    // Clean up task
    if (pendingTasks.current.has(taskId)) {
      pendingTasks.current.delete(taskId);
      setActiveTasks(prev => prev.filter(id => id !== taskId));
    }

    logger.debug('ML Worker task cancelled', { taskId });
  }, []);

  return {
    executeTask,
    cancelTask,
    isWorkerAvailable,
    activeTasks
  };
};