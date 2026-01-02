import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 梗文本缓存表 - 存储请求和响应缓存
export const memeCache = mysqlTable("meme_cache", {
  id: int("id").autoincrement().primaryKey(),
  /** 输入关键词 */
  keyword: varchar("keyword", { length: 100 }).notNull(),
  /** 使用的模型名称 */
  model: varchar("model", { length: 64 }).notNull(),
  /** 生成的梗文本 */
  generatedText: text("generatedText").notNull(),
  /** 创建时间 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 访问次数 */
  accessCount: int("accessCount").default(1).notNull(),
  /** 最后访问时间 */
  lastAccessedAt: timestamp("lastAccessedAt").defaultNow().notNull(),
});

export type MemeCache = typeof memeCache.$inferSelect;
export type InsertMemeCache = typeof memeCache.$inferInsert;

// 请求日志表 - 用于统计和监控
export const requestLogs = mysqlTable("request_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** 请求关键词 */
  keyword: varchar("keyword", { length: 100 }).notNull(),
  /** 使用的模型 */
  model: varchar("model", { length: 64 }).notNull(),
  /** 是否命中缓存 */
  cacheHit: int("cacheHit").default(0).notNull(),
  /** 响应时间(ms) */
  responseTime: int("responseTime"),
  /** 请求时间 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RequestLog = typeof requestLogs.$inferSelect;
export type InsertRequestLog = typeof requestLogs.$inferInsert;