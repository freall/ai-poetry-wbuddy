from __future__ import annotations

import hashlib
import html
import json
import random
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ROOT / "data" / "processed"
RAW_REPO_DIR = ROOT / "data" / "raw" / "source-repos" / "chinese-poetry"
IMG_DIR = ROOT / "public" / "images" / "generated"

BASE_DATASET_PATH = PROCESSED_DIR / "initial-library.json"
TANG_PATH = RAW_REPO_DIR / "全唐诗" / "唐诗三百首.json"
SONG_PATH = RAW_REPO_DIR / "宋词" / "宋词三百首.json"
OUTPUT_DATASET_PATH = PROCESSED_DIR / "classics-library.json"

TARGET_TOTAL = 132
TARGET_BY_COLLECTION = {
    "唐诗三百首": 72,
    "宋词三百首": 44,
}

IMG_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

PALETTE_GROUPS = {
    "唐诗三百首": [
        ["#172554", "#1d4ed8", "#dbeafe"],
        ["#3f1d0d", "#c2410c", "#ffedd5"],
        ["#14532d", "#65a30d", "#ecfccb"],
        ["#3b0764", "#9333ea", "#f3e8ff"],
    ],
    "宋词三百首": [
        ["#111827", "#4338ca", "#eef2ff"],
        ["#4c0519", "#db2777", "#fce7f3"],
        ["#1f2937", "#d97706", "#fef3c7"],
        ["#312e81", "#6366f1", "#e0e7ff"],
    ],
    "古文精选": [
        ["#0f172a", "#334155", "#e2e8f0"],
        ["#3f3f46", "#71717a", "#f4f4f5"],
    ],
}

IGNORED_THEME_TAGS = {
    "唐诗三百首",
    "宋词三百首",
    "五言律诗",
    "七言律诗",
    "五言绝句",
    "七言绝句",
    "乐府",
    "词",
    "诗",
}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_title(value: str) -> str:
    return re.sub(r"[\s\u3000《》〈〉（）()【】\[\]·•・，,。！？!?:：；;\-—]+", "", value)



