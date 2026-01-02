/**
 * 排队系统和并发控制模块
 * 支持多模型的 RPM 限制和并发数控制
 */

interface ModelConfig {
  name: string;
  maxConcurrency: number;
  rpm: number;
}

interface QueueItem {
  id: string;
  model: string;
  resolve: (value: void) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

// 模型配置
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'glm-4.7': {
    name: 'GLM-4.7',
    maxConcurrency: 2,
    rpm: 500,
  },
  'glm-4-air': {
    name: 'GLM-4-Air',
    maxConcurrency: 100,
    rpm: 500,
  },
  'kimi-k2': {
    name: 'Kimi K2',
    maxConcurrency: 100,
    rpm: 500,
  },
};

// 每个模型的当前并发数
const currentConcurrency: Record<string, number> = {
  'glm-4.7': 0,
  'glm-4-air': 0,
  'kimi-k2': 0,
};

// 每个模型的请求队列
const queues: Record<string, QueueItem[]> = {
  'glm-4.7': [],
  'glm-4-air': [],
  'kimi-k2': [],
};

// 每个模型的请求时间戳记录（用于 RPM 控制）
const requestTimestamps: Record<string, number[]> = {
  'glm-4.7': [],
  'glm-4-air': [],
  'kimi-k2': [],
};

/**
 * 清理过期的请求时间戳（超过1分钟的）
 */
function cleanupTimestamps(model: string): void {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  requestTimestamps[model] = requestTimestamps[model].filter(ts => ts > oneMinuteAgo);
}

/**
 * 检查是否可以发起新请求（RPM 限制）
 */
function canMakeRequest(model: string): boolean {
  cleanupTimestamps(model);
  const config = MODEL_CONFIGS[model];
  return requestTimestamps[model].length < config.rpm;
}

/**
 * 获取当前队列状态
 */
export function getQueueStatus(): Record<string, { queueLength: number; currentConcurrency: number; rpm: number; maxConcurrency: number }> {
  const status: Record<string, { queueLength: number; currentConcurrency: number; rpm: number; maxConcurrency: number }> = {};
  
  for (const model of Object.keys(MODEL_CONFIGS)) {
    cleanupTimestamps(model);
    status[model] = {
      queueLength: queues[model].length,
      currentConcurrency: currentConcurrency[model],
      rpm: requestTimestamps[model].length,
      maxConcurrency: MODEL_CONFIGS[model].maxConcurrency,
    };
  }
  
  return status;
}

/**
 * 选择最优模型（基于当前负载）
 */
export function selectBestModel(): string {
  // 优先级：glm-4-air > kimi-k2 > glm-4.7（基于并发能力）
  const models = ['glm-4-air', 'kimi-k2', 'glm-4.7'];
  
  for (const model of models) {
    const config = MODEL_CONFIGS[model];
    cleanupTimestamps(model);
    
    // 检查并发数和 RPM 是否允许
    if (currentConcurrency[model] < config.maxConcurrency && canMakeRequest(model)) {
      return model;
    }
  }
  
  // 如果所有模型都满了，返回队列最短的模型
  let shortestQueue = models[0];
  let shortestLength = queues[models[0]].length;
  
  for (const model of models) {
    if (queues[model].length < shortestLength) {
      shortestLength = queues[model].length;
      shortestQueue = model;
    }
  }
  
  return shortestQueue;
}

/**
 * 处理队列中的下一个请求
 */
function processQueue(model: string): void {
  const config = MODEL_CONFIGS[model];
  
  while (
    queues[model].length > 0 &&
    currentConcurrency[model] < config.maxConcurrency &&
    canMakeRequest(model)
  ) {
    const item = queues[model].shift();
    if (item) {
      currentConcurrency[model]++;
      requestTimestamps[model].push(Date.now());
      item.resolve();
    }
  }
}

/**
 * 获取执行槽位（等待直到可以执行）
 */
export function acquireSlot(model: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const config = MODEL_CONFIGS[model];
    
    if (!config) {
      reject(new Error(`Unknown model: ${model}`));
      return;
    }
    
    // 检查是否可以立即执行
    if (currentConcurrency[model] < config.maxConcurrency && canMakeRequest(model)) {
      currentConcurrency[model]++;
      requestTimestamps[model].push(Date.now());
      resolve();
      return;
    }
    
    // 加入队列等待
    const item: QueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      model,
      resolve,
      reject,
      timestamp: Date.now(),
    };
    
    queues[model].push(item);
    
    // 设置超时（30秒）
    setTimeout(() => {
      const index = queues[model].findIndex(i => i.id === item.id);
      if (index !== -1) {
        queues[model].splice(index, 1);
        reject(new Error('请求超时，请稍后重试'));
      }
    }, 30000);
  });
}

/**
 * 释放执行槽位
 */
export function releaseSlot(model: string): void {
  if (currentConcurrency[model] > 0) {
    currentConcurrency[model]--;
  }
  
  // 处理队列中的下一个请求
  processQueue(model);
}

/**
 * 获取模型显示名称
 */
export function getModelDisplayName(model: string): string {
  return MODEL_CONFIGS[model]?.name || model;
}

/**
 * 获取所有可用模型列表
 */
export function getAvailableModels(): string[] {
  return Object.keys(MODEL_CONFIGS);
}
