from __future__ import annotations

import html
import json
import random
import re
import ssl
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, UTC
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
IMG_DIR = ROOT / "public" / "images" / "generated"

RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
IMG_DIR.mkdir(parents=True, exist_ok=True)

SSL_CONTEXT = ssl._create_unverified_context()
HEADERS = {"User-Agent": "WorkBuddy-Classics-Seed/1.0"}


TARGETS = [
    {
        "slug": "jing-ye-si",
        "title": "静夜思",
        "lookup_title": "靜夜思",
        "author": "李白",
        "dynasty": "唐",
        "genre": "诗",
        "collection": "唐诗精选",
        "textbook_stage": "小学",
        "difficulty_level": 1,
        "tags": ["思乡", "月夜", "启蒙"],
        "source_bucket": "chinese-poetry-tang",
        "theme_label": "思乡与月夜",
        "translation_text": "明亮的月光洒在床前，像地上铺了一层白霜。我抬头望着空中的明月，又低头想起远方的家乡。",
        "background_text": "这首诗语言极其朴素，却把旅途中最常见的思乡情绪写得格外动人，是小学生接触古诗时最经典的一篇。",
        "appreciation_text": "全诗只用几个生活化动作，就完成了由眼前景到心中情的自然转折，特别适合做意象启蒙。",
        "palette": ["#0f172a", "#1d4ed8", "#f8fafc"],
        "historical_refs": ["月下山水图", "唐代夜行题材绘画"],
    },
    {
        "slug": "wang-lu-shan-pu-bu",
        "title": "望庐山瀑布",
        "lookup_title": "望廬山瀑布",
        "author": "李白",
        "match_snippet": "飛流直下三千尺",
        "dynasty": "唐",
        "genre": "诗",
        "collection": "唐诗精选",
        "textbook_stage": "小学",
        "difficulty_level": 1,
        "tags": ["山水", "夸张", "想象"],
        "source_bucket": "chinese-poetry-tang",
        "theme_label": "山水壮景",
        "translation_text": "香炉峰在阳光照耀下升起紫色云霞，远远望去瀑布像悬挂在山前的白练。飞流直下三千尺，仿佛银河从九天倾泻而下。",
        "background_text": "李白以浪漫笔法写庐山瀑布，把真实山水景观写出神话般的气势，是理解夸张修辞的经典范例。",
        "appreciation_text": "这首诗最大魅力在于“看得见的画面”和“想得到的宇宙感”同时成立，适合配大场景视觉素材。",
        "palette": ["#0b1120", "#2563eb", "#c4b5fd"],
        "historical_refs": ["庐山图", "瀑布题材山水册页"],
    },
    {
        "slug": "chun-xiao",
        "title": "春晓",
        "lookup_title": "春曉",
        "author": "孟浩然",
        "dynasty": "唐",
        "genre": "诗",
        "collection": "唐诗精选",
        "textbook_stage": "小学",
        "difficulty_level": 1,
        "tags": ["春天", "清晨", "自然"],
        "source_bucket": "chinese-poetry-tang",
        "theme_label": "春晨感知",
        "translation_text": "春天的夜里睡得香甜，不知不觉天已经亮了。到处都能听见鸟鸣，回想昨夜的风雨，不知道打落了多少花。",
        "background_text": "这是一首非常适合启蒙的写景诗，用声音和想象连接起清晨与昨夜，帮助学生感受季节变化。",
        "appreciation_text": "诗里没有复杂典故，却有很强的时间流动感：由“今晨所闻”联想到“昨夜所失”，情景一体。",
        "palette": ["#14532d", "#65a30d", "#fef9c3"],
        "historical_refs": ["春花双鸟图", "花鸟册页"],
    },
    {
        "slug": "deng-guan-que-lou",
        "title": "登鹳雀楼",
        "lookup_title": "登鸛雀樓",
        "author": "王之涣",
        "author_aliases": ["王之涣", "王之渙"],
        "match_snippet": "更上一層樓",
        "dynasty": "唐",
        "genre": "诗",
        "collection": "唐诗精选",
        "textbook_stage": "小学",
        "difficulty_level": 1,
        "tags": ["登高", "视野", "励志"],
        "source_bucket": "chinese-poetry-tang",
        "theme_label": "登高望远",
        "translation_text": "夕阳沿着山脉缓缓落下，黄河奔向辽阔大海。如果想把千里风光看得更远，就要再登上一层高楼。",
        "background_text": "这首诗常被用来培养“登高看远”的学习心态，既是写景诗，也有鲜明的人生启发意味。",
        "appreciation_text": "前两句是壮阔景象，后两句一下转成精神格言，非常适合做学习激励型页面。",
        "palette": ["#7c2d12", "#f97316", "#fde68a"],
        "historical_refs": ["登楼远眺图", "黄河题材山水画"],
    },
    {
        "slug": "fu-de-gu-yuan-cao-song-bie",
        "title": "赋得古原草送别",
        "lookup_title": "賦得古原草送別",
        "author": "白居易",
        "dynasty": "唐",
        "genre": "诗",
        "collection": "唐诗精选",
        "textbook_stage": "小学",
        "difficulty_level": 2,
        "tags": ["生命力", "送别", "草木"],
        "source_bucket": "chinese-poetry-tang",
        "theme_label": "生命与离别",
        "translation_text": "原野上的青草一岁一枯荣，野火烧不尽，春风一吹又重新长起。它们蔓延到古道边，在夕阳下染绿荒城，也陪伴着远行的人。",
        "background_text": "白居易少年时的名作，通过“草”写出顽强生命力，也把送别之情写得含蓄而长久。",
        "appreciation_text": "名句“野火烧不尽，春风吹又生”适合延展成成长激励、坚持闯关等游戏化机制。",
        "palette": ["#365314", "#84cc16", "#fef3c7"],
        "historical_refs": ["原野牧归图", "夕照送别图"],
    },
    {
        "slug": "jiang-xue",
        "title": "江雪",
        "lookup_title": "江雪",
        "author": "柳宗元",
        "dynasty": "唐",
        "genre": "诗",
        "collection": "唐诗精选",
        "textbook_stage": "小学",
        "difficulty_level": 2,
        "tags": ["雪景", "孤寂", "意境"],
        "source_bucket": "chinese-poetry-tang",
        "theme_label": "寒江孤景",
        "translation_text": "群山中的鸟都飞绝了，所有道路上也看不到人的踪迹。只有一叶小舟、一个披着蓑衣戴着斗笠的老人，独自在寒冷的江面上垂钓。",
        "background_text": "柳宗元贬谪时期的代表作之一，表面写雪景，内里含有诗人孤高自守的精神气质。",
        "appreciation_text": "整首诗像一幅极简山水画，留白很多，非常适合做沉浸式滚动阅读页面。",
        "palette": ["#0f172a", "#64748b", "#e2e8f0"],
        "historical_refs": ["寒江独钓图", "雪景山水册页"],
    },
    {
        "slug": "shui-diao-ge-tou-ming-yue-ji-shi-you",
        "title": "水调歌头·明月几时有",
        "lookup_title": "水调歌头",
        "author": "苏轼",
        "dynasty": "宋",
        "genre": "词",
        "collection": "宋词精选",
        "textbook_stage": "初中",
        "difficulty_level": 3,
        "tags": ["中秋", "亲情", "豁达"],
        "source_bucket": "chinese-poetry-songci",
        "match_snippet": "明月几时有",
        "theme_label": "月夜怀人",
        "translation_text": "词人把酒问月，思念远方亲人，也思考人生的聚散和圆缺。最后他选择用更开阔的心态面对不完美，希望彼此平安长久，即使相隔千里，也能共赏明月。",
        "background_text": "这首词作于中秋夜，苏轼一边怀念弟弟苏辙，一边借明月谈人生，是最具国民度的宋词之一。",
        "appreciation_text": "作品兼具浪漫想象和哲理高度，特别适合在页面中做“仰望月亮—拉远宇宙—回到亲情”的分层叙事。",
        "palette": ["#111827", "#4338ca", "#fef3c7"],
        "historical_refs": ["中秋月夜图", "文人赏月图"],
    },
    {
        "slug": "nian-nu-jiao-chi-bi-huai-gu",
        "title": "念奴娇·赤壁怀古",
        "lookup_title": "念奴娇",
        "author": "苏轼",
        "dynasty": "宋",
        "genre": "词",
        "collection": "宋词精选",
        "textbook_stage": "高中",
        "difficulty_level": 4,
        "tags": ["历史", "豪放", "赤壁"],
        "source_bucket": "chinese-poetry-songci",
        "match_snippet": "大江东去",
        "theme_label": "历史与豪情",
        "translation_text": "奔流不息的大江带走了无数英雄人物。词人站在赤壁旧地，遥想周瑜当年的风流与功业，也感慨自己壮志难酬、人生如梦，于是把感情寄托在江月之间。",
        "background_text": "苏轼被贬黄州时游赤壁所作，是豪放词的代表篇章，把地理空间、历史人物和自我感慨熔成一体。",
        "appreciation_text": "这首词非常适合做大场景镜头感原型：江面、乱石、浪涛、历史人物剪影都很强。",
        "palette": ["#1f2937", "#b91c1c", "#f59e0b"],
        "historical_refs": ["赤壁图", "周瑜题材人物画"],
    },
    {
        "slug": "ru-meng-ling-zuo-ye-yu-shu-feng-zhou",
        "title": "如梦令·昨夜雨疏风骤",
        "lookup_title": "如夢令",
        "author": "李清照",
        "dynasty": "宋",
        "genre": "词",
        "collection": "宋词精选",
        "textbook_stage": "初中",
        "difficulty_level": 3,
        "tags": ["闺情", "花雨", "细腻"],
        "source_bucket": "chinese-poetry-songci",
        "match_snippet": "昨夜雨疏风骤",
        "theme_label": "花事与心绪",
        "translation_text": "昨夜雨不大、风却急，我一夜好睡。清晨询问卷帘人海棠如何，对方说花没什么变化；词人却敏锐地意识到：应该是绿叶更浓、红花更少了。",
        "background_text": "李清照善于从日常小景中写出极细的情绪波动，这首词特别适合训练学生体会“言外之意”。",
        "appreciation_text": "“知否，知否”形成极强节奏感，适合做交互式问答与提示动画。",
        "palette": ["#4c1d95", "#ec4899", "#fbcfe8"],
        "historical_refs": ["海棠仕女图", "春庭花事图"],
    },
    {
        "slug": "qing-yu-an-yuan-xi",
        "title": "青玉案·元夕",
        "lookup_title": "青玉案",
        "author": "辛弃疾",
        "dynasty": "宋",
        "genre": "词",
        "collection": "宋词精选",
        "textbook_stage": "高中",
        "difficulty_level": 4,
        "tags": ["元宵", "灯火", "寻觅"],
        "source_bucket": "chinese-poetry-songci",
        "match_snippet": "东风夜放花千树",
        "theme_label": "灯火与寻觅",
        "translation_text": "元宵夜里灯火像繁花齐放、星雨纷飞，满城歌舞喧腾。词人却在喧闹人群中寻找心中那个人，蓦然回首，发现她正站在灯火阑珊处。",
        "background_text": "这首词把极盛的节日场景和极静的情感发现并置起来，层次非常适合做页面节奏对比。",
        "appreciation_text": "前半阕极热闹，后半阕极安静，适合做“快节奏滚动—突然留白”的交互落点。",
        "palette": ["#3f0d12", "#fb923c", "#fde68a"],
        "historical_refs": ["上元灯彩图", "元宵市井图"],
    },
    {
        "slug": "tao-hua-yuan-ji",
        "title": "桃花源记",
        "lookup_title": "桃花源記",
        "author": "陶渊明",
        "dynasty": "晋",
        "genre": "古文",
        "collection": "古文精选",
        "textbook_stage": "初中",
        "difficulty_level": 3,
        "tags": ["理想社会", "田园", "想象"],
        "source_bucket": "guwenguanzhi",
        "theme_label": "理想桃源",
        "background_text": "陶渊明借渔人误入桃花源的故事，构想了一个远离战乱与压迫的理想世界。",
        "appreciation_text": "文章节奏像一场探索冒险，非常适合做“发现新地图”式的学习交互。",
        "palette": ["#14532d", "#f472b6", "#fef3c7"],
        "historical_refs": ["桃源图", "溪山行旅图"],
    },
    {
        "slug": "chu-shi-biao",
        "title": "出师表",
        "lookup_title": "諸葛亮前出師表",
        "author": "诸葛亮",
        "dynasty": "三国·蜀",
        "genre": "古文",
        "collection": "古文精选",
        "textbook_stage": "初中",
        "difficulty_level": 4,
        "tags": ["忠诚", "家国", "劝谏"],
        "source_bucket": "guwenguanzhi",
        "theme_label": "家国与责任",
        "background_text": "诸葛亮北伐前上表后主刘禅，既陈明形势，也托付治国之道，是古代表文名篇。",
        "appreciation_text": "文章情理并重，既有制度建议，也有个人忠诚，非常适合做“人物使命线”内容卡。",
        "palette": ["#111827", "#991b1b", "#f5d0fe"],
        "historical_refs": ["武侯像", "出师表书法作品"],
    },
    {
        "slug": "yue-yang-lou-ji",
        "title": "岳阳楼记",
        "lookup_title": "岳陽樓記",
        "author": "范仲淹",
        "dynasty": "宋",
        "genre": "古文",
        "collection": "古文精选",
        "textbook_stage": "初中",
        "difficulty_level": 4,
        "tags": ["胸怀", "忧乐", "山水"],
        "source_bucket": "guwenguanzhi",
        "theme_label": "先忧后乐",
        "background_text": "范仲淹应友人之请作记，借岳阳楼景象抒发“先天下之忧而忧，后天下之乐而乐”的政治抱负。",
        "appreciation_text": "写景、叙事、议论三者自然转换，特别适合做多层信息布局示范页。",
        "palette": ["#0f172a", "#0ea5e9", "#bae6fd"],
        "historical_refs": ["岳阳楼图", "洞庭湖山水图"],
    },
    {
        "slug": "zui-weng-ting-ji",
        "title": "醉翁亭记",
        "lookup_title": "醉翁亭記",
        "author": "欧阳修",
        "dynasty": "宋",
        "genre": "古文",
        "collection": "古文精选",
        "textbook_stage": "初中",
        "difficulty_level": 4,
        "tags": ["山水", "与民同乐", "游记"],
        "source_bucket": "guwenguanzhi",
        "theme_label": "山水与民乐",
        "background_text": "欧阳修被贬滁州期间写下此文，以一座亭子串联山水、宴饮和地方风俗，格调洒脱。",
        "appreciation_text": "文章镜头感极强，从远山到亭子，再到游人宴饮，天然适合做卡片式滚动布局。",
        "palette": ["#1f2937", "#059669", "#fef08a"],
        "historical_refs": ["滁州山水图", "文人雅集图"],
    },
    {
        "slug": "lou-shi-ming",
        "title": "陋室铭",
        "lookup_title": "陋室銘",
        "author": "刘禹锡",
        "dynasty": "唐",
        "genre": "古文",
        "collection": "古文精选",
        "textbook_stage": "初中",
        "difficulty_level": 3,
        "tags": ["品格", "志趣", "托物言志"],
        "source_bucket": "guwenguanzhi",
        "theme_label": "简朴与高洁",
        "background_text": "刘禹锡借一间简陋的居室，写出精神世界的丰盈与高洁，告诉学生真正重要的是人的志趣与品格。",
        "appreciation_text": "篇幅短、节奏整齐、意象集中，非常适合做卡片化学习和节奏型朗读交互。",
        "palette": ["#134e4a", "#14b8a6", "#f0fdfa"],
        "historical_refs": ["文人书斋图", "小室清供图"],
    },
    {
        "slug": "shi-shuo",
        "title": "师说",
        "lookup_title": "師說",
        "author": "韩愈",
        "dynasty": "唐",
        "genre": "古文",
        "collection": "古文精选",
        "textbook_stage": "高中",
        "difficulty_level": 4,
        "tags": ["学习", "师道", "议论"],
        "source_bucket": "guwenguanzhi",
        "theme_label": "求学与师道",
        "background_text": "韩愈针对社会上耻于从师的风气写下《师说》，强调学习应当不拘身份、贵在求道。",
        "appreciation_text": "这篇文章和产品定位天然贴合，可以作为“学习观”模块的精神底座。",
        "palette": ["#172554", "#3b82f6", "#e0f2fe"],
        "historical_refs": ["讲学图", "书院人物画"],
    },
]