def slugify(value: str) -> str:
    original = value
    value = value.strip().lower().replace("·", "-")
    value = re.sub(r"\s+", "-", value)
    value = re.sub(r"[^0-9a-z\u4e00-\u9fff-]+", "", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or hashlib.sha1(original.encode("utf-8")).hexdigest()[:12]


base_dataset = read_json(BASE_DATASET_PATH)
BASE_AUTHOR_BIOS = {author["name"]: author["bio"] for author in base_dataset["authors"]}
BASE_WORKS_BY_KEY = {
    f"{normalize_title(work['title'])}::{normalize_title(work['author_name'])}": work
    for work in base_dataset["works"]
}


def choose_palette(collection: str, slug: str) -> list[str]:
    palettes = PALETTE_GROUPS[collection]
    index = int(hashlib.sha1(slug.encode("utf-8")).hexdigest(), 16) % len(palettes)
    return palettes[index]



def build_song_title(rhythmic: str, paragraphs: list[str]) -> str:
    first_line = paragraphs[0] if paragraphs else rhythmic
    clean_line = re.sub(r"[，。！？、；：,.!?;: ]", "", first_line)
    fragment = clean_line[:8]
    return rhythmic if not fragment else f"{rhythmic}·{fragment}"



def derive_theme(tags: list[str], fallback: str) -> str:
    for tag in tags:
        if tag not in IGNORED_THEME_TAGS:
            return tag
    return fallback



def derive_stage_and_difficulty(text: str, genre: str) -> tuple[str, int]:
    text_length = len(re.sub(r"\s+", "", text))
    line_count = max(1, len([line for line in text.splitlines() if line.strip()]))
    score = 1
    if text_length > 40 or line_count > 4:
        score = 2
    if text_length > 80 or line_count > 8:
        score = 3
    if text_length > 150 or line_count > 14:
        score = 4
    if text_length > 280 or line_count > 24:
        score = 5

    if genre == "词" and score < 2:
        score = 2

    stage = "小学"
    if score >= 3:
        stage = "初中"
    if score >= 4:
        stage = "高中"
    return stage, score



def build_author_bio(author: str, dynasty: str, genre: str) -> str:
    existing = BASE_AUTHOR_BIOS.get(author)
    if existing:
        return existing
    genre_label = "诗文作家" if genre == "古文" else ("词人" if genre == "词" else "诗人")
    return f"{author}，{dynasty}{genre_label}。当前版本已先收录其代表作品原文与基础学习信息，更完整的生平、风格与创作背景会在后续版本继续补齐。"



def placeholder_translation(title: str) -> str:
    return f"《{title}》已完成原文入库，详细译文与逐句讲解正在补充中。当前可先结合主题标签、作者卡片与练习题完成第一轮学习。"



def placeholder_background(title: str, collection: str) -> str:
    return f"《{title}》现已纳入{collection}扩充内容库。本版优先完成原文、作者和可检索结构，后续会继续补充教材背景、创作缘起与重点注释。"



def placeholder_appreciation(theme: str, tags: list[str]) -> str:
    emphasis = "、".join(tags[:3]) if tags else theme
    return f"建议先从“{theme}”这一核心主题切入，再结合“{emphasis}”等关键词理解作品意境，做题后回看原文，记忆会更稳。"



def build_historical_refs(collection: str, theme: str) -> list[str]:
    base = {
        "唐诗三百首": ["唐人诗意图", "山水册页", "花鸟册页"],
        "宋词三百首": ["文人雅集图", "月夜赏景图", "词意画卷"],
        "古文精选": ["古代书法册页", "人物故事图", "山水长卷"],
    }
    return [theme, *base.get(collection, ["古典题材图像", "书法作品"])]



def wrap_title_lines(title: str, width: int = 8) -> list[str]:
    parts = re.split(r"[··]", title)
    if len(parts) > 1:
        return [parts[0], "·" + parts[1]]
    if len(title) <= width:
        return [title]
    return [title[:width], title[width : width * 2]]



def create_cover_svg(work: dict[str, Any]) -> dict[str, Any]:
    slug = work["slug"]
    title_lines = wrap_title_lines(work["title"])
    author = html.escape(work["author_name"])
    collection = html.escape(work["collection"])
    tag = html.escape(work["theme_label"])
    c1, c2, c3 = work["palette"]
    text_nodes = []
    y = 590
    font_size = 94 if max(len(line) for line in title_lines) <= 8 else 80
    for line in title_lines[:2]:
        safe_line = html.escape(line)
        text_nodes.append(
            f'<text x="140" y="{y}" fill="#ffffff" font-size="{font_size}" font-weight="700" font-family="PingFang SC, Microsoft YaHei, sans-serif">{safe_line}</text>'
        )
        y += 102

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
  <circle cx="940" cy="280" r="240" fill="rgba(255,255,255,0.08)" />
  <circle cx="1040" cy="1230" r="180" fill="rgba(255,255,255,0.08)" />
  <path d="M0 1160 C 180 1040, 380 980, 620 1060 C 790 1118, 940 1250, 1200 1160 V1600 H0 Z" fill="rgba(255,255,255,0.12)" />
  <path d="M140 360 H1060" stroke="url(#line)" stroke-width="2" stroke-linecap="round" />
  <path d="M140 1210 H1060" stroke="url(#line)" stroke-width="2" stroke-linecap="round" />
  <rect x="140" y="160" width="260" height="56" rx="28" fill="rgba(255,255,255,0.16)" />
  <text x="270" y="197" text-anchor="middle" fill="#ffffff" font-size="28" font-family="PingFang SC, Microsoft YaHei, sans-serif">{collection}</text>
  {''.join(text_nodes)}
  <text x="140" y="790" fill="rgba(255,255,255,0.9)" font-size="42" font-family="PingFang SC, Microsoft YaHei, sans-serif">{author}</text>
  <text x="140" y="1320" fill="rgba(255,255,255,0.94)" font-size="34" font-family="PingFang SC, Microsoft YaHei, sans-serif">{tag}</text>
  <text x="140" y="1382" fill="rgba(255,255,255,0.72)" font-size="28" font-family="PingFang SC, Microsoft YaHei, sans-serif">Classics Learning Platform · v0.1.0</text>
</svg>'''
    output_path = IMG_DIR / f"{slug}.svg"
    output_path.write_text(svg, encoding="utf-8")
    return {
        "id": f"asset-{slug}-cover",
        "work_id": work["id"],
        "asset_type": "generated_cover",
        "local_path": f"/images/generated/{slug}.svg",
        "source_url": None,
        "license": "local-generated",
        "credit": "Generated locally by build_full_library.py",
        "prompt": f"为《{work['title']}》生成现代化学习卡片封面，主题：{work['theme_label']}",
        "status": "ready",
    }



def build_relations(works: list[dict[str, Any]]) -> list[dict[str, Any]]:
    relations: list[dict[str, Any]] = []
    for work in works:
        candidates: list[tuple[int, str, dict[str, Any]]] = []
        for other in works:
            if other["id"] == work["id"]:
                continue
            score = 0
            relation_labels: list[str] = []
            if other["author_id"] == work["author_id"]:
                score += 50
                relation_labels.append("同作者")
            shared_tags = set(other["tags"]) & set(work["tags"])
            if shared_tags:
                score += min(30, 10 * len(shared_tags))
                relation_labels.append("同主题")
            if other["collection"] == work["collection"]:
                score += 10
                relation_labels.append("同专题")
            if other["dynasty"] == work["dynasty"]:
                score += 5
                relation_labels.append("同时代")
            if score > 0:
                candidates.append((score, " / ".join(relation_labels), other))
        candidates.sort(key=lambda item: item[0], reverse=True)
        for score, relation_type, other in candidates[:4]:
            relations.append(
                {
                    "id": f"rel-{work['slug']}-{other['slug']}",
                    "from_work_id": work["id"],
                    "to_work_id": other["id"],
                    "relation_type": relation_type,
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
        candidates = [item for item in pool if item != correct]
        sampled = rng.sample(candidates, k=min(size - 1, len(candidates)))
        options = sampled + [correct]
        rng.shuffle(options)
        return options

    for work in works:
        quizzes.extend(
            [
                {
                    "id": f"quiz-{work['slug']}-1",
                    "work_id": work["id"],
                    "question_type": "single_choice",
                    "stem": f"《{work['title']}》的作者是谁？",
                    "options": pick_options(work["author_name"], all_authors),
                    "answer": work["author_name"],
                    "explanation": f"《{work['title']}》的作者是{work['author_name']}。",
                    "difficulty": work["difficulty_level"],
                },
                {
                    "id": f"quiz-{work['slug']}-2",
                    "work_id": work["id"],
                    "question_type": "single_choice",
                    "stem": f"在当前内容库里，《{work['title']}》更接近哪个主题？",
                    "options": pick_options(work["theme_label"], all_themes),
                    "answer": work["theme_label"],
                    "explanation": f"这篇作品被归入“{work['theme_label']}”主题，便于搜索和相关推荐。",
                    "difficulty": work["difficulty_level"],
                },
                {
                    "id": f"quiz-{work['slug']}-3",
                    "work_id": work["id"],
                    "question_type": "single_choice",
                    "stem": f"《{work['title']}》当前更适合归到哪个学习阶段？",
                    "options": pick_options(work["textbook_stage"], all_stages),
                    "answer": work["textbook_stage"],
                    "explanation": f"这篇作品当前标记为“{work['textbook_stage']}”阶段内容。",
                    "difficulty": work["difficulty_level"],
                },
            ]
        )
    return quizzes



def normalize_anthology_poem(item: dict[str, Any], collection: str) -> dict[str, Any]:
    author = item["author"].strip()
    paragraphs = [line.strip() for line in item.get("paragraphs", []) if line.strip()]
    title = item.get("title") or build_song_title(item["rhythmic"], paragraphs)
    genre = "词" if collection == "宋词三百首" else "诗"
    original_text = "\n".join(paragraphs)
    stage, difficulty = derive_stage_and_difficulty(original_text, genre)
    raw_tags = [tag.strip() for tag in item.get("tags", []) if tag and tag.strip()]
    tags = list(dict.fromkeys([tag for tag in raw_tags if tag]))
    if not tags:
        tags = [collection, genre]
    theme_label = derive_theme(tags, item.get("rhythmic") or genre)
    slug = slugify(f"{title}-{author}")
    dynasty = "宋" if collection == "宋词三百首" else "唐"
    return {
        "id": f"work-{slug}",
        "slug": slug,
        "title": title,
        "author_name": author,
        "author_id": f"author-{author}",
        "dynasty": dynasty,
        "genre": genre,
        "collection": collection,
        "textbook_stage": stage,
        "difficulty_level": difficulty,
        "tags": tags[:6],
        "theme_label": theme_label,
        "original_text": original_text,
        "translation_text": placeholder_translation(title),
        "background_text": placeholder_background(title, collection),
        "appreciation_text": placeholder_appreciation(theme_label, tags),
        "author_summary": build_author_bio(author, dynasty, genre),
        "source_name": "chinese-poetry",
        "source_collection": collection,
        "source_url": str(TANG_PATH if collection == "唐诗三百首" else SONG_PATH),
        "palette": choose_palette(collection, slug),
        "historical_refs": build_historical_refs(collection, theme_label),
        "paragraphs": paragraphs,
    }



def build_authors(works: list[dict[str, Any]]) -> list[dict[str, Any]]:
    authors: dict[str, dict[str, Any]] = {}
    for work in works:
        author_name = work["author_name"]
        authors[author_name] = {
            "id": f"author-{author_name}",
            "name": author_name,
            "dynasty": work["dynasty"],
            "bio": build_author_bio(author_name, work["dynasty"], work["genre"]),
            "achievements": work["theme_label"],
            "avatar_asset_id": None,
        }
    return sorted(authors.values(), key=lambda item: item["name"])



def build_expanded_works() -> list[dict[str, Any]]:
    works = list(base_dataset["works"])
    existing_keys = set(BASE_WORKS_BY_KEY.keys())

    tang_items = read_json(TANG_PATH)
    song_items = read_json(SONG_PATH)

    counts = {"唐诗三百首": 0, "宋词三百首": 0}

    for collection, source_items in (("唐诗三百首", tang_items), ("宋词三百首", song_items)):
        for item in source_items:
            normalized = normalize_anthology_poem(item, collection)
            key = f"{normalize_title(normalized['title'])}::{normalize_title(normalized['author_name'])}"
            if key in existing_keys:
                continue
            works.append(normalized)
            existing_keys.add(key)
            counts[collection] += 1
            if counts[collection] >= TARGET_BY_COLLECTION[collection]:
                break

    works.sort(key=lambda item: (item["collection"], item["difficulty_level"], item["title"]))
    if len(works) < TARGET_TOTAL:
        raise RuntimeError(f"扩充后作品不足 {TARGET_TOTAL} 篇，当前仅 {len(works)} 篇")
    return works



def main() -> None:
    works = build_expanded_works()
    authors = build_authors(works)
    assets = [create_cover_svg(work) for work in works]
    quizzes = build_quizzes(works)
    relations = build_relations(works)

    collection_summary: dict[str, int] = {}
    for work in works:
        collection_summary[work["collection"]] = collection_summary.get(work["collection"], 0) + 1

    dataset = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "summary": {
            "works": len(works),
            "authors": len(authors),
            "assets": len(assets),
            "quizzes": len(quizzes),
            "relations": len(relations),
            "collections": collection_summary,
        },
        "sources": [
            {
                "name": "chinese-poetry",
                "license": "MIT",
                "url": "https://github.com/chinese-poetry/chinese-poetry",
                "usage": "唐诗、宋词原文与选本采集",
            },
            {
                "name": "Ancient-China-Books/guwenguanzhi",
                "license": "MIT",
                "url": "https://github.com/Ancient-China-Books/guwenguanzhi",
                "usage": "古文观止正文与翻译采集（当前沿用首批精选内容）",
            },
        ],
        "authors": authors,
        "works": works,
        "assets": assets,
        "quizzes": quizzes,
        "relations": relations,
    }
    OUTPUT_DATASET_PATH.write_text(json.dumps(dataset, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"已生成扩充内容库：{OUTPUT_DATASET_PATH}")
    print(f"作品数：{len(works)}，作者数：{len(authors)}，练习题数：{len(quizzes)}")
    print(f"专题分布：{collection_summary}")


if __name__ == "__main__":
    main()
