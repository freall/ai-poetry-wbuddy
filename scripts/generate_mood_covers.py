#!/usr/bin/env python3
"""
为 16 首精选作品生成有意境的 SVG 封面图。
每个封面包含：主题渐变背景 + 意境图形元素 + 标题文字 + 作者信息
"""

import os

OUTPUT_DIR = os.path.join(
    os.path.dirname(__file__),
    "..",
    "apps",
    "web",
    "public",
    "images",
    "covers",
)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── 作品数据 ──────────────────────────────────────────
WORKS = [
    # 古文精选
    {"slug": "tao-hua-yuan-ji", "title": "桃花源记", "author": "陶渊明", "dynasty": "晋", "theme": "理想桃源",
     "gradient": ("#f8bbd0", "#f48fb1", "#e1bee7"), "icon": "peach"},
    {"slug": "lou-shi-ming", "title": "陋室铭", "author": "刘禹锡", "dynasty": "唐", "theme": "简朴与高洁",
     "gradient": ("#c8e6c9", "#a5d6a7", "#81c784"), "icon": "cottage"},
    {"slug": "chu-shi-biao", "title": "出师表", "author": "诸葛亮", "dynasty": "三国", "theme": "家国与责任",
     "gradient": ("#ffcc80", "#ffb74d", "#ffa726"), "icon": "memorial"},
    {"slug": "yue-yang-lou-ji", "title": "岳阳楼记", "author": "范仲淹", "dynasty": "宋", "theme": "先忧后乐",
     "gradient": ("#b3e5fc", "#81d4fa", "#4fc3f7"), "icon": "tower"},
    {"slug": "shi-shuo", "title": "师说", "author": "韩愈", "dynasty": "唐", "theme": "求学与师道",
     "gradient": ("#d1c4e9", "#b39ddb", "#9575cd"), "icon": "book"},
    {"slug": "zui-weng-ting-ji", "title": "醉翁亭记", "author": "欧阳修", "dynasty": "宋", "theme": "山水与民乐",
     "gradient": ("#c8e6c9", "#fff9c4", "#a5d6a7"), "icon": "pavilion"},
    # 唐诗精选
    {"slug": "chun-xiao", "title": "春晓", "author": "孟浩然", "dynasty": "唐", "theme": "春",
     "gradient": ("#f8bbd0", "#f48fb1", "#fce4ec"), "icon": "spring"},
    {"slug": "wang-lu-shan-pu-bu", "title": "望庐山瀑布", "author": "李白", "dynasty": "唐", "theme": "山水壮景",
     "gradient": ("#b3e5fc", "#e1f5fe", "#81d4fa"), "icon": "waterfall"},
    {"slug": "deng-guan-que-lou", "title": "登鹳雀楼", "author": "王之涣", "dynasty": "唐", "theme": "登高望远",
     "gradient": ("#ffe0b2", "#ffcc80", "#fff3e0"), "icon": "sunset"},
    {"slug": "jiang-xue", "title": "江雪", "author": "柳宗元", "dynasty": "唐", "theme": "寒江孤景",
     "gradient": ("#eceff1", "#cfd8dc", "#b0bec5"), "icon": "snow"},
    {"slug": "fu-de-gu-yuan-cao-song-bie", "title": "赋得古原草送别", "author": "白居易", "dynasty": "唐", "theme": "写草",
     "gradient": ("#c8e6c9", "#dcedc8", "#a5d6a7"), "icon": "grass"},
    {"slug": "jing-ye-si", "title": "静夜思", "author": "李白", "dynasty": "唐", "theme": "思乡",
     "gradient": ("#1a237e", "#283593", "#1a237e"), "icon": "moon"},
    # 宋词精选
    {"slug": "shui-diao-ge-tou-ming-yue-ji-shi-you", "title": "水调歌头·明月几时有", "author": "苏轼", "dynasty": "宋", "theme": "月夜怀人",
     "gradient": ("#0d1b2a", "#1b2838", "#1a237e"), "icon": "fullmoon"},
    {"slug": "nian-nu-jiao-chi-bi-huai-gu", "title": "念奴娇·赤壁怀古", "author": "苏轼", "dynasty": "宋", "theme": "历史与豪情",
     "gradient": ("#bf360c", "#d84315", "#e65100"), "icon": "cliff"},
    {"slug": "ru-meng-ling-zuo-ye-yu-shu-feng-zhou", "title": "如梦令·昨夜雨疏风骤", "author": "李清照", "dynasty": "宋", "theme": "花事与心绪",
     "gradient": ("#f3e5f5", "#e1bee7", "#ce93d8"), "icon": "rainflower"},
    {"slug": "qing-yu-an-yuan-xi", "title": "青玉案·元夕", "author": "辛弃疾", "dynasty": "宋", "theme": "灯火与寻觅",
     "gradient": ("#4a148c", "#6a1b9a", "#8e24aa"), "icon": "lantern"},
]