AUTHOR_PROFILES = {
    "李白": {
        "dynasty": "唐",
        "bio": "李白，字太白，盛唐最具浪漫气质的诗人之一，善用奇特想象、夸张语言和宏阔意象，作品常带有自由奔放的精神力量。",
    },
    "孟浩然": {
        "dynasty": "唐",
        "bio": "孟浩然，唐代山水田园诗代表人物，诗风清淡自然，善于从生活中捕捉安静、明亮的自然瞬间。",
    },
    "王之涣": {
        "dynasty": "唐",
        "bio": "王之涣，盛唐诗人，诗作不多却名篇极多，常以开阔视角和昂扬气势见长。",
    },
    "白居易": {
        "dynasty": "唐",
        "bio": "白居易，字乐天，唐代现实主义诗人，语言通俗晓畅，关注人生、社会与普通人的情感体验。",
    },
    "柳宗元": {
        "dynasty": "唐",
        "bio": "柳宗元，唐代文学家、思想家，唐宋八大家之一，山水游记与寓言散文成就极高，文字冷峻而有力量。",
    },
    "苏轼": {
        "dynasty": "宋",
        "bio": "苏轼，字子瞻，号东坡居士，宋代文学全才，诗词文书画皆卓然成家，作品兼具旷达、幽默与深情。",
    },
    "李清照": {
        "dynasty": "宋",
        "bio": "李清照，号易安居士，宋代女词人代表，善于用细微景物与口语化节奏写出极其丰富的情绪层次。",
    },
    "辛弃疾": {
        "dynasty": "宋",
        "bio": "辛弃疾，南宋豪放词代表人物，兼有武将经历和文人情怀，词风雄健中又常藏深沉感慨。",
    },
    "陶渊明": {
        "dynasty": "晋",
        "bio": "陶渊明，东晋诗文家，以田园诗闻名，作品追求自然、质朴与心灵自由，对后世隐逸文化影响极大。",
    },
    "诸葛亮": {
        "dynasty": "三国·蜀",
        "bio": "诸葛亮，字孔明，蜀汉政治家、军事家，以忠诚、远见与治理能力著称，《出师表》最能体现其人格力量。",
    },
    "范仲淹": {
        "dynasty": "宋",
        "bio": "范仲淹，北宋政治家、文学家，主张积极改革，文章气象开阔，尤以“先天下之忧而忧”广为传诵。",
    },
    "欧阳修": {
        "dynasty": "宋",
        "bio": "欧阳修，北宋文学家、史学家，唐宋八大家之一，文风平易流畅，擅长在山水与人情中见胸襟。",
    },
    "刘禹锡": {
        "dynasty": "唐",
        "bio": "刘禹锡，唐代文学家、哲学家，诗文兼擅，文字爽朗有骨力，常在简洁表达中见出昂扬精神。",
    },
    "韩愈": {
        "dynasty": "唐",
        "bio": "韩愈，唐代文学家、思想家，古文运动倡导者，强调“文以明道”，对后世散文和教育思想影响深远。",
    },
}


