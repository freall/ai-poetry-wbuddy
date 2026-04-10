"use client";

import { useEffect, useState, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel, Keyboard } from "swiper/modules";
import { api } from "../../lib/api";
import type { WorkCard } from "../../lib/types";
import BrowseCard from "./components/browse-card";
import { Loader2 } from "lucide-react";

// 导入 Swiper 样式
import "swiper/css";
import "swiper/css/pagination";

export default function BrowsePage() {
  const [works, setWorks] = useState<WorkCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // 已加载作品ID集合，避免重复
  const loadedIdsRef = useRef<Set<string>>(new Set());
  
  // 初始加载随机作品
  useEffect(() => {
    loadRandomWorks();
  }, []);

  // 加载随机作品
  const loadRandomWorks = async () => {
    if (loadingMore || !hasMore) return;
    
    const wasInitial = works.length === 0;
    if (wasInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const { items } = await api.randomWorks({
        excludeIds: Array.from(loadedIdsRef.current),
        limit: 10,
      });
      
      if (items.length === 0) {
        setHasMore(false);
        return;
      }
      
      // 添加到已加载ID集合
      items.forEach((item: WorkCard) => loadedIdsRef.current.add(item.id));
      
      // 更新作品列表
      setWorks(prev => [...prev, ...items]);
      
    } catch (error: any) {
      console.error("加载随机作品失败:", error);
      console.error("错误详情:", error.message);
      console.error("错误栈:", error.stack);
      
      // 更具体的错误处理
      if (error.message && error.message.includes("401")) {
        setError("Supabase API密钥无效或已过期，请检查环境变量配置");
      } else if (error.message && error.message.includes("404")) {
        setError("数据库表不存在，请联系系统管理员");
      } else if (error.message && error.message.includes("Failed to fetch")) {
        setError("网络连接失败，请检查网络设置后重试");
      } else {
        setError("无法加载诗词作品，请稍后重试或联系管理员");
      }
      
      if (works.length === 0) {
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 滑动到边缘时加载更多
  const handleSlideChange = (swiper: any) => {
    setCurrentIndex(swiper.activeIndex);
    
    // 如果滑动到倒数第三个作品，预加载更多
    if (swiper.activeIndex >= works.length - 3 && hasMore && !loadingMore) {
      loadRandomWorks();
    }
  };

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === "ArrowDown" && currentIndex < works.length - 1) {
        setCurrentIndex(prev => prev + 1);
        if (currentIndex >= works.length - 3 && hasMore && !loadingMore) {
          loadRandomWorks();
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, works.length, hasMore, loadingMore]);

  if (loading && works.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-600 text-lg">正在加载诗词作品...</p>
          <p className="text-slate-400 text-sm mt-2">准备带您进入诗意的世界</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">诗词随机浏览</h1>
              <p className="text-slate-500 text-sm mt-1">上下滑动或使用键盘方向键浏览</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600">
                <span className="font-medium">{works.length}</span> 首作品已加载
              </div>
              <a href="/" className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">
                返回首页
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* 滑动区域 */}
      <main className="relative h-[calc(100vh-80px)]">
        {works.length > 0 ? (
          <>
            <Swiper
              direction="vertical"
              slidesPerView={1}
              spaceBetween={0}
              mousewheel={{
                forceToAxis: true,
                sensitivity: 0.5,
              }}
              keyboard={{
                enabled: true,
              }}
              modules={[Mousewheel, Keyboard]}
              className="h-full"
              onSlideChange={handleSlideChange}
              initialSlide={currentIndex}
            >
              {works.map((work, index) => (
                <SwiperSlide key={work.id} className="h-full">
                  <BrowseCard 
                    work={work} 
                    index={index}
                    isActive={currentIndex === index}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
            
            {/* 加载更多指示器 */}
            {loadingMore && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-slate-200">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-slate-600">正在加载更多作品...</span>
                </div>
              </div>
            )}
            
            {/* 操作提示 */}
            <div className="absolute bottom-4 left-4 z-10">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-slate-200 max-w-xs">
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-200 text-slate-700 text-xs">↑</span>
                  <span>上一首</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-200 text-slate-700 text-xs">↓</span>
                  <span>下一首</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            {error ? (
              <div className="text-center max-w-md p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-500 text-2xl">⚠️</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-3">加载失败</h3>
                <p className="text-slate-600 mb-6">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    loadRandomWorks();
                  }}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-lg"
                >
                  重新加载
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                  <span className="text-slate-400 text-2xl">📖</span>
                </div>
                <h3 className="text-lg font-medium text-slate-700 mb-2">暂无作品</h3>
                <p className="text-slate-500">尝试刷新页面重新加载</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}