# ─── 意境图形元素 SVG 片段 ──────────────────────────────

def icon_peach():
    """桃花源记 — 桃花枝条"""
    return """
    <!-- 桃花枝条 -->
    <g opacity="0.25">
      <path d="M0 700 Q200 500 400 600 Q500 650 600 580" stroke="#c2185b" stroke-width="3" fill="none"/>
      <path d="M800 750 Q600 500 500 550 Q400 580 300 520" stroke="#c2185b" stroke-width="3" fill="none"/>
      <circle cx="350" cy="590" r="18" fill="#f48fb1"/>
      <circle cx="380" cy="570" r="14" fill="#f06292"/>
      <circle cx="320" cy="600" r="12" fill="#f8bbd0"/>
      <circle cx="500" cy="555" r="16" fill="#f48fb1"/>
      <circle cx="530" cy="540" r="12" fill="#f06292"/>
      <circle cx="470" cy="565" r="14" fill="#f8bbd0"/>
      <circle cx="200" cy="540" r="10" fill="#f48fb1"/>
      <circle cx="550" cy="560" r="10" fill="#f8bbd0"/>
    </g>
    <g opacity="0.12">
      <!-- 飘落花瓣 -->
      <ellipse cx="150" cy="300" rx="6" ry="4" fill="#f48fb1" transform="rotate(30,150,300)"/>
      <ellipse cx="700" cy="200" rx="5" ry="3" fill="#f8bbd0" transform="rotate(-20,700,200)"/>
      <ellipse cx="400" cy="400" rx="7" ry="4" fill="#f06292" transform="rotate(45,400,400)"/>
      <ellipse cx="250" cy="150" rx="5" ry="3" fill="#f48fb1" transform="rotate(-15,250,150)"/>
    </g>"""


def icon_cottage():
    """陋室铭 — 茅庐山居"""
    return """
    <g opacity="0.2">
      <!-- 远山 -->
      <path d="M0 800 Q200 500 400 650 Q500 700 600 600 Q700 500 800 700 L800 800 Z" fill="#2e7d32"/>
      <!-- 小屋 -->
      <rect x="350" y="620" width="100" height="70" fill="#5d4037" rx="2"/>
      <polygon points="340,620 450,620 395,570" fill="#795548"/>
      <rect x="375" y="650" width="25" height="40" fill="#3e2723"/>
      <!-- 青苔小路 -->
      <path d="M400 700 Q380 750 350 800" stroke="#4caf50" stroke-width="4" fill="none" opacity="0.5"/>
    </g>"""


