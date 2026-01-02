// Pop Art Collage Style - Meme Templates
// Design Philosophy: Magazine cutout aesthetic with playful tone

export interface MemeTemplate {
  keyword: string;
  template: string;
}

export const memeTemplates: MemeTemplate[] = [
  {
    keyword: "旮旯给木",
    template: "你为啥直接跟我表白啊🫢🧐旮旯给木里不是这样😡❌️你应该多跟我聊天🗣然后提升我的好感度偶尔❤🥰给我送送礼物🎁然后在那个特殊节日🎆🎉时候跟我有特殊互动😍😘最后在某个我神秘事件中向我表白🥰❤️我同意在一起🤭然后给你看我的特殊CG啊🤨🤐你怎么直接上来跟我表白🫨🧐旮旯给木里根本不是这样😡🤬我不接受😡😡👿😈"
  },
  {
    keyword: "套壳网站",
    template: "你为啥几下子就把网站做成这样啊🫢🧐 套壳网站不是这样😡❌️ 你应该先搞个蓝紫色调夜间模式🗣️ 提升我的红温程度😡😡😡 给我吐出一堆代码看似有用但全是 Bug🎁 然后在某个深夜让我对着报错屏幕发呆🎆🎉 还要我在神秘力量帮助下勉强修好😍😘 最后让我自己折腾个一整晚怎么部署啊🤨🤐 你怎么还能一键部署、优化SEO🫨🧐 套壳网站根本不是这样😡🤬 我不接受😡😡👿😈"
  }
];

export function generateMeme(input: string): string | null {
  const normalizedInput = input.trim().toLowerCase();
  
  // Find exact match first
  const exactMatch = memeTemplates.find(
    t => t.keyword.toLowerCase() === normalizedInput
  );
  
  if (exactMatch) {
    return exactMatch.template;
  }
  
  // Find partial match
  const partialMatch = memeTemplates.find(
    t => t.keyword.toLowerCase().includes(normalizedInput) || 
         normalizedInput.includes(t.keyword.toLowerCase())
  );
  
  if (partialMatch) {
    return partialMatch.template;
  }
  
  return null;
}

export function getAllKeywords(): string[] {
  return memeTemplates.map(t => t.keyword);
}
