import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as sensitiveFilter from "./_core/sensitiveFilter";
import * as aiService from "./_core/aiService";
import * as cacheService from "./_core/cacheService";
import * as queueManager from "./_core/queueManager";

// Mock the AI service module
vi.mock("./_core/aiService", () => ({
  generateWithModel: vi.fn(),
  validateKimiApiKey: vi.fn().mockResolvedValue(true),
}));

// Mock the sensitive filter module
vi.mock("./_core/sensitiveFilter", () => ({
  containsSensitiveWord: vi.fn().mockReturnValue(false),
  filterSensitiveWords: vi.fn((text: string) => text),
}));

// Mock the cache service module
vi.mock("./_core/cacheService", () => ({
  getFromCache: vi.fn().mockResolvedValue({ hit: false }),
  saveToCache: vi.fn().mockResolvedValue(undefined),
  logRequest: vi.fn().mockResolvedValue(undefined),
  getCacheStats: vi.fn().mockResolvedValue({ totalCached: 0, totalRequests: 0, cacheHitRate: 0 }),
}));

// Mock the queue manager module
vi.mock("./_core/queueManager", () => ({
  selectBestModel: vi.fn().mockReturnValue('glm-4-air'),
  getQueueStatus: vi.fn().mockReturnValue({}),
  getModelDisplayName: vi.fn((model: string) => model),
  MODEL_CONFIGS: {
    'glm-4.7': { name: 'GLM-4.7', maxConcurrency: 2, rpm: 500 },
    'glm-4-air': { name: 'GLM-4-Air', maxConcurrency: 100, rpm: 500 },
    'kimi-k2': { name: 'Kimi K2', maxConcurrency: 100, rpm: 500 },
  },
}));

function createTestContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("meme.generate (new multi-model API)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate meme text with valid keyword", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const mockMemeText = "你为啥直接这样啊🫢🧐测试梗里不是这样😡❌️";

    vi.mocked(aiService.generateWithModel).mockResolvedValue({
      content: mockMemeText,
      model: 'glm-4-air',
      modelDisplayName: 'GLM-4-Air',
    });

    const result = await caller.meme.generate({
      keyword: "测试",
    });

    expect(result.success).toBe(true);
    expect(result.text).toBe(mockMemeText);
    expect(result.model).toBe('glm-4-air');
  });

  it("should return cached result when cache hit", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const cachedText = "缓存的梗文本🫢🧐";

    vi.mocked(cacheService.getFromCache).mockResolvedValue({
      hit: true,
      text: cachedText,
      model: 'glm-4-air',
    });

    const result = await caller.meme.generate({
      keyword: "缓存测试",
    });

    expect(result.success).toBe(true);
    expect(result.text).toBe(cachedText);
    expect(result.cacheHit).toBe(true);
    // Should not call AI service when cache hit
    expect(aiService.generateWithModel).not.toHaveBeenCalled();
  });

  it("should reject input containing sensitive words", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(sensitiveFilter.containsSensitiveWord).mockReturnValue(true);

    await expect(
      caller.meme.generate({
        keyword: "敏感词测试",
      })
    ).rejects.toThrow("输入内容包含敏感词，请修改后重试");
  });

  it("should filter sensitive words from AI generated text", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const mockMemeText = "你为啥直接这样啊🫢🤨测试梗里不是这样😡❌️";
    const filteredText = "你为啥直接这样啊🫢🤨***梗里不是这样😡❌️";

    // Reset cache mock to not hit
    vi.mocked(cacheService.getFromCache).mockResolvedValue({ hit: false });
    vi.mocked(sensitiveFilter.containsSensitiveWord).mockReturnValue(false);
    vi.mocked(aiService.generateWithModel).mockResolvedValue({
      content: mockMemeText,
      model: 'glm-4-air',
      modelDisplayName: 'GLM-4-Air',
    });
    vi.mocked(sensitiveFilter.filterSensitiveWords).mockReturnValue(filteredText);

    const result = await caller.meme.generate({
      keyword: "敏感词过滤测试",
    });

    expect(result.success).toBe(true);
    expect(result.text).toBe(filteredText);
    expect(sensitiveFilter.filterSensitiveWords).toHaveBeenCalledWith(mockMemeText);
  });

  it("should reject empty keyword", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.meme.generate({
        keyword: "",
      })
    ).rejects.toThrow();
  });

  it("should reject keyword that is too long", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const longKeyword = "a".repeat(101);

    await expect(
      caller.meme.generate({
        keyword: longKeyword,
      })
    ).rejects.toThrow();
  });
});

describe("meme.generateWithAI (legacy API)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should still work with legacy API", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const mockMemeText = "你为啥直接这样啊🫢🤨测试梗里不是这样😡❌️";

    // Reset cache mock to not hit
    vi.mocked(cacheService.getFromCache).mockResolvedValue({ hit: false });
    vi.mocked(sensitiveFilter.containsSensitiveWord).mockReturnValue(false);
    vi.mocked(sensitiveFilter.filterSensitiveWords).mockReturnValue(mockMemeText);
    vi.mocked(aiService.generateWithModel).mockResolvedValue({
      content: mockMemeText,
      model: 'glm-4-air',
      modelDisplayName: 'GLM-4-Air',
    });

    const result = await caller.meme.generateWithAI({
      keyword: "旧API测试",
    });

    expect(result.success).toBe(true);
    expect(result.text).toBe(mockMemeText);
  });
});

describe("meme.getModels", () => {
  it("should return available models", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const models = await caller.meme.getModels();

    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty('id');
    expect(models[0]).toHaveProperty('name');
    expect(models[0]).toHaveProperty('maxConcurrency');
    expect(models[0]).toHaveProperty('rpm');
  });
});
