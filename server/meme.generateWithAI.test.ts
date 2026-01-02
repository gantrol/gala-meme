import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as zhipuAI from "./_core/zhipuAI";
import * as sensitiveFilter from "./_core/sensitiveFilter";

// Mock the Zhipu AI module
vi.mock("./_core/zhipuAI", () => ({
  generateMemeWithAI: vi.fn(),
}));

// Mock the sensitive filter module
vi.mock("./_core/sensitiveFilter", () => ({
  containsSensitiveWord: vi.fn().mockReturnValue(false),
  filterSensitiveWords: vi.fn((text: string) => text),
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

describe("meme.generateWithAI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate meme text with valid keyword", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const mockMemeText = "你为啥直接这样啊🫢🧐测试梗里不是这样😡❌️你应该先做测试🗣然后提升代码质量偶尔❤🥰写写文档🎁然后在那个特殊时刻🎆🎉进行部署😍😘最后在某个神秘事件中庆祝成功🥰❤️";

    vi.mocked(zhipuAI.generateMemeWithAI).mockResolvedValue(mockMemeText);

    const result = await caller.meme.generateWithAI({
      keyword: "测试",
    });

    expect(result.success).toBe(true);
    expect(result.text).toBe(mockMemeText);
    expect(zhipuAI.generateMemeWithAI).toHaveBeenCalledWith("测试", undefined);
  });

  it("should generate meme text with keyword and style", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const mockMemeText = "你为啥直接这样啊🫢🧐测试梗里不是这样😡❌️";

    vi.mocked(zhipuAI.generateMemeWithAI).mockResolvedValue(mockMemeText);

    const result = await caller.meme.generateWithAI({
      keyword: "测试",
      style: "幽默风格",
    });

    expect(result.success).toBe(true);
    expect(result.text).toBe(mockMemeText);
    expect(zhipuAI.generateMemeWithAI).toHaveBeenCalledWith("测试", "幽默风格");
  });

  it("should reject empty keyword", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.meme.generateWithAI({
        keyword: "",
      })
    ).rejects.toThrow();
  });

  it("should reject keyword that is too long", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const longKeyword = "a".repeat(101);

    await expect(
      caller.meme.generateWithAI({
        keyword: longKeyword,
      })
    ).rejects.toThrow();
  });

  it("should handle AI generation errors gracefully", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(sensitiveFilter.containsSensitiveWord).mockReturnValue(false);
    vi.mocked(zhipuAI.generateMemeWithAI).mockRejectedValue(
      new Error("API rate limit exceeded")
    );

    await expect(
      caller.meme.generateWithAI({
        keyword: "测试",
      })
    ).rejects.toThrow("AI 生成失败，请稍后重试");
  });

  it("should reject input containing sensitive words", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(sensitiveFilter.containsSensitiveWord).mockReturnValue(true);

    await expect(
      caller.meme.generateWithAI({
        keyword: "敏感词测试",
      })
    ).rejects.toThrow("输入内容包含敏感词，请修改后重试");
  });

  it("should filter sensitive words from AI generated text", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const mockMemeText = "你为啥直接这样啊🫢🧐测试梗里不是这样😡❌️";
    const filteredText = "你为啥直接这样啊🫢🧐***梗里不是这样😡❌️";

    vi.mocked(sensitiveFilter.containsSensitiveWord).mockReturnValue(false);
    vi.mocked(zhipuAI.generateMemeWithAI).mockResolvedValue(mockMemeText);
    vi.mocked(sensitiveFilter.filterSensitiveWords).mockReturnValue(filteredText);

    const result = await caller.meme.generateWithAI({
      keyword: "测试",
    });

    expect(result.success).toBe(true);
    expect(result.text).toBe(filteredText);
    expect(sensitiveFilter.filterSensitiveWords).toHaveBeenCalledWith(mockMemeText);
  });
});
