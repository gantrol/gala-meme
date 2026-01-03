/**
 * Pop Art Collage Style - Meme Generator Home Page
 * Design Philosophy: Magazine cutout aesthetic with vibrant colors, torn edges, and playful interactions
 * Color Palette: Bright yellow (#FFD700), pure red (#FF3B3B), sky blue (#3BAFFF), grass green (#3BFF7A)
 * Typography: Archivo Black for headings, Noto Sans SC for body, Fredoka One for accents
 * Layout: Asymmetric collage-style with color blocks and irregular edges
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Copy, Sparkles, RefreshCw, Cpu, Database, Zap } from "lucide-react";
import { useState } from "react";
import { generateMeme, getAllKeywords } from "@/lib/memeTemplates";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);

  const generateMutation = trpc.meme.generate.useMutation();

  // Maximum keyword length: 6 for Chinese, 12 for English
  const MAX_CHINESE_LENGTH = 6;
  const MAX_ENGLISH_LENGTH = 12;

  // Check if text is primarily Chinese
  const isPrimarilyChinese = (text: string): boolean => {
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    return chineseChars.length > text.length / 2;
  };

  // Get effective character count (Chinese counts as 1, English counts as 0.5)
  const getEffectiveLength = (text: string): { count: number; maxAllowed: number; isChinese: boolean } => {
    const isChinese = isPrimarilyChinese(text);
    if (isChinese) {
      // For Chinese text, count actual characters
      return { count: text.length, maxAllowed: MAX_CHINESE_LENGTH, isChinese: true };
    } else {
      // For English text, allow up to 12 characters
      return { count: text.length, maxAllowed: MAX_ENGLISH_LENGTH, isChinese: false };
    }
  };

  const handleGenerate = async () => {
    const trimmedInput = input.trim();
    
    if (!trimmedInput) {
      toast.error("请输入关键词！");
      return;
    }

    const { count, maxAllowed, isChinese } = getEffectiveLength(trimmedInput);
    if (count > maxAllowed) {
      const typeDesc = isChinese ? '中文' : '英文';
      toast.error("关键词过长！", {
        description: `${typeDesc}最多输入 ${maxAllowed} 个字符，当前 ${count} 个字符`
      });
      return;
    }

    setIsGenerating(true);
    setUsedModel(null);
    setCacheHit(null);
    
    try {
      // Use the new generate API with multi-model support
      const result = await generateMutation.mutateAsync({
        keyword: trimmedInput,
      });
      
      if (result.success && result.text) {
        setOutput(result.text);
        setUsedModel(result.modelDisplayName || result.model || null);
        setCacheHit(result.cacheHit || false);
        
        const cacheInfo = result.cacheHit ? '（缓存命中）' : '';
        const modelInfo = result.modelDisplayName || result.model || '未知';
        
        toast.success("生成成功！", {
          description: `使用模型：${modelInfo} ${cacheInfo}`
        });
      } else {
        toast.error("生成失败", {
          description: "请稍后重试"
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error("生成失败", {
        description: error instanceof Error ? error.message : "请稍后重试"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!output) {
      toast.error("还没有生成内容哦！");
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      toast.success("复制成功！", {
        description: "已复制到剪贴板 📋"
      });
    } catch (err) {
      toast.error("复制失败", {
        description: "请手动复制文本"
      });
    }
  };

  const handleReset = () => {
    setInput("");
    setOutput("");
    setUsedModel(null);
    setCacheHit(null);
    toast.info("已重置");
  };

  const keywords = getAllKeywords();

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#FFF8E7]">
      {/* Halftone pattern background */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle, #000 2px, transparent 2px)`,
            backgroundSize: '20px 20px'
          }}
        />
      </div>

      {/* Hero background image - asymmetric placement */}
      <div 
        className="absolute top-0 right-0 w-[60%] h-[400px] opacity-30 -rotate-3"
        style={{
          backgroundImage: 'url(/images/hero-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 container py-8 md:py-16">
        {/* Header section with emoji burst */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-12 md:mb-20">
          <div className="flex-1">
            <div className="inline-block bg-[#FF3B3B] text-white px-6 py-2 -rotate-2 pop-shadow-sm mb-6 animate-bounce-in">
              <span className="font-accent text-sm md:text-base">超好玩的梗生成器</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display mb-6 leading-tight animate-bounce-in" style={{ animationDelay: '0.1s' }}>
              旮旯给木<br/>
              <span className="text-[#FF3B3B]">梗生成器</span>
            </h1>
            
            <h2 className="text-lg md:text-xl font-medium text-black/80 max-w-xl animate-bounce-in" style={{ animationDelay: '0.2s' }}>
              输入关键词，一键生成爆笑梗文本！支持「旮旯给木」「套壳网站」等热门梗模板 🎨✨
            </h2>
          </div>

          <div className="w-48 h-48 md:w-64 md:h-64 flex-shrink-0 animate-bounce-in" style={{ animationDelay: '0.3s' }}>
            <img 
              src="/images/emoji-burst.png" 
              alt="Emoji burst"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Main generator section - asymmetric layout */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Input section - yellow block */}
          <Card className="relative bg-[#FFD700] border-4 border-black pop-shadow-lg p-6 md:p-8 rotate-1 animate-stamp">
            <div className="absolute -top-4 -left-4 bg-[#3BAFFF] text-white px-4 py-2 rotate-6 pop-shadow-sm">
              <Sparkles className="inline w-5 h-5 mr-2" />
              <span className="font-accent text-sm">输入区</span>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block font-display text-xl md:text-2xl text-black">
                输入关键词
              </label>
              
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入关键词（中文最多6字/英文最多12字符），如「旮屻给木」「套壳网站」..."
                className="min-h-[120px] text-lg border-4 border-black bg-white resize-none font-medium focus-visible:ring-[#FF3B3B] focus-visible:ring-4"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-[#FF3B3B] hover:bg-[#FF3B3B]/90 text-white border-4 border-black pop-shadow hover:pop-shadow-sm transition-all font-accent text-lg px-6 py-6"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      生成梗文本
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="border-4 border-black pop-shadow hover:pop-shadow-sm transition-all font-medium text-base px-6 py-6 bg-white"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  重置
                </Button>
              </div>
            </div>
          </Card>

          {/* Output section - blue block */}
          <Card className="relative bg-[#3BAFFF] border-4 border-black pop-shadow-lg p-6 md:p-8 -rotate-1 animate-stamp" style={{ animationDelay: '0.2s' }}>
            <div className="absolute -top-4 -right-4 bg-[#3BFF7A] text-black px-4 py-2 -rotate-6 pop-shadow-sm">
              <span className="font-accent text-sm">✨ 输出区</span>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block font-display text-xl md:text-2xl text-white">
                  生成结果
                </label>
                
                {/* Model info badge */}
                {usedModel && (
                  <div className="flex items-center gap-2">
                    {cacheHit ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#3BFF7A] text-black text-xs font-bold rounded-full border-2 border-black">
                        <Database className="w-3 h-3" />
                        缓存
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#FFD700] text-black text-xs font-bold rounded-full border-2 border-black">
                        <Zap className="w-3 h-3" />
                        新生成
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-white text-black text-xs font-bold rounded-full border-2 border-black">
                      <Cpu className="w-3 h-3" />
                      {usedModel}
                    </span>
                  </div>
                )}
              </div>

              <div className="min-h-[120px] p-4 bg-white border-4 border-black text-black text-base md:text-lg leading-relaxed whitespace-pre-wrap font-medium">
                {output || (
                  <span className="text-black/40">
                    生成的梗文本会显示在这里...
                  </span>
                )}
              </div>

              <Button
                onClick={handleCopy}
                disabled={!output}
                className="w-full bg-[#3BFF7A] hover:bg-[#3BFF7A]/90 text-black border-4 border-black pop-shadow hover:pop-shadow-sm transition-all font-accent text-lg py-6"
              >
                <Copy className="w-5 h-5 mr-2" />
                复制文本
              </Button>
            </div>
          </Card>
        </div>

        {/* Keywords showcase - torn paper style */}
        <Card className="relative bg-white border-4 border-black pop-shadow p-6 md:p-8 animate-stamp" style={{ animationDelay: '0.4s' }}>
          <div className="absolute -top-3 left-8 bg-[#FF3B3B] text-white px-6 py-2 rotate-2 pop-shadow-sm">
            <span className="font-accent">🔥 支持的梗</span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {keywords.map((keyword, index) => (
              <button
                key={keyword}
                onClick={() => {
                  setInput(keyword);
                  toast.info(`已选择「${keyword}」`, {
                    description: "点击生成按钮试试吧！"
                  });
                }}
                className="px-6 py-3 bg-[#FFD700] hover:bg-[#FFD700]/90 border-3 border-black pop-shadow-sm hover:translate-y-1 hover:shadow-none transition-all font-accent text-base md:text-lg animate-bounce-in"
                style={{ 
                  animationDelay: `${0.5 + index * 0.1}s`,
                  transform: `rotate(${index % 2 === 0 ? '1deg' : '-1deg'})`
                }}
              >
                {keyword}
              </button>
            ))}
          </div>

          <p className="mt-6 text-black/60 font-medium text-sm md:text-base">
            💡 提示：点击上方关键词快速填充，或输入任意关键词（最多6个字），系统会智能选择最优模型生成！
          </p>
          
          {/* Model info */}
          <div className="mt-4 pt-4 border-t-2 border-black/10">
            <p className="text-black/50 text-xs md:text-sm">
              🤖 支持模型：GLM-4.7（高质量）· GLM-4-Air（快速）· Kimi K2（创意）
            </p>
          </div>
        </Card>

        {/* Footer with pattern */}
        <div className="mt-16 text-center relative">
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'url(/images/pattern-dots.png)',
              backgroundSize: '200px 200px',
              backgroundRepeat: 'repeat'
            }}
          />
          <p className="relative text-black/60 font-medium text-sm md:text-base">
            Made with 💖 by Manus · 波普艺术拼贴风格
          </p>
        </div>
      </div>
    </div>
  );
}