def fetch_url(url: str) -> str:
    parts = urllib.parse.urlsplit(url)
    safe_url = urllib.parse.urlunsplit(
        (
            parts.scheme,
            parts.netloc,
            urllib.parse.quote(parts.path, safe="/%"),
            parts.query,
            parts.fragment,
        )
    )
    request = urllib.request.Request(safe_url, headers=HEADERS)
    with urllib.request.urlopen(request, context=SSL_CONTEXT) as response:
        return response.read().decode("utf-8")


def fetch_json(url: str) -> Any:
    return json.loads(fetch_url(url))


def folder_entries(owner: str, repo: str, folder: str) -> list[dict[str, Any]]:
    encoded_folder = urllib.parse.quote(folder)
    api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{encoded_folder}"
    return fetch_json(api_url)


def numeric_suffix(filename: str) -> int:
    match = re.search(r"(\d+)\.json$", filename)
    return int(match.group(1)) if match else -1


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def create_cover_svg(work: dict[str, Any]) -> dict[str, Any]:
    slug = work["slug"]
    title = html.escape(work["title"])
    author = html.escape(work["author_name"])
    collection = html.escape(work["collection"])
    tag = html.escape(work["theme_label"])
    c1, c2, c3 = work["palette"]
    svg = f'''<svg width="1200" height="1600" viewBox="0 0 1200 1600" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{c1}" />
      <stop offset="50%" stop-color="{c2}" />
      <stop offset="100%" stop-color="{c3}" />
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgba(255,255,255,0.12)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.65)" />
    </linearGradient>
  </defs>
  <rect width="1200" height="1600" rx="56" fill="url(#bg)" />
  <circle cx="920" cy="260" r="220" fill="rgba(255,255,255,0.09)" />
  <circle cx="1020" cy="1220" r="160" fill="rgba(255,255,255,0.08)" />
  <path d="M0 1160 C 180 1040, 380 980, 620 1060 C 790 1118, 940 1250, 1200 1160 V1600 H0 Z" fill="rgba(255,255,255,0.12)" />
  <path d="M140 360 H1060" stroke="url(#line)" stroke-width="2" stroke-linecap="round" />
  <path d="M140 1210 H1060" stroke="url(#line)" stroke-width="2" stroke-linecap="round" />
  <rect x="140" y="160" width="220" height="52" rx="26" fill="rgba(255,255,255,0.16)" />
  <text x="250" y="194" text-anchor="middle" fill="#ffffff" font-size="28" font-family="PingFang SC, Microsoft YaHei, sans-serif">{collection}</text>
  <text x="140" y="620" fill="#ffffff" font-size="108" font-weight="700" font-family="PingFang SC, Microsoft YaHei, sans-serif">{title}</text>
  <text x="140" y="720" fill="rgba(255,255,255,0.88)" font-size="42" font-family="PingFang SC, Microsoft YaHei, sans-serif">{author}</text>
  <text x="140" y="1320" fill="rgba(255,255,255,0.92)" font-size="34" font-family="PingFang SC, Microsoft YaHei, sans-serif">{tag}</text>
  <text x="140" y="1382" fill="rgba(255,255,255,0.72)" font-size="28" font-family="PingFang SC, Microsoft YaHei, sans-serif">Classics Learning Prototype Cover</text>
</svg>'''
    output_path = IMG_DIR / f"{slug}.svg"
    output_path.write_text(svg, encoding="utf-8")
    return {
        "id": f"asset-{slug}-cover",
        "work_id": work["id"],
        "asset_type": "generated_cover",
        "local_path": f"/public/images/generated/{slug}.svg",
        "source_url": None,
        "license": "local-generated",
        "credit": "Generated locally by fetch_initial_dataset.py",
        "prompt": f"为《{work['title']}》生成现代化学习卡片封面，主题：{work['theme_label']}",
        "status": "ready",
    }


