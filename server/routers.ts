import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { containsSensitiveWord, filterSensitiveWords } from "./_core/sensitiveFilter";
import { generateWithModel } from "./_core/aiService";
import { getFromCache, saveToCache, logRequest, getCacheStats } from "./_core/cacheService";
import { selectBestModel, getQueueStatus, getModelDisplayName, MODEL_CONFIGS } from "./_core/queueManager";
import { memeTemplates } from "../client/src/lib/memeTemplates";
import { z } from "zod";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Meme generator feature
  meme: router({
    // 生成梗文本（支持多模型、缓存、排队）
    generate: publicProcedure
      .input(
        z.object({
          keyword: z.string().min(1, "关键词不能为空").max(100, "关键词过长"),
          style: z.string().optional(),
          model: z.string().optional(), // 可选指定模型
        })
      )
      .mutation(async ({ input }) => {
        const startTime = Date.now();
        
        try {
          // 检查输入关键词是否包含敏感词
          if (containsSensitiveWord(input.keyword)) {
            throw new Error('输入内容包含敏感词，请修改后重试');
          }

          // 首先检查是否有预设模板
          const template = memeTemplates.find(
            t => t.keyword.toLowerCase() === input.keyword.toLowerCase()
          );
          
          if (template) {
            // 使用预设模板，记录日志
            await logRequest(input.keyword, 'template', true, Date.now() - startTime);
            return {
              success: true,
              text: template.template,
              model: 'template',
              modelDisplayName: '预设模板',
              cacheHit: true,
            };
          }

          // 选择模型（如果未指定则自动选择最优模型）
          const selectedModel = input.model || selectBestModel();
          
          // 检查缓存
          const cacheResult = await getFromCache(input.keyword, selectedModel);
          
          if (cacheResult.hit && cacheResult.text) {
            // 命中缓存，记录日志
            await logRequest(input.keyword, selectedModel, true, Date.now() - startTime);
            
            return {
              success: true,
              text: cacheResult.text,
              model: selectedModel,
              modelDisplayName: getModelDisplayName(selectedModel),
              cacheHit: true,
            };
          }

          // 未命中缓存，调用 AI 生成
          const result = await generateWithModel(input.keyword, selectedModel, input.style);
          
          // 过滤 AI 生成结果中的敏感词
          const filteredText = filterSensitiveWords(result.content);
          
          // 保存到缓存
          await saveToCache(input.keyword, selectedModel, filteredText);
          
          // 记录请求日志
          await logRequest(input.keyword, selectedModel, false, Date.now() - startTime);
          
          return {
            success: true,
            text: filteredText,
            model: selectedModel,
            modelDisplayName: result.modelDisplayName,
            cacheHit: false,
          };
        } catch (error) {
          console.error('[Meme Generation] Error:', error);
          if (error instanceof Error && error.message.includes('敏感词')) {
            throw error;
          }
          if (error instanceof Error && error.message.includes('超时')) {
            throw error;
          }
          throw new Error('AI 生成失败，请稍后重试');
        }
      }),

    // 兼容旧的 generateWithAI 接口
    generateWithAI: publicProcedure
      .input(
        z.object({
          keyword: z.string().min(1, "关键词不能为空").max(100, "关键词过长"),
          style: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const startTime = Date.now();
        
        try {
          // 检查输入关键词是否包含敏感词
          if (containsSensitiveWord(input.keyword)) {
            throw new Error('输入内容包含敏感词，请修改后重试');
          }

          // 选择最优模型
          const selectedModel = selectBestModel();
          
          // 检查缓存
          const cacheResult = await getFromCache(input.keyword, selectedModel);
          
          if (cacheResult.hit && cacheResult.text) {
            await logRequest(input.keyword, selectedModel, true, Date.now() - startTime);
            return {
              success: true,
              text: cacheResult.text,
            };
          }

          // 调用 AI 生成
          const result = await generateWithModel(input.keyword, selectedModel, input.style);
          
          // 过滤敏感词
          const filteredText = filterSensitiveWords(result.content);
          
          // 保存缓存
          await saveToCache(input.keyword, selectedModel, filteredText);
          await logRequest(input.keyword, selectedModel, false, Date.now() - startTime);
          
          return {
            success: true,
            text: filteredText,
          };
        } catch (error) {
          console.error('[Meme Generation] Error:', error);
          if (error instanceof Error && error.message.includes('敏感词')) {
            throw error;
          }
          throw new Error('AI 生成失败，请稍后重试');
        }
      }),

    // 获取队列状态
    getQueueStatus: publicProcedure.query(() => {
      return getQueueStatus();
    }),

    // 获取缓存统计
    getCacheStats: publicProcedure.query(async () => {
      return await getCacheStats();
    }),

    // 获取可用模型列表
    getModels: publicProcedure.query(() => {
      return Object.entries(MODEL_CONFIGS).map(([key, config]) => ({
        id: key,
        name: config.name,
        maxConcurrency: config.maxConcurrency,
        rpm: config.rpm,
      }));
    }),
  }),
});

export type AppRouter = typeof appRouter;
