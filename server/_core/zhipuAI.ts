/**
 * Zhipu AI (智谱 AI) Integration Helper
 * Provides access to GLM-4 models for meme generation
 */

import { ENV } from './env';

export interface ZhipuMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ZhipuAIOptions {
  messages: ZhipuMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ZhipuAIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created: number;
  model: string;
}

/**
 * Call Zhipu AI API with GLM-4 model
 * @param options - Configuration for the API call
 * @returns Response from Zhipu AI
 */
export async function callZhipuAI(options: ZhipuAIOptions): Promise<ZhipuAIResponse> {
  const {
    messages,
    model = 'glm-4',
    temperature = 1.0,
    max_tokens = 2000,
  } = options;

  const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.zAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zhipu AI API 调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data as ZhipuAIResponse;
  } catch (error) {
    console.error('[Zhipu AI] API call failed:', error);
    throw error;
  }
}

/**
 * Generate meme text using Zhipu AI
 * @param keyword - The keyword to generate meme about
 * @param style - Optional style description
 * @returns Generated meme text
 */
export async function generateMemeWithAI(
  keyword: string,
  style?: string
): Promise<string> {
  const systemPrompt = `你是一个专业的网络梗文本生成器。你的任务是根据用户提供的关键词，生成有趣、夸张、充满网络用语和表情符号的梗文本。

生成规则：
1. 使用大量表情符号（🫢🧐😡❌️🗣❤🥰🎁🎆🎉😍😘🤨🤐🫨🤬👿😈等）
2. 采用夸张的语气和重复的句式
3. 模仿"旮旯给木"梗的结构：先说"你为啥直接..."，然后说"XX里不是这样"，接着列举正确的步骤，最后表达不满
4. 每个步骤都要加上相应的表情符号
5. 保持幽默和讽刺的语气
6. 文本长度控制在 150-300 字之间

参考示例：
你为啥直接跟我表白啊🫢🧐旮旯给木里不是这样😡❌️你应该多跟我聊天🗣然后提升我的好感度偶尔❤🥰给我送送礼物🎁然后在那个特殊节日🎆🎉时候跟我有特殊互动😍😘最后在某个我神秘事件中向我表白🥰❤️我同意在一起🤭然后给你看我的特殊CG啊🤨🤐你怎么直接上来跟我表白🫨🧐旮旯给木里根本不是这样😡🤬我不接受😡😡👿😈`;

  const userPrompt = style
    ? `请根据关键词"${keyword}"生成一段梗文本，风格要求：${style}`
    : `请根据关键词"${keyword}"生成一段梗文本`;

  const response = await callZhipuAI({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'glm-4',
    temperature: 1.0,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('AI 生成失败：未返回内容');
  }

  return content.trim();
}