def icon_memorial():
    """出师表 — 竹简奏表"""
    return """
    <g opacity="0.2">
      <!-- 竹简 -->
      <rect x="300" y="400" width="200" height="300" rx="8" fill="#fff8e1" stroke="#8d6e63" stroke-width="2"/>
      <line x1="330" y1="440" x2="470" y2="440" stroke="#8d6e63" stroke-width="1.5" opacity="0.4"/>
      <line x1="330" y1="470" x2="470" y2="470" stroke="#8d6e63" stroke-width="1.5" opacity="0.4"/>
      <line x1="330" y1="500" x2="450" y2="500" stroke="#8d6e63" stroke-width="1.5" opacity="0.4"/>
      <line x1="330" y1="530" x2="470" y2="530" stroke="#8d6e63" stroke-width="1.5" opacity="0.4"/>
      <line x1="330" y1="560" x2="430" y2="560" stroke="#8d6e63" stroke-width="1.5" opacity="0.4"/>
      <line x1="330" y1="590" x2="470" y2="590" stroke="#8d6e63" stroke-width="1.5" opacity="0.4"/>
      <line x1="330" y1="620" x2="460" y2="620" stroke="#8d6e63" stroke-width="1.5" opacity="0.4"/>
      <!-- 印章 -->
      <rect x="420" y="640" width="40" height="40" rx="4" fill="#c62828" opacity="0.6"/>
    </g>"""


def icon_tower():
    """岳阳楼记 — 楼阁洞庭"""
    return """
    <g opacity="0.18">
      <!-- 湖面 -->
      <path d="M0 680 Q200 660 400 680 Q600 700 800 680 L800 800 L0 800 Z" fill="#1565c0"/>
      <!-- 岳阳楼 -->
      <rect x="340" y="530" width="120" height="150" fill="#5d4037"/>
      <polygon points="320,530 480,530 400,460" fill="#795548"/>
      <polygon points="335,460 465,460 400,400" fill="#8d6e63"/>
      <!-- 楼层线条 -->
      <line x1="340" y1="570" x2="460" y2="570" stroke="#4e342e" stroke-width="2"/>
      <line x1="340" y1="620" x2="460" y2="620" stroke="#4e342e" stroke-width="2"/>
      <!-- 波纹 -->
      <path d="M0 720 Q100 710 200 720 Q300 730 400 720 Q500 710 600 720 Q700 730 800 720" stroke="#90caf9" stroke-width="1.5" fill="none" opacity="0.5"/>
    </g>"""


def icon_book():
    """师说 — 书卷师道"""
    return """
    <g opacity="0.2">
      <!-- 书卷 -->
      <rect x="300" y="450" width="200" height="250" rx="10" fill="#fff3e0" stroke="#795548" stroke-width="2"/>
      <rect x="320" y="470" width="160" height="210" rx="4" fill="#fafafa" opacity="0.5"/>
      <!-- 文字线条 -->
      <line x1="335" y1="490" x2="465" y2="490" stroke="#5d4037" stroke-width="1.5" opacity="0.3"/>
      <line x1="335" y1="515" x2="455" y2="515" stroke="#5d4037" stroke-width="1.5" opacity="0.3"/>
      <line x1="335" y1="540" x2="465" y2="540" stroke="#5d4037" stroke-width="1.5" opacity="0.3"/>
      <line x1="335" y1="565" x2="440" y2="565" stroke="#5d4037" stroke-width="1.5" opacity="0.3"/>
      <line x1="335" y1="590" x2="465" y2="590" stroke="#5d4037" stroke-width="1.5" opacity="0.3"/>
      <line x1="335" y1="615" x2="450" y2="615" stroke="#5d4037" stroke-width="1.5" opacity="0.3"/>
      <!-- 师者像 -->
      <circle cx="400" cy="390" r="30" fill="#9575cd" opacity="0.3"/>
      <rect x="385" y="420" width="30" height="40" fill="#9575cd" opacity="0.2"/>
    </g>"""