def normalize_poem(target: dict[str, Any], poem: dict[str, Any], source_url: str) -> dict[str, Any]:
    work_id = f"work-{target['slug']}"
    author_profile = AUTHOR_PROFILES[target["author"]]
    paragraphs = [line.strip() for line in poem.get("paragraphs", []) if line.strip()]
    return {
        "id": work_id,
        "slug": target["slug"],
        "title": target["title"],
        "author_name": target["author"],
        "author_id": f"author-{target['author']}",
        "dynasty": target["dynasty"],
        "genre": target["genre"],
        "collection": target["collection"],
        "textbook_stage": target["textbook_stage"],
        "difficulty_level": target["difficulty_level"],
        "tags": target["tags"],
        "theme_label": target["theme_label"],
        "original_text": "\n".join(paragraphs),
        "translation_text": target["translation_text"],
        "background_text": target["background_text"],
        "appreciation_text": target["appreciation_text"],
        "author_summary": author_profile["bio"],
        "source_name": "chinese-poetry",
        "source_collection": target["collection"],
        "source_url": source_url,
        "palette": target["palette"],
        "historical_refs": target["historical_refs"],
        "paragraphs": paragraphs,
    }


def normalize_guwen(target: dict[str, Any], html_text: str, source_url: str) -> dict[str, Any]:
    work_id = f"work-{target['slug']}"
    author_profile = AUTHOR_PROFILES[target["author"]]
    root = ET.fromstring(html_text)
    ns = {"x": "http://www.w3.org/1999/xhtml"}

    def clean_text(value: str) -> str:
        return re.sub(r"\s+", "", value).strip()

    title_node = root.find(".//x:h1", ns)
    title = clean_text("".join(title_node.itertext())) if title_node is not None else target["title"]
    paragraphs: list[str] = []
    translations: list[str] = []
    for p in root.findall(".//x:p", ns):
        text = clean_text("".join(p.itertext()))
        if not text:
            continue
        p_class = p.attrib.get("class", "")
        if "translation" in p_class:
            translations.append(text)
        else:
            paragraphs.append(text)

    return {
        "id": work_id,
        "slug": target["slug"],
        "title": target["title"] or title,
        "author_name": target["author"],
        "author_id": f"author-{target['author']}",
        "dynasty": target["dynasty"],
        "genre": target["genre"],
        "collection": target["collection"],
        "textbook_stage": target["textbook_stage"],
        "difficulty_level": target["difficulty_level"],
        "tags": target["tags"],
        "theme_label": target["theme_label"],
        "original_text": "\n\n".join(paragraphs),
        "translation_text": "\n\n".join(translations),
        "background_text": target["background_text"],
        "appreciation_text": target["appreciation_text"],
        "author_summary": author_profile["bio"],
        "source_name": "Ancient-China-Books/guwenguanzhi",
        "source_collection": target["collection"],
        "source_url": source_url,
        "palette": target["palette"],
        "historical_refs": target["historical_refs"],
        "paragraphs": paragraphs,
    }


