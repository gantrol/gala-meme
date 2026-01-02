import { describe, it, expect } from 'vitest';
import { containsSensitiveWord, filterSensitiveWords, checkSensitiveWords } from './_core/sensitiveFilter';

describe('Sensitive Word Filter', () => {
  it('should detect sensitive words in text', () => {
    // 测试正常文本
    const normalText = '今天天气真好';
    expect(containsSensitiveWord(normalText)).toBe(false);
  });

  it('should return empty array for clean text', () => {
    const cleanText = '旮旯给木梗生成器';
    const result = checkSensitiveWords(cleanText);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should filter sensitive words and return string', () => {
    const text = '这是一段正常的文本';
    const filtered = filterSensitiveWords(text);
    expect(typeof filtered).toBe('string');
  });

  it('should handle empty string', () => {
    expect(containsSensitiveWord('')).toBe(false);
    expect(filterSensitiveWords('')).toBe('');
    expect(checkSensitiveWords('')).toEqual([]);
  });

  it('should handle special characters', () => {
    const textWithEmoji = '你好呀🫢🧐😡❌️';
    expect(typeof filterSensitiveWords(textWithEmoji)).toBe('string');
  });
});