def icon_pavilion():
    """醉翁亭记 — 亭台山水"""
    return """
    <g opacity="0.18">
      <!-- 远山 -->
      <path d="M0 700 Q150 500 300 600 Q400 650 500 550 Q600 450 750 600 L800 700 Z" fill="#2e7d32"/>
      <!-- 亭子 -->
      <rect x="350" y="590" width="8" height="80" fill="#5d4037"/>
      <rect x="440" y="590" width="8" height="80" fill="#5d4037"/>
      <rect x="342" y="585" width="116" height="8" fill="#795548"/>
      <polygon points="330,585 470,585 400,530" fill="#8d6e63"/>
      <polygon points="340,530 460,530 400,480" fill="#a1887f"/>
      <!-- 小溪 -->
      <path d="M0 750 Q200 730 400 750 Q600 770 800 750" stroke="#4fc3f7" stroke-width="3" fill="none" opacity="0.5"/>
    </g>"""


def icon_spring():
    """春晓 — 春花小鸟"""
    return """
    <g opacity="0.2">
      <!-- 花枝 -->
      <path d="M100 800 Q200 500 350 450 Q400 430 450 400" stroke="#6d4c41" stroke-width="4" fill="none"/>
      <path d="M450 400 Q500 380 550 350" stroke="#6d4c41" stroke-width="3" fill="none"/>
      <!-- 花朵 -->
      <circle cx="350" cy="440" r="20" fill="#f48fb1"/>
      <circle cx="310" cy="460" r="15" fill="#f06292"/>
      <circle cx="390" cy="420" r="18" fill="#f8bbd0"/>
      <circle cx="420" cy="400" r="14" fill="#f48fb1"/>
      <circle cx="460" cy="380" r="16" fill="#f06292"/>
      <circle cx="500" cy="360" r="12" fill="#f8bbd0"/>
      <circle cx="530" cy="345" r="14" fill="#f48fb1"/>
      <!-- 小鸟 -->
      <ellipse cx="550" cy="300" rx="15" ry="10" fill="#795548"/>
      <circle cx="563" cy="295" r="6" fill="#5d4037"/>
      <path d="M569 293 L580 290" stroke="#5d4037" stroke-width="2"/>
    </g>"""


def icon_waterfall():
    """望庐山瀑布 — 瀑布山川"""
    return """
    <g opacity="0.2">
      <!-- 山 -->
      <path d="M0 800 L200 400 L350 600 L500 300 L650 550 L800 800 Z" fill="#37474f"/>
      <!-- 瀑布 -->
      <rect x="470" y="300" width="30" height="250" fill="white" opacity="0.5" rx="5"/>
      <rect x="478" y="300" width="14" height="250" fill="white" opacity="0.3" rx="3"/>
      <!-- 水花 -->
      <ellipse cx="485" cy="560" rx="50" ry="15" fill="white" opacity="0.3"/>
      <!-- 紫烟 -->
      <ellipse cx="300" cy="350" rx="80" ry="25" fill="#b39ddb" opacity="0.3"/>
      <ellipse cx="250" cy="380" rx="60" ry="20" fill="#ce93d8" opacity="0.2"/>
    </g>"""


def icon_sunset():
    """登鹳雀楼 — 落日楼台"""
    return """
    <g opacity="0.2">
      <!-- 落日 -->
      <circle cx="600" cy="250" r="60" fill="#ff8f00"/>
      <circle cx="600" cy="250" r="50" fill="#ffb300"/>
      <!-- 山 -->
      <path d="M0 800 L150 500 L300 650 L500 400 L700 600 L800 800 Z" fill="#4e342e"/>
      <!-- 楼 -->
      <rect x="350" y="500" width="60" height="120" fill="#5d4037"/>
      <polygon points="340,500 420,500 380,450" fill="#795548"/>
      <rect x="355" y="520" width="20" height="30" fill="#3e2723"/>
      <!-- 江河 -->
      <path d="M0 750 Q200 730 400 750 Q600 770 800 750 L800 800 L0 800 Z" fill="#ff8f00" opacity="0.3"/>
    </g>"""


