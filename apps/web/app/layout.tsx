import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "诗词轻学 · Classics Learning Platform",
  description: "一个面向中小学生的古诗词与古文学习平台，包含搜索、练习、学习进度、错题本与成就系统。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
