import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { generateMemeWithAI } from "./_core/zhipuAI";
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
    generateWithAI: publicProcedure
      .input(
        z.object({
          keyword: z.string().min(1, "关键词不能为空").max(100, "关键词过长"),
          style: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const memeText = await generateMemeWithAI(input.keyword, input.style);
          return {
            success: true,
            text: memeText,
          };
        } catch (error) {
          console.error('[Meme Generation] Error:', error);
          throw new Error('AI 生成失败，请稍后重试');
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
