"use client";

import type { WorkCard } from "../../../lib/types";
import { resolveAssetUrl } from "../../../lib/api";
import { BookOpen, User, Calendar, Hash, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface BrowseCardProps {
  work: WorkCard;
  index: number;
  isActive: boolean;
}

export default function BrowseCard({ work, index, isActive }: BrowseCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const coverUrl = resolveAssetUrl(work.coverAssetPath, work.slug);
  
  // 当卡片变为激活状态时，自动显示详情
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        setShowDetails(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShowDetails(false);
    }
  }, [isActive]);

  const handleDetailToggle = () => {
    setShowDetails(!showDetails);
  };

  // 格式化原文，保留换行
  const formattedText = work.originalText
    .split("\n")
    .map((line: string, i: number) => (
      <span key={i}>
        {line}
        <br />
      </span>
    ));

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 md:p-8">
      {/* 卡片主体 */}
      <div className={`relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ${
        isActive ? "scale-100 opacity-100" : "scale-95 opacity-70"
      }`}>
        {/* 封面背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-purple-50/80 to-pink-50/80"></div>
        
        {/* 封面图像 */}
        {coverUrl ? (
          <div className="absolute right-8 top-8 w-64 h-64 rounded-full overflow-hidden border-8 border-white/30 shadow-2xl">
            <img 
              src={coverUrl} 
              alt={work.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="absolute right-8 top-8 w-64 h-64 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 border-8 border-white/30 shadow-2xl flex items-center justify-center">
            <BookOpen className="w-20 h-20 text-blue-300" />
          </div>
        )}
        
        {/* 内容区域 */}
        <div className="relative z-10 p-8 md:p-12">
          {/* 作品序号 */}
          <div className="mb-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/50 text-slate-700 backdrop-blur-sm">
              <Hash className="w-3 h-3 mr-1" />
              第 {index + 1} 首
            </span>
          </div>
          
          {/* 标题和作者 */}
          <div className="mb-6">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-2">
              {work.title}
            </h2>
            <div className="flex items-center gap-3 text-slate-600">
              <span className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {work.authorName}
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {work.dynasty}
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-200 text-slate-700">
                {work.genre}
              </span>
            </div>
          </div>
          
          {/* 原文区域 */}
          <div className="mb-8">
            <div className="relative bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/40 shadow-lg">
              <div className="text-2xl md:text-3xl font-medium text-slate-800 leading-relaxed">
                {formattedText}
              </div>
            </div>
          </div>
          
          {/* 交互按钮 */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={handleDetailToggle}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                showDetails 
                  ? "bg-slate-700 text-white hover:bg-slate-800" 
                  : "bg-white/80 text-slate-700 hover:bg-white"
              } shadow-lg backdrop-blur-sm border border-white/40`}
            >
              {showDetails ? "隐藏详情" : "显示详情"}
            </button>
            
            <Link 
              href={`/works/${work.slug}`}
              className="px-6 py-3 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-lg transition-all flex items-center gap-2"
            >
              查看完整详情
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {/* 详情区域 */}
          {showDetails && (
            <div className="mt-6 animate-in fade-in duration-500">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/40 shadow-lg">
                {/* 背景介绍 */}
                {work.backgroundText && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">创作背景</h3>
                    <p className="text-slate-600 leading-relaxed">{work.backgroundText}</p>
                  </div>
                )}
                
                {/* 作者简介 */}
                {work.authorSummary && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">作者简介</h3>
                    <p className="text-slate-600 leading-relaxed">{work.authorSummary}</p>
                  </div>
                )}
                
                {/* 标签 */}
                {work.tags && work.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">作品标签</h3>
                    <div className="flex flex-wrap gap-2">
                      {work.tags.map((tag: string, i: number) => (
                        <span 
                          key={i} 
                          className="px-3 py-1 text-sm rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-slate-700 border border-white/40"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 分类信息 */}
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="px-3 py-1 text-sm rounded-full bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200">
              {work.collection}
            </span>
            {work.themeLabel && (
              <span className="px-3 py-1 text-sm rounded-full bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border border-purple-200">
                {work.themeLabel}
              </span>
            )}
            {work.textbookStage && (
              <span className="px-3 py-1 text-sm rounded-full bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200">
                {work.textbookStage}
              </span>
            )}
            <span className="px-3 py-1 text-sm rounded-full bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border border-amber-200">
              难度 {work.difficultyLevel}/5
            </span>
          </div>
        </div>
      </div>
      
      {/* 滑动提示 */}
      <div className={`mt-8 text-center transition-opacity duration-500 ${
        isActive ? "opacity-100" : "opacity-0"
      }`}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm">
          <span className="animate-bounce inline-block">↓</span>
          <span className="text-sm text-slate-600">滑动浏览下一首</span>
        </div>
      </div>
    </div>
  );
}