def fetch_chinese_poetry_targets() -> list[dict[str, Any]]:
    tang_targets = [item for item in TARGETS if item["source_bucket"] == "chinese-poetry-tang"]
    songci_targets = [item for item in TARGETS if item["source_bucket"] == "chinese-poetry-songci"]
    pending: dict[str, dict[str, Any]] = {item["slug"]: item for item in tang_targets + songci_targets}
    found: list[dict[str, Any]] = []

    buckets = [
        (
            "全唐诗",
            lambda entry: entry["name"].startswith("poet.tang.") and entry["name"].endswith(".json"),
            tang_targets,
        ),
        (
            "宋词",
            lambda entry: entry["name"].startswith("ci.song.") and entry["name"].endswith(".json"),
            songci_targets,
        ),
    ]

    local_repo_dir = RAW_DIR / "source-repos" / "chinese-poetry"

    for folder_name, predicate, candidates in buckets:
        local_folder = local_repo_dir / folder_name
        if local_folder.exists():
            entries = [{"name": path.name, "local_path": path} for path in local_folder.iterdir() if path.is_file() and predicate({"name": path.name})]
        else:
            entries = [entry for entry in folder_entries("chinese-poetry", "chinese-poetry", folder_name) if predicate(entry)]
        entries.sort(key=lambda item: numeric_suffix(item["name"]))
        folder_raw_dir = RAW_DIR / "chinese-poetry" / folder_name
        folder_raw_dir.mkdir(parents=True, exist_ok=True)

        for entry in entries:
            relevant_targets = [item for item in candidates if item["slug"] in pending]
            if not relevant_targets:
                break
            if entry.get("local_path"):
                payload = json.loads(Path(entry["local_path"]).read_text(encoding="utf-8"))
                source_url = str(entry["local_path"])
            else:
                payload = fetch_json(entry["download_url"])
                source_url = entry["download_url"]
            matched_here: list[tuple[dict[str, Any], dict[str, Any]]] = []
            matched_slugs_in_file: set[str] = set()
            for poem in payload:
                author = poem.get("author", "")
                title = poem.get("title") or poem.get("rhythmic") or ""
                raw_text = "\n".join(poem.get("paragraphs", []))
                for target in relevant_targets:
                    if target["slug"] not in pending or target["slug"] in matched_slugs_in_file:
                        continue
                    author_aliases = set(target.get("author_aliases", [])) | {target["author"]}
                    lookup_title = target.get("lookup_title", target["title"])
                    snippet = target.get("match_snippet")
                    if snippet:
                        is_match = snippet in raw_text
                    else:
                        is_match = title == lookup_title or title.startswith(lookup_title) or lookup_title in title
                    if author in author_aliases and is_match:
                        matched_here.append((target, poem))
                        matched_slugs_in_file.add(target["slug"])
                        break
            if matched_here:
                write_json(folder_raw_dir / entry["name"], payload)
                for target, poem in matched_here:
                    found.append(normalize_poem(target, poem, source_url))
                    pending.pop(target["slug"], None)

    missing = [item["title"] for item in tang_targets + songci_targets if item["slug"] in pending]
    if missing:
        raise RuntimeError(f"以下诗词未在首批抓取中命中：{', '.join(missing)}")

    return found


