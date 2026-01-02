import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 敏感词列表
let sensitiveWords: Set<string> = new Set();

// 加载敏感词列表
function loadSensitiveWords(): void {
  try {
    const filePath = path.join(__dirname, 'sensitiveWords.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    const words = content.split('\n')
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length > 0);
    sensitiveWords = new Set(words);
    console.log(`[SensitiveFilter] Loaded ${sensitiveWords.size} sensitive words`);
  } catch (error) {
    console.error('[SensitiveFilter] Failed to load sensitive words:', error);
    sensitiveWords = new Set();
  }
}

// 初始化时加载敏感词
loadSensitiveWords();

/**
 * 检查文本是否包含敏感词
 * @param text 要检查的文本
 * @returns 包含的敏感词列表，如果没有则返回空数组
 */
export function checkSensitiveWords(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundWords: string[] = [];
  
  const wordsArray = Array.from(sensitiveWords);
  for (const word of wordsArray) {
    if (word.length > 1 && lowerText.includes(word)) {
      foundWords.push(word);
    }
  }
  
  return foundWords;
}

/**
 * 检查文本是否包含敏感词（简单版本，只返回是否包含）
 * @param text 要检查的文本
 * @returns 是否包含敏感词
 */
export function containsSensitiveWord(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  const wordsArray = Array.from(sensitiveWords);
  for (const word of wordsArray) {
    if (word.length > 1 && lowerText.includes(word)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 过滤敏感词，将敏感词替换为 ***
 * @param text 要过滤的文本
 * @returns 过滤后的文本
 */
export function filterSensitiveWords(text: string): string {
  let filteredText = text;
  const lowerText = text.toLowerCase();
  
  // 按长度排序，先替换长的词，避免短词破坏长词的替换
  const sortedWords = Array.from(sensitiveWords)
    .filter(word => word.length > 1)
    .sort((a, b) => b.length - a.length);
  
  for (const word of sortedWords) {
    if (lowerText.includes(word)) {
      // 使用正则表达式进行不区分大小写的替换
      const regex = new RegExp(escapeRegExp(word), 'gi');
      filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    }
  }
  
  return filteredText;
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 重新加载敏感词列表
 */
export function reloadSensitiveWords(): void {
  loadSensitiveWords();
}

/**
 * 获取敏感词数量
 */
export function getSensitiveWordCount(): number {
  return sensitiveWords.size;
}
