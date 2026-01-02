/**
 * 缓存服务模块
 * 存储和检索梗文本生成结果
 */

import { getDb } from '../db';
import { memeCache, requestLogs } from '../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface CacheResult {
  hit: boolean;
  text?: string;
  model?: string;
}

/**
 * 查询缓存
 */
export async function getFromCache(keyword: string, model: string): Promise<CacheResult> {
  try {
    const db = await getDb();
    if (!db) {
      return { hit: false };
    }

    const result = await db
      .select()
      .from(memeCache)
      .where(
        and(
          eq(memeCache.keyword, keyword),
          eq(memeCache.model, model)
        )
      )
      .limit(1);

    if (result.length > 0) {
      // 更新访问次数和最后访问时间
      await db
        .update(memeCache)
        .set({
          accessCount: sql`${memeCache.accessCount} + 1`,
          lastAccessedAt: new Date(),
        })
        .where(eq(memeCache.id, result[0].id));

      return {
        hit: true,
        text: result[0].generatedText,
        model: result[0].model,
      };
    }

    return { hit: false };
  } catch (error) {
    console.error('[CacheService] Error getting from cache:', error);
    return { hit: false };
  }
}

/**
 * 保存到缓存
 */
export async function saveToCache(
  keyword: string,
  model: string,
  generatedText: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      return;
    }

    await db.insert(memeCache).values({
      keyword,
      model,
      generatedText,
    });
  } catch (error) {
    console.error('[CacheService] Error saving to cache:', error);
    // 不抛出错误，缓存失败不影响主流程
  }
}

/**
 * 记录请求日志
 */
export async function logRequest(
  keyword: string,
  model: string,
  cacheHit: boolean,
  responseTime?: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      return;
    }

    await db.insert(requestLogs).values({
      keyword,
      model,
      cacheHit: cacheHit ? 1 : 0,
      responseTime: responseTime ?? null,
    });
  } catch (error) {
    console.error('[CacheService] Error logging request:', error);
    // 不抛出错误，日志失败不影响主流程
  }
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats(): Promise<{
  totalCached: number;
  totalRequests: number;
  cacheHitRate: number;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        totalCached: 0,
        totalRequests: 0,
        cacheHitRate: 0,
      };
    }

    const [cacheCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(memeCache);

    const [requestCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(requestLogs);

    const [hitCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(requestLogs)
      .where(eq(requestLogs.cacheHit, 1));

    const totalRequests = Number(requestCount?.count ?? 0);
    const totalHits = Number(hitCount?.count ?? 0);

    return {
      totalCached: Number(cacheCount?.count ?? 0),
      totalRequests,
      cacheHitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
    };
  } catch (error) {
    console.error('[CacheService] Error getting cache stats:', error);
    return {
      totalCached: 0,
      totalRequests: 0,
      cacheHitRate: 0,
    };
  }
}