def fetch_guwenguanzhi_targets() -> list[dict[str, Any]]:
    toc_url = "https://raw.githubusercontent.com/Ancient-China-Books/guwenguanzhi/master/OEBPS/toc.ncx"
    toc_xml = fetch_url(toc_url)
    toc_root = ET.fromstring(toc_xml)
    ns = {"ncx": "http://www.daisy.org/z3986/2005/ncx/"}
    title_to_src: dict[str, str] = {}
    for nav_point in toc_root.findall(".//ncx:navPoint", ns):
        title_node = nav_point.find("ncx:navLabel/ncx:text", ns)
        src_node = nav_point.find("ncx:content", ns)
        if title_node is None or src_node is None:
            continue
        title_to_src["".join(title_node.itertext()).strip()] = src_node.attrib.get("src", "")

    results: list[dict[str, Any]] = []
    raw_dir = RAW_DIR / "guwenguanzhi"
    raw_dir.mkdir(parents=True, exist_ok=True)
    guwen_targets = [item for item in TARGETS if item["source_bucket"] == "guwenguanzhi"]

    for target in guwen_targets:
        src = title_to_src.get(target["lookup_title"])
        if not src:
            raise RuntimeError(f"古文观止目录中未找到：{target['lookup_title']}")
        source_url = f"https://raw.githubusercontent.com/Ancient-China-Books/guwenguanzhi/master/OEBPS/{src}"
        html_text = fetch_url(source_url)
        (raw_dir / Path(src).name).write_text(html_text, encoding="utf-8")
        results.append(normalize_guwen(target, html_text, source_url))

    return results


