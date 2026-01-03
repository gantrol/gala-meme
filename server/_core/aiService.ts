/**
 * 多模型 AI 服务模块
 * 支持 GLM-4.7、GLM-4-Air、Kimi K2 等模型
 */

import { ENV } from './env';
import { acquireSlot, releaseSlot, getModelDisplayName } from './queueManager';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  modelDisplayName: string;
}

// 梗生成的系统提示词
const MEME_SYSTEM_PROMPT = `旮旯给木梗文本生成器。
用户输入：一个词，<word>
你输出：梗文本
处理要求：将<word>转换成对应的名词<n_word>跟动词<v_word>，两者可能相同。
- 使用大量表情符号，每个步骤都要加上相应的表情符号
- 结构模板：先说"你为啥直接<v_word>"，然后说"<n_word>里不是这样"，接着列举正确步骤，最后固定句式：“你怎么一上来就<v_word>{表情}<n_word>根本不是这样{表情}我不接受{表情}”
- 保持语气幽默、讽刺
- 文本长度控制在 150-300 字之间

参考示例：
- （关键词：旮旯给木或galgame，名词，转化成对应动词“恋爱”）：你为啥直接跟我表白啊🫢🧐旮旯给木里不是这样😡❌️你应该多跟我聊天🗣然后提升我的好感度偶尔❤🥰给我送送礼物🎁然后在那个特殊节日🎆🎉时候跟我有特殊互动😍😘最后在某个我神秘事件中向我表白🥰❤️我同意在一起🤭然后给你看我的特殊CG啊🤨🤐你怎么直接上来跟我表白🫨🧐旮旯给木里根本不是这样😡🤬我不接受😡😡👿😈
- （关键词：你好呀，动词，转化成对应名词“搭讪”）：你为啥直接说你好呀啊🫢🧐正常搭讪不是这样😡❌️你应该先偷瞄我几眼👀然后脸上露出尴尬的微笑🙂接着轻轻点头打招呼👋再来找我聊聊天🗣找找共同话题偶尔抛个梗🤣让我感受到你的幽默魅力🎭最后再用充满磁性的嗓音说你好呀🗣️❤️这样才够味儿嘛🤨🤐你怎么一上来就你好呀🫨🧐正常搭讪根本不是这样😡🤬我不接受😡😡👿😈`;

/**
 * 调用智谱 AI (GLM-4.7 或 GLM-4-Air)
 */
async function callZhipuModel(
  messages: AIMessage[],
  model: 'glm-4.7' | 'glm-4-air'
): Promise<string> {
  const apiModel = model === 'glm-4.7' ? 'glm-4' : 'glm-4-air';
  const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ENV.zAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: apiModel,
      messages,
      temperature: 1.0,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Zhipu AI API 调用失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Zhipu AI 未返回内容');
  }

  return content.trim();
}

/**
 * 调用 Kimi K2 模型
 */
async function callKimiModel(messages: AIMessage[]): Promise<string> {
  const url = 'https://api.moonshot.cn/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ENV.kimiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'kimi-k2-0711-preview',
      messages,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kimi API 调用失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Kimi AI 未返回内容');
  }

  return content.trim();
}

/**
 * 使用指定模型生成梗文本
 */
export async function generateWithModel(
  keyword: string,
  model: string,
  style?: string
): Promise<AIResponse> {
  // 获取执行槽位（等待排队）
  await acquireSlot(model);

  try {
    const userPrompt = style
      ? `请根据关键词"${keyword}"生成一段梗文本，风格要求：${style}`
      : `请根据关键词"${keyword}"生成一段梗文本`;

    const messages: AIMessage[] = [
      { role: 'system', content: MEME_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    let content: string;

    switch (model) {
      case 'glm-4.7':
        content = await callZhipuModel(messages, 'glm-4.7');
        break;
      case 'glm-4-air':
        content = await callZhipuModel(messages, 'glm-4-air');
        break;
      case 'kimi-k2':
        content = await callKimiModel(messages);
        break;
      default:
        throw new Error(`不支持的模型: ${model}`);
    }

    return {
      content,
      model,
      modelDisplayName: getModelDisplayName(model),
    };
  } finally {
    // 释放执行槽位
    releaseSlot(model);
  }
}

/**
 * 验证 Kimi API Key 是否有效
 */
export async function validateKimiApiKey(): Promise<boolean> {
  if (!ENV.kimiApiKey) {
    return false;
  }

  try {
    const response = await fetch('https://api.moonshot.cn/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ENV.kimiApiKey}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