def icon_snow():
    """江雪 — 孤舟寒江"""
    return """
    <g opacity="0.22">
      <!-- 远山雪景 -->
      <path d="M0 600 Q100 400 250 500 Q350 450 400 400 Q500 300 600 450 Q700 400 800 550 L800 800 L0 800 Z" fill="#546e7a"/>
      <!-- 孤舟 -->
      <path d="M320 680 Q370 660 430 680 Q370 695 320 680" fill="#5d4037"/>
      <line x1="370" y1="680" x2="370" y2="630" stroke="#5d4037" stroke-width="2"/>
      <!-- 蓑笠翁 -->
      <ellipse cx="370" cy="655" rx="8" ry="12" fill="#37474f"/>
      <path d="M355 648 L385 648 L370 638 Z" fill="#455a64"/>
      <!-- 雪花 -->
      <circle cx="100" cy="200" r="3" fill="white" opacity="0.6"/>
      <circle cx="300" cy="300" r="2" fill="white" opacity="0.5"/>
      <circle cx="500" cy="150" r="3" fill="white" opacity="0.4"/>
      <circle cx="650" cy="250" r="2" fill="white" opacity="0.5"/>
      <circle cx="200" cy="400" r="2" fill="white" opacity="0.3"/>
      <circle cx="550" cy="350" r="3" fill="white" opacity="0.4"/>
      <circle cx="700" cy="180" r="2" fill="white" opacity="0.5"/>
      <!-- 江面 -->
      <path d="M0 700 Q200 690 400 700 Q600 710 800 700 L800 800 L0 800 Z" fill="#78909c" opacity="0.3"/>
    </g>"""


def icon_grass():
    """赋得古原草送别 — 古原离草"""
    return """
    <g opacity="0.2">
      <!-- 草地 -->
      <path d="M0 650 Q200 620 400 650 Q600 680 800 650 L800 800 L0 800 Z" fill="#388e3c"/>
      <!-- 草茎 -->
      <line x1="100" y1="680" x2="95" y2="630" stroke="#2e7d32" stroke-width="2"/>
      <line x1="150" y1="670" x2="155" y2="620" stroke="#388e3c" stroke-width="2"/>
      <line x1="250" y1="660" x2="248" y2="600" stroke="#2e7d32" stroke-width="2"/>
      <line x1="350" y1="650" x2="352" y2="590" stroke="#388e3c" stroke-width="2"/>
      <line x1="450" y1="660" x2="448" y2="600" stroke="#2e7d32" stroke-width="2"/>
      <line x1="550" y1="670" x2="555" y2="620" stroke="#388e3c" stroke-width="2"/>
      <line x1="650" y1="680" x2="648" y2="630" stroke="#2e7d32" stroke-width="2"/>
      <line x1="700" y1="675" x2="705" y2="625" stroke="#388e3c" stroke-width="2"/>
      <!-- 远方送别人影 -->
      <ellipse cx="700" cy="600" rx="8" ry="15" fill="#5d4037" opacity="0.4"/>
      <ellipse cx="650" cy="610" rx="7" ry="13" fill="#5d4037" opacity="0.3"/>
    </g>"""


def icon_moon():
    """静夜思 — 窗前月光"""
    return """
    <g opacity="0.3">
      <!-- 月亮 -->
      <circle cx="600" cy="200" r="70" fill="#fff9c4"/>
      <circle cx="620" cy="190" r="60" fill="#1a237e"/>
      <!-- 月光 -->
      <ellipse cx="600" cy="700" rx="120" ry="8" fill="#fff9c4" opacity="0.15"/>
      <!-- 窗框 -->
      <rect x="100" y="350" width="250" height="350" rx="8" fill="none" stroke="#5d4037" stroke-width="4"/>
      <line x1="225" y1="350" x2="225" y2="700" stroke="#5d4037" stroke-width="3"/>
      <line x1="100" y1="525" x2="350" y2="525" stroke="#5d4037" stroke-width="3"/>
      <!-- 地上霜光 -->
      <ellipse cx="225" cy="700" rx="100" ry="5" fill="white" opacity="0.2"/>
    </g>"""