def build_authors(works: list[dict[str, Any]]) -> list[dict[str, Any]]:
    authors: dict[str, dict[str, Any]] = {}
    for work in works:
        author_name = work["author_name"]
        profile = AUTHOR_PROFILES[author_name]
        authors[author_name] = {
            "id": f"author-{author_name}",
            "name": author_name,
            "dynasty": profile["dynasty"],
            "bio": profile["bio"],
            "achievements": work["theme_label"],
            "avatar_asset_id": None,
        }
    return list(authors.values())


def build_relations(works: list[dict[str, Any]]) -> list[dict[str, Any]]:
    relations: list[dict[str, Any]] = []
    grouped_by_slug = {work["slug"]: work for work in works}
    for work in works:
        candidates: list[tuple[int, str, dict[str, Any]]] = []
        for other in works:
            if other["id"] == work["id"]:
                continue
            score = 0
            relation_type = []
            if other["author_id"] == work["author_id"]:
                score += 40
                relation_type.append("同作者")
            shared_tags = set(other["tags"]) & set(work["tags"])
            if shared_tags:
                score += 10 * len(shared_tags)
                relation_type.append("同主题")
            if other["collection"] == work["collection"]:
                score += 8
                relation_type.append("同专题")
            if other["dynasty"] == work["dynasty"]:
                score += 4
                relation_type.append("同时代")
            if score > 0:
                candidates.append((score, " / ".join(relation_type), other))
        candidates.sort(key=lambda item: item[0], reverse=True)
        for score, relation_label, other in candidates[:4]:
            relations.append(
                {
                    "id": f"rel-{work['slug']}-{other['slug']}",
                    "from_work_id": work["id"],
                    "to_work_id": other["id"],
                    "relation_type": relation_label,
                    "score": score,
                }
            )
    return relations


