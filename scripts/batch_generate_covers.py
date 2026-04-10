#!/usr/bin/env python3
"""
批量生成诗词古文封面图
支持为所有作品生成基本SVG封面，并为精选作品生成高质量AI封面

策略：
1. 精选作品（16首）：使用详细的意境SVG（已生成）
2. 唐诗宋词三百首（610首）：生成基本的SVG封面，基于主题、朝代、作者等
3. 后续可扩展：为热门作品生成AI图片封面
"""

import os
import json
import random
from typing import List, Dict, Tuple
import re

# 目录配置
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
OUTPUT_DIR = os.path.join(BASE_DIR, "apps", "web", "public", "images", "covers")
GENERATED_DIR = os.path.join(BASE_DIR, "apps", "web", "public", "images", "generated")
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(GENERATED_DIR, exist_ok=True)

# 精选作品列表（已有详细封面）
FEATURED_SLUGS = {
    # 古文精选
    "tao-hua-yuan-ji", "lou-shi-ming", "chu-shi-biao", 
    "yue-yang-lou-ji", "shi-shuo", "zui-weng-ting-ji",
    # 唐诗精选
    "chun-xiao", "wang-lu-shan-pu-bu", "deng-guan-que-lou",
    "jiang-xue", "fu-de-gu-yuan-cao-song-bie", "jing-ye-si",
    # 宋词精选
    "shui-diao-ge-tou-ming-yue-ji-shi-you", "nian-nu-jiao-chi-bi-huai-gu",
    "ru-meng-ling-zuo-ye-yu-shu-feng-zhou", "qing-yu-an-yuan-xi"
}

# 朝代颜色映射
DYNASTY_COLORS = {
    "晋": ("#4a148c", "#6a1b9a", "#8e24aa"),        # 紫色系
    "唐": ("#1565c0", "#1976d2", "#1e88e5"),        # 蓝色系
    "三国·蜀": ("#d32f2f", "#f44336", "#ef5350"),  # 红色系
    "宋": ("#388e3c", "#43a047", "#4caf50"),       # 绿色系
    "default": ("#5d4037", "#795548", "#8d6e63"),  # 棕色系（默认）
}

# 体裁图标映射
GENRE_ICONS = {
    "古文": "book",
    "诗": "mountain",  # 山水意象
    "词": "flower",    # 花月意象
}

# 主题颜色映射（基于作品主题词）
THEME_COLORS = {
    # 自然主题
    "春": ("#f8bbd0", "#f48fb1", "#fce4ec"),
    "夏": ("#ffcc80", "#ffb74d", "#fff3e0"),
    "秋": ("#ffe0b2", "#ffcc80", "#fff8e1"),
    "冬": ("#e1f5fe", "#b3e5fc", "#f5f5f5"),
    "山": ("#546e7a", "#78909c", "#b0bec5"),
    "水": ("#4fc3f7", "#81d4fa", "#e1f5fe"),
    "月": ("#fff9c4", "#fff59d", "#fffde7"),
    "花": ("#f8bbd0", "#f48fb1", "#e1bee7"),
    "草": ("#c8e6c9", "#a5d6a7", "#81c784"),
    "鸟": ("#ffecb3", "#ffe082", "#ffd54f"),
    # 情感主题
    "思": ("#9fa8da", "#7986cb", "#5c6bc0"),
    "愁": ("#90a4ae", "#78909c", "#607d8b"),
    "乐": ("#ffcc80", "#ffb74d", "#ffa726"),
    "悲": ("#b39ddb", "#9575cd", "#7e57c2"),
    # 生活主题
    "酒": ("#ffccbc", "#ffab91", "#ff8a65"),
    "茶": ("#d7ccc8", "#bcaaa4", "#a1887f"),
    "家": ("#ffcc80", "#ffb74d", "#ffa726"),
    "国": ("#ef9a9a", "#e57373", "#ef5350"),
}

