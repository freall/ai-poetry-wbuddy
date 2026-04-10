/**
 * 繁体中文 → 简体中文 转换工具
 *
 * 数据源 chinese-poetry 原始数据以繁体中文存储（标题、作者名、slug 等），
 * 本模块在前端数据映射层统一转为简体中文，确保所有页面文字为简体。
 */
import * as OpenCC from "opencc-js";

const converter = OpenCC.Converter({ from: "tw", to: "cn" });

/**
 * 将繁体中文文本转为简体中文。
 * 非字符串值原样返回，null/undefined 返回 null。
 */
export function t2s(value: string | null | undefined): string | null {
  if (value == null) return null;
  return converter(value);
}

/**
 * 将繁体中文文本转为简体中文，null/undefined 返回空字符串。
 */
export function t2sOrEmpty(value: string | null | undefined): string {
  if (value == null) return "";
  return converter(value);
}

/**
 * 转换字符串数组中的每个元素。
 */
export function t2sArray(values: string[]): string[] {
  return values.map((v) => converter(v));
}

/**
 * 转换 slug：将繁体 CJK 部分转为简体，保留连字符和 ASCII。
 */
export function t2sSlug(slug: string): string {
  return converter(slug);
}

// ─── 简体 → 繁体（搜索用） ──────────────────────────────
const reverseConverter = OpenCC.Converter({ from: "cn", to: "tw" });

/**
 * 将简体中文文本转为繁体中文。
 * 用于搜索时同时匹配数据库中的繁体原文。
 */
export function s2t(value: string): string {
  return reverseConverter(value);
}