def build_quizzes(works: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rng = random.Random(20260407)
    all_authors = sorted({work["author_name"] for work in works})
    all_themes = sorted({work["theme_label"] for work in works})
    all_stages = ["小学", "初中", "高中"]
    quizzes: list[dict[str, Any]] = []

    def pick_options(correct: str, pool: list[str], size: int = 4) -> list[str]:
        choices = [item for item in pool if item != correct]
        sampled = rng.sample(choices, k=min(size - 1, len(choices)))
        options = sampled + [correct]
        rng.shuffle(options)
        return options

    for work in works:
        author_options = pick_options(work["author_name"], all_authors)
        theme_options = pick_options(work["theme_label"], all_themes)
        stage_options = pick_options(work["textbook_stage"], all_stages)
        quiz_bundle = [
            {
                "id": f"quiz-{work['slug']}-1",
                "work_id": work["id"],
                "question_type": "single_choice",
                "stem": f"《{work['title']}》的作者是谁？",
                "options": author_options,
                "answer": work["author_name"],
                "explanation": f"这篇作品的作者是{work['author_name']}，页面中也附有作者背景介绍。",
                "difficulty": work["difficulty_level"],
            },
            {
                "id": f"quiz-{work['slug']}-2",
                "work_id": work["id"],
                "question_type": "single_choice",
                "stem": f"在这批原型数据里，《{work['title']}》更接近哪个学习主题？",
                "options": theme_options,
                "answer": work["theme_label"],
                "explanation": f"这篇作品在原型里被归入“{work['theme_label']}”主题，便于做相关推荐与闯关学习。",
                "difficulty": work["difficulty_level"],
            },
            {
                "id": f"quiz-{work['slug']}-3",
                "work_id": work["id"],
                "question_type": "single_choice",
                "stem": f"《{work['title']}》更适合放在哪个学习阶段？",
                "options": stage_options,
                "answer": work["textbook_stage"],
                "explanation": f"当前原型将这篇作品标记为“{work['textbook_stage']}”阶段内容，方便后续按学段组织。",
                "difficulty": work["difficulty_level"],
            },
        ]
        quizzes.extend(quiz_bundle)
    return quizzes


def main() -> None:
    works = fetch_chinese_poetry_targets() + fetch_guwenguanzhi_targets()
    works.sort(key=lambda item: (item["collection"], item["difficulty_level"], item["slug"]))
    authors = build_authors(works)
    assets = [create_cover_svg(work) for work in works]
    quizzes = build_quizzes(works)
    relations = build_relations(works)

    dataset = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "summary": {
            "works": len(works),
            "authors": len(authors),
            "assets": len(assets),
            "quizzes": len(quizzes),
            "relations": len(relations),
            "collections": {
                "唐诗精选": sum(1 for work in works if work["collection"] == "唐诗精选"),
                "宋词精选": sum(1 for work in works if work["collection"] == "宋词精选"),
                "古文精选": sum(1 for work in works if work["collection"] == "古文精选"),
            },
        },
        "sources": [
            {
                "name": "chinese-poetry",
                "license": "MIT",
                "url": "https://github.com/chinese-poetry/chinese-poetry",
                "usage": "唐诗与宋词原文采集",
            },
            {
                "name": "Ancient-China-Books/guwenguanzhi",
                "license": "MIT",
                "url": "https://github.com/Ancient-China-Books/guwenguanzhi",
                "usage": "古文观止正文与翻译采集",
            },
        ],
        "authors": authors,
        "works": works,
        "assets": assets,
        "quizzes": quizzes,
        "relations": relations,
    }
    write_json(PROCESSED_DIR / "initial-library.json", dataset)
    print(f"已生成首批数据：{PROCESSED_DIR / 'initial-library.json'}")
    print(f"作品数：{len(works)}，作者数：{len(authors)}，练习题数：{len(quizzes)}")


if __name__ == "__main__":
    main()