def load_dataset() -> Dict:
    """加载数据集"""
    data_path = os.path.join(DATA_DIR, "classics-library.json")
    with open(data_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def slugify(text: str) -> str:
    """将标题转换为slug格式"""
    # 移除标点，转换为小写，用-连接
    text = re.sub(r'[^\w\s-]', '', text.lower())
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')

def extract_themes(original_text: str, tags: List[str]) -> List[str]:
    """从原文和标签中提取主题词"""
    themes = set()
    
    # 从标签中提取
    for tag in tags:
        if len(tag) <= 3:  # 短标签可能是主题词
            themes.add(tag)
    
    # 从原文中提取常见主题词
    common_themes = ["春", "夏", "秋", "冬", "山", "水", "月", "花", 
                    "草", "鸟", "风", "雨", "雪", "云", "酒", "茶",
                    "思", "愁", "乐", "悲", "家", "国", "梦"]
    
    for theme in common_themes:
        if theme in original_text:
            themes.add(theme)
    
    return list(themes)

def get_work_info(work: Dict) -> Tuple[str, str, str, str, List[str]]:
    """从作品中提取信息"""
    slug = work.get("slug", "")
    title = work.get("title", "")
    author = work.get("author", "") or "佚名"
    dynasty = work.get("dynasty", "")
    genre = work.get("genre", "")
    tags = work.get("tags", [])
    original_text = work.get("original_text", "")
    
    # 如果没有slug，从标题生成
    if not slug:
        slug = slugify(title)
    
    # 提取主题
    themes = extract_themes(original_text, tags)
    
    return slug, title, author, dynasty, genre, themes

def get_color_scheme(dynasty: str, genre: str, themes: List[str]) -> Tuple[str, str, str]:
    """获取颜色方案"""
    # 优先使用主题颜色
    for theme in themes:
        if theme in THEME_COLORS:
            return THEME_COLORS[theme]
    
    # 其次使用朝代颜色
    if dynasty in DYNASTY_COLORS:
        return DYNASTY_COLORS[dynasty]
    
    # 最后使用体裁相关颜色
    if genre == "诗":
        return ("#1565c0", "#1976d2", "#1e88e5")  # 诗 - 蓝色
    elif genre == "词":
        return ("#388e3c", "#43a047", "#4caf50")  # 词 - 绿色
    else:
        return DYNASTY_COLORS["default"]

def get_icon(genre: str, themes: List[str]) -> str:
    """获取图标类型"""
    if genre in GENRE_ICONS:
        return GENRE_ICONS[genre]
    
    # 根据主题选择图标
    if any(t in themes for t in ["山", "水"]):
        return "mountain"
    elif any(t in themes for t in ["花", "草"]):
        return "flower"
    elif any(t in themes for t in ["月", "星"]):
        return "moon"
    elif any(t in themes for t in ["酒", "茶"]):
        return "cup"
    elif any(t in themes for t in ["思", "愁"]):
        return "heart"
    else:
        return "book"

def generate_basic_svg(slug: str, title: str, author: str, dynasty: str, 
                       genre: str, color_scheme: Tuple[str, str, str], 
                       icon_type: str) -> str:
    """生成基本的SVG封面"""
    c1, c2, c3 = color_scheme
    
    # 根据图标类型生成简单的图形
    if icon_type == "mountain":
        icon_svg = """
        <!-- 远山 -->
        <g opacity="0.15">
          <path d="M0 600 Q150 450 300 550 Q400 500 500 450 Q600 400 700 500 L800 600 L800 800 L0 800 Z" 
                fill="#37474f" opacity="0.3"/>
        </g>"""
    elif icon_type == "flower":
        icon_svg = """
        <!-- 花朵 -->
        <g opacity="0.15">
          <circle cx="400" cy="300" r="80" fill="#f48fb1" opacity="0.3"/>
          <circle cx="500" cy="350" r="60" fill="#f06292" opacity="0.2"/>
          <circle cx="300" cy="350" r="60" fill="#f8bbd0" opacity="0.2"/>
        </g>"""
    elif icon_type == "moon":
        icon_svg = """
        <!-- 月亮 -->
        <g opacity="0.15">
          <circle cx="600" cy="250" r="70" fill="#fff9c4" opacity="0.2"/>
        </g>"""
    elif icon_type == "cup":
        icon_svg = """
        <!-- 酒杯 -->
        <g opacity="0.15">
          <ellipse cx="400" cy="350" rx="40" ry="60" fill="#ffcc80" opacity="0.2"/>
          <ellipse cx="400" cy="320" rx="25" ry="10" fill="#ffb74d" opacity="0.3"/>
        </g>"""
    elif icon_type == "heart":
        icon_svg = """
        <!-- 心形 -->
        <g opacity="0.15">
          <path d="M400 350 Q450 300 500 350 Q550 400 500 450 Q450 500 400 450 Q350 500 300 450 Q250 400 300 350 Q350 300 400 350" 
                fill="#e91e63" opacity="0.2"/>
        </g>"""
    else:
        icon_svg = """
        <!-- 书本 -->
        <g opacity="0.15">
          <rect x="300" y="400" width="200" height="200" rx="10" 
                fill="#fff3e0" stroke="#795548" stroke-width="1" opacity="0.3"/>
        </g>"""
    
    # 判断是否深色背景
    dark_bg = any(t in ["月", "夜", "黑", "暗"] for t in title[:5])
    text_color = "#ffffff" if dark_bg else "#2c1810"
    text_shadow = "0 2px 8px rgba(0,0,0,0.5)" if dark_bg else "0 2px 8px rgba(255,255,255,0.8)"
    sub_color = "rgba(255,255,255,0.7)" if dark_bg else "rgba(44,24,16,0.6)"
    
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{c1}"/>
      <stop offset="50%" stop-color="{c2}"/>
      <stop offset="100%" stop-color="{c3}"/>
    </linearGradient>
  </defs>

  <!-- 背景渐变 -->
  <rect width="800" height="800" fill="url(#bg)"/>

  <!-- 装饰圆环 -->
  <circle cx="650" cy="150" r="200" fill="white" opacity="0.05"/>
  <circle cx="150" cy="650" r="150" fill="white" opacity="0.03"/>

  <!-- 意境图形 -->
  {icon_svg}

  <!-- 底部渐隐遮罩 -->
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="transparent"/>
      <stop offset="100%" stop-color="rgba(0,0,0,{0.35 if dark_bg else 0.12})"/>
    </linearGradient>
  </defs>
  <rect y="500" width="800" height="300" fill="url(#fade)"/>

  <!-- 作品标题 -->
  <text x="400" y="680" text-anchor="middle"
        font-family="'Noto Serif SC', 'Source Han Serif SC', 'STSong', serif"
        font-size="52" font-weight="700"
        fill="{text_color}"
        style="text-shadow: {text_shadow}">
    {title}
  </text>

  <!-- 作者 · 朝代 · 体裁 -->
  <text x="400" y="730" text-anchor="middle"
        font-family=""'Noto Sans SC', 'PingFang SC', sans-serif""
        font-size="22"
        fill="{sub_color}">
    {author} · {dynasty} · {genre}
  </text>
</svg>"""

def main():
    """主函数"""
    print("📚 诗词古文封面批量生成脚本")
    print("=" * 50)
    
    # 加载数据
    print("🔍 加载数据集...")
    dataset = load_dataset()
    works = dataset.get("works", [])
    print(f"✅ 共加载 {len(works)} 首作品")
    
    # 统计
    featured_count = 0
    generated_count = 0
    
    print(f"\n🎯 目标：为所有作品生成封面")
    print(f"   精选作品（已详细生成）：{len(FEATURED_SLUGS)} 首")
    print(f"   待生成基本封面：{len(works) - len(FEATURED_SLUGS)} 首")
    
    # 为每个作品生成封面
    print(f"\n🔄 开始生成封面...")
    
    for i, work in enumerate(works):
        slug, title, author, dynasty, genre, themes = get_work_info(work)
        
        if i % 50 == 0 and i > 0:
            print(f"   ⏳ 已处理 {i}/{len(works)} 首作品...")
        
        # 检查是否是精选作品
        if slug in FEATURED_SLUGS:
            featured_count += 1
            # 精选作品已有详细封面，跳过
            continue
        
        # 生成基本封面
        color_scheme = get_color_scheme(dynasty, genre, themes)
        icon_type = get_icon(genre, themes)
        
        svg_content = generate_basic_svg(slug, title, author, dynasty, 
                                        genre, color_scheme, icon_type)
        
        # 保存文件
        filename = f"{slug}.svg"
        filepath = os.path.join(GENERATED_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        
        generated_count += 1
    
    # 输出统计
    print(f"\n✅ 封面生成完成！")
    print(f"   📊 统计：")
    print(f"     精选作品（已有详细封面）：{featured_count} 首")
    print(f"     新生成基本封面：{generated_count} 首")
    print(f"     总计：{featured_count + generated_count}/{len(works)} 首作品")
    
    print(f"\n📁 文件位置：")
    print(f"   精选作品封面：{OUTPUT_DIR}")
    print(f"   基本作品封面：{GENERATED_DIR}")
    
    # 更新API配置建议
    print(f"\n💡 后续步骤：")
    print(f"   1. 更新 resolveAssetUrl() 函数，支持所有作品的封面")
    print(f"   2. 将生成的SVG文件路径存入数据库 cover_asset_path 字段")
    print(f"   3. 可考虑为热门作品生成AI图片封面")

if __name__ == "__main__":
    main()