def icon_fullmoon():
    """水调歌头 — 中秋明月"""
    return """
    <g opacity="0.3">
      <!-- 大满月 -->
      <circle cx="400" cy="280" r="120" fill="#fff9c4"/>
      <circle cx="400" cy="280" r="110" fill="#fff176" opacity="0.5"/>
      <!-- 月中阴影 -->
      <circle cx="380" cy="260" r="20" fill="#ffe082" opacity="0.3"/>
      <circle cx="420" cy="300" r="15" fill="#ffe082" opacity="0.2"/>
      <circle cx="370" cy="300" r="10" fill="#ffe082" opacity="0.2"/>
      <!-- 楼台 -->
      <rect x="300" y="550" width="80" height="130" fill="#5d4037" opacity="0.5"/>
      <polygon points="290,550 390,550 340,500" fill="#795548" opacity="0.5"/>
      <rect x="450" y="580" width="60" height="100" fill="#5d4037" opacity="0.4"/>
      <polygon points="440,580 520,580 480,540" fill="#795548" opacity="0.4"/>
      <!-- 云 -->
      <ellipse cx="200" cy="200" rx="80" ry="25" fill="white" opacity="0.1"/>
      <ellipse cx="600" cy="250" rx="60" ry="20" fill="white" opacity="0.08"/>
    </g>"""


def icon_cliff():
    """念奴娇 — 赤壁悬崖"""
    return """
    <g opacity="0.2">
      <!-- 赤壁悬崖 -->
      <path d="M0 800 L0 300 Q100 250 200 280 L200 800 Z" fill="#bf360c"/>
      <path d="M0 400 L150 380" stroke="#d84315" stroke-width="2" opacity="0.3"/>
      <path d="M0 500 L120 490" stroke="#d84315" stroke-width="2" opacity="0.3"/>
      <!-- 江水 -->
      <path d="M0 650 Q200 630 400 650 Q600 670 800 650 L800 800 L0 800 Z" fill="#1565c0" opacity="0.4"/>
      <!-- 浪花 -->
      <path d="M300 660 Q350 640 400 660 Q450 680 500 660" stroke="white" stroke-width="2" fill="none" opacity="0.3"/>
      <path d="M500 670 Q550 650 600 670 Q650 690 700 670" stroke="white" stroke-width="2" fill="none" opacity="0.3"/>
      <!-- 战船剪影 -->
      <path d="M500 630 Q540 615 580 630 Q540 640 500 630" fill="#3e2723" opacity="0.4"/>
      <line x1="540" y1="630" x2="540" y2="590" stroke="#3e2723" stroke-width="2" opacity="0.4"/>
    </g>"""


def icon_rainflower():
    """如梦令 — 雨中海棠"""
    return """
    <g opacity="0.2">
      <!-- 雨丝 -->
      <line x1="150" y1="100" x2="145" y2="200" stroke="#90a4ae" stroke-width="1.5" opacity="0.3"/>
      <line x1="300" y1="80" x2="295" y2="180" stroke="#90a4ae" stroke-width="1.5" opacity="0.3"/>
      <line x1="450" y1="120" x2="445" y2="220" stroke="#90a4ae" stroke-width="1.5" opacity="0.3"/>
      <line x1="600" y1="90" x2="595" y2="190" stroke="#90a4ae" stroke-width="1.5" opacity="0.3"/>
      <line x1="700" y1="110" x2="695" y2="210" stroke="#90a4ae" stroke-width="1.5" opacity="0.3"/>
      <!-- 海棠枝 -->
      <path d="M200 800 Q300 500 450 400 Q500 380 550 350" stroke="#6d4c41" stroke-width="4" fill="none"/>
      <!-- 海棠花 -->
      <circle cx="400" cy="410" r="22" fill="#e91e63" opacity="0.5"/>
      <circle cx="450" cy="390" r="18" fill="#f06292" opacity="0.5"/>
      <circle cx="350" cy="430" r="15" fill="#ec407a" opacity="0.5"/>
      <circle cx="500" cy="365" r="16" fill="#e91e63" opacity="0.4"/>
      <circle cx="530" cy="345" r="12" fill="#f06292" opacity="0.4"/>
      <!-- 花瓣落地 -->
      <ellipse cx="300" cy="750" rx="6" ry="3" fill="#f06292" opacity="0.4" transform="rotate(30,300,750)"/>
      <ellipse cx="450" cy="770" rx="5" ry="3" fill="#e91e63" opacity="0.3" transform="rotate(-20,450,770)"/>
    </g>"""


def icon_lantern():
    """青玉案·元夕 — 花灯夜市"""
    return """
    <g opacity="0.25">
      <!-- 灯笼1 -->
      <ellipse cx="200" cy="300" rx="25" ry="35" fill="#ff6f00"/>
      <rect x="190" y="265" width="20" height="8" fill="#5d4037"/>
      <line x1="200" y1="260" x2="200" y2="230" stroke="#5d4037" stroke-width="2"/>
      <!-- 灯笼2 -->
      <ellipse cx="400" cy="250" rx="30" ry="40" fill="#f44336"/>
      <rect x="388" y="210" width="24" height="8" fill="#5d4037"/>
      <line x1="400" y1="205" x2="400" y2="170" stroke="#5d4037" stroke-width="2"/>
      <!-- 灯笼3 -->
      <ellipse cx="600" cy="280" rx="22" ry="30" fill="#ff6f00"/>
      <rect x="591" y="250" width="18" height="7" fill="#5d4037"/>
      <line x1="600" y1="245" x2="600" y2="220" stroke="#5d4037" stroke-width="2"/>
      <!-- 灯光散射 -->
      <circle cx="200" cy="300" r="60" fill="#ff6f00" opacity="0.08"/>
      <circle cx="400" cy="250" r="70" fill="#f44336" opacity="0.08"/>
      <circle cx="600" cy="280" r="55" fill="#ff6f00" opacity="0.08"/>
      <!-- 人群剪影 -->
      <ellipse cx="300" cy="700" rx="10" ry="18" fill="#1a0033" opacity="0.3"/>
      <ellipse cx="500" cy="710" rx="8" ry="16" fill="#1a0033" opacity="0.3"/>
      <ellipse cx="350" cy="720" rx="9" ry="17" fill="#1a0033" opacity="0.2"/>
    </g>"""


ICON_FUNCS = {
    "peach": icon_peach,
    "cottage": icon_cottage,
    "memorial": icon_memorial,
    "tower": icon_tower,
    "book": icon_book,
    "pavilion": icon_pavilion,
    "spring": icon_spring,
    "waterfall": icon_waterfall,
    "sunset": icon_sunset,
    "snow": icon_snow,
    "grass": icon_grass,
    "moon": icon_moon,
    "fullmoon": icon_fullmoon,
    "cliff": icon_cliff,
    "rainflower": icon_rainflower,
    "lantern": icon_lantern,
}


def make_cover(work: dict) -> str:
    c1, c2, c3 = work["gradient"]
    icon_func = ICON_FUNCS.get(work["icon"])
    icon_svg = icon_func() if icon_func else ""

    # 判断是否深色背景（用于文字颜色）
    dark_bg = work["icon"] in ("moon", "fullmoon", "lantern", "cliff")
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
    <filter id="blur">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2"/>
    </filter>
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
    {work['title']}
  </text>

  <!-- 作者 · 朝代 · 主题 -->
  <text x="400" y="730" text-anchor="middle"
        font-family="'Noto Sans SC', 'PingFang SC', sans-serif"
        font-size="22"
        fill="{sub_color}">
    {work['author']} · {work['dynasty']} · {work['theme']}
  </text>
</svg>"""


def main():
    for work in WORKS:
        svg = make_cover(work)
        filename = f"{work['slug']}.svg"
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(svg)
        print(f"✅ {work['title']} → {filename}")

    print(f"\n🎉 共生成 {len(WORKS)} 个意境封面 SVG → {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
