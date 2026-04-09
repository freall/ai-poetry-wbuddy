#!/usr/bin/env python3
"""
生成 Supabase 迁移 SQL：
1. 建表（PostgreSQL 语法，带 Supabase 需要的列）
2. 插入所有内容数据（authors, works, assets, quizzes, relations, achievement_definitions）
3. 配置 RLS 策略

生成的 SQL 通过 psql 或 Supabase Dashboard 执行。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT / "data" / "processed" / "classics-library.json"
OUTPUT_PATH = ROOT / "scripts" / "supabase-migration.sql"

ACHIEVEMENT_DEFINITIONS = [
    ("achievement-first-scroll", "初入诗境", "完成第一篇作品浏览，点亮学习旅程。", "sparkles", "viewed_count", 1, "gold"),
    ("achievement-growing-reader", "渐入佳境", "累计浏览 7 篇作品，形成稳定的阅读节奏。", "book-open-check", "viewed_count", 7, "jade"),
    ("achievement-mastery-starter", "会背也会懂", "掌握 3 篇作品，拿到第一个学习徽章。", "medal", "mastered_count", 3, "rose"),
    ("achievement-quiz-runner", "答题连击", "累计答对 12 题，说明不仅在看，也在真正理解。", "target", "quiz_correct_count", 12, "indigo"),
    ("achievement-streak-keeper", "七日有风", "连续学习 5 天，开始建立自己的古典节奏。", "flame", "streak_days", 5, "amber"),
]


def esc(s: str | None) -> str:
    """Escape single quotes for SQL."""
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def esc_json(obj) -> str:
    """Serialize to JSON and escape for SQL."""
    return "'" + json.dumps(obj, ensure_ascii=False).replace("'", "''") + "'"


def generate_schema_sql() -> list[str]:
    return [
        "-- ══════════════════════════════════════════════════════════════",
        "-- Supabase Migration: Schema",
        "-- ══════════════════════════════════════════════════════════════",
        "",
        "DROP TABLE IF EXISTS user_achievements CASCADE;",
        "DROP TABLE IF EXISTS mistake_notebook CASCADE;",
        "DROP TABLE IF EXISTS learning_progress CASCADE;",
        "DROP TABLE IF EXISTS achievement_definitions CASCADE;",
        "DROP TABLE IF EXISTS relations CASCADE;",
        "DROP TABLE IF EXISTS quizzes CASCADE;",
        "DROP TABLE IF EXISTS assets CASCADE;",
        "DROP TABLE IF EXISTS works CASCADE;",
        "DROP TABLE IF EXISTS authors CASCADE;",
        "",
        "CREATE TABLE authors (",
        "  id TEXT PRIMARY KEY,",
        "  name TEXT NOT NULL UNIQUE,",
        "  dynasty TEXT NOT NULL,",
        "  bio TEXT NOT NULL DEFAULT '',",
        "  achievements TEXT,",
        "  avatar_asset_id TEXT,",
        "  created_at TIMESTAMPTZ DEFAULT NOW()",
        ");",
        "",
        "CREATE TABLE works (",
        "  id TEXT PRIMARY KEY,",
        "  slug TEXT NOT NULL UNIQUE,",
        "  title TEXT NOT NULL,",
        "  author_id TEXT NOT NULL REFERENCES authors(id),",
        "  dynasty TEXT NOT NULL,",
        "  genre TEXT NOT NULL,",
        "  collection TEXT NOT NULL,",
        "  textbook_stage TEXT,",
        "  difficulty_level INTEGER NOT NULL DEFAULT 1,",
        "  theme_label TEXT,",
        "  tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,",
        "  original_text TEXT NOT NULL DEFAULT '',",
        "  translation_text TEXT,",
        "  background_text TEXT,",
        "  appreciation_text TEXT,",
        "  author_summary TEXT,",
        "  source_name TEXT,",
        "  source_collection TEXT,",
        "  source_url TEXT,",
        "  cover_asset_path TEXT,",
        "  created_at TIMESTAMPTZ DEFAULT NOW()",
        ");",
        "",
        "CREATE TABLE assets (",
        "  id TEXT PRIMARY KEY,",
        "  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,",
        "  asset_type TEXT NOT NULL,",
        "  local_path TEXT NOT NULL DEFAULT '',",
        "  source_url TEXT,",
        "  license TEXT,",
        "  credit TEXT,",
        "  prompt TEXT,",
        "  status TEXT NOT NULL DEFAULT 'pending',",
        "  created_at TIMESTAMPTZ DEFAULT NOW()",
        ");",
        "",
        "CREATE TABLE quizzes (",
        "  id TEXT PRIMARY KEY,",
        "  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,",
        "  question_type TEXT NOT NULL DEFAULT 'choice',",
        "  stem TEXT NOT NULL DEFAULT '',",
        "  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,",
        "  answer TEXT NOT NULL DEFAULT '',",
        "  explanation TEXT,",
        "  difficulty INTEGER NOT NULL DEFAULT 1,",
        "  created_at TIMESTAMPTZ DEFAULT NOW()",
        ");",
        "",
        "CREATE TABLE relations (",
        "  id TEXT PRIMARY KEY,",
        "  from_work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,",
        "  to_work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,",
        "  relation_type TEXT NOT NULL DEFAULT 'similar',",
        "  score INTEGER NOT NULL DEFAULT 0,",
        "  created_at TIMESTAMPTZ DEFAULT NOW()",
        ");",
        "",
        "CREATE TABLE achievement_definitions (",
        "  id TEXT PRIMARY KEY,",
        "  title TEXT NOT NULL,",
        "  description TEXT NOT NULL DEFAULT '',",
        "  icon TEXT NOT NULL DEFAULT 'sparkles',",
        "  metric TEXT NOT NULL,",
        "  threshold INTEGER NOT NULL DEFAULT 1,",
        "  theme TEXT NOT NULL DEFAULT 'jade',",
        "  created_at TIMESTAMPTZ DEFAULT NOW()",
        ");",
        "",
        "CREATE TABLE learning_progress (",
        "  id TEXT PRIMARY KEY,",
        "  user_local_id TEXT NOT NULL,",
        "  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,",
        "  viewed BOOLEAN NOT NULL DEFAULT FALSE,",
        "  mastered BOOLEAN NOT NULL DEFAULT FALSE,",
        "  streak INTEGER NOT NULL DEFAULT 0,",
        "  quiz_score INTEGER NOT NULL DEFAULT 0,",
        "  reward_status TEXT NOT NULL DEFAULT 'locked',",
        "  updated_at TIMESTAMPTZ DEFAULT NOW(),",
        "  UNIQUE(user_local_id, work_id)",
        ");",
        "",
        "CREATE TABLE mistake_notebook (",
        "  id TEXT PRIMARY KEY,",
        "  user_local_id TEXT NOT NULL,",
        "  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,",
        "  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,",
        "  selected_answer TEXT NOT NULL DEFAULT '',",
        "  correct_answer TEXT NOT NULL DEFAULT '',",
        "  resolved BOOLEAN NOT NULL DEFAULT FALSE,",
        "  attempts INTEGER NOT NULL DEFAULT 1,",
        "  last_seen_at TIMESTAMPTZ DEFAULT NOW(),",
        "  UNIQUE(user_local_id, quiz_id)",
        ");",
        "",
        "CREATE TABLE user_achievements (",
        "  id TEXT PRIMARY KEY,",
        "  achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,",
        "  user_local_id TEXT NOT NULL,",
        "  progress_value INTEGER NOT NULL DEFAULT 0,",
        "  unlocked_at TIMESTAMPTZ DEFAULT NOW(),",
        "  UNIQUE(user_local_id, achievement_id)",
        ");",
        "",
        "-- ══════════════════════════════════════════════════════════════",
        "-- Indexes",
        "-- ══════════════════════════════════════════════════════════════",
        "",
        "CREATE INDEX idx_works_collection ON works(collection);",
        "CREATE INDEX idx_works_stage ON works(textbook_stage);",
        "CREATE INDEX idx_works_author ON works(author_id);",
        "CREATE INDEX idx_works_dynasty ON works(dynasty);",
        "CREATE INDEX idx_works_search ON works USING GIN(to_tsvector('simple', title || ' ' || COALESCE(theme_label, '') || ' ' || original_text));",
        "CREATE INDEX idx_assets_work_id ON assets(work_id);",
        "CREATE INDEX idx_quizzes_work_id ON quizzes(work_id);",
        "CREATE INDEX idx_relations_from ON relations(from_work_id);",
        "CREATE INDEX idx_relations_to ON relations(to_work_id);",
        "CREATE INDEX idx_learning_progress_user ON learning_progress(user_local_id);",
        "CREATE INDEX idx_mistake_notebook_user ON mistake_notebook(user_local_id);",
        "CREATE INDEX idx_user_achievements_user ON user_achievements(user_local_id);",
        "",
    ]


def generate_data_sql(dataset: dict) -> list[str]:
    lines = [
        "-- ══════════════════════════════════════════════════════════════",
        "-- Seed Content Data",
        "-- ══════════════════════════════════════════════════════════════",
        "",
    ]

    # Authors
    lines.append("INSERT INTO authors (id, name, dynasty, bio, achievements) VALUES")
    author_values = []
    for a in dataset["authors"]:
        author_values.append(
            f"({esc(a['id'])}, {esc(a['name'])}, {esc(a['dynasty'])}, {esc(a.get('bio', ''))}, {esc(a.get('achievements'))})"
        )
    lines.append(",\n".join(author_values) + ";")
    lines.append("")

    # Works
    asset_lookup = {asset["work_id"]: asset["local_path"] for asset in dataset["assets"]}
    lines.append("INSERT INTO works (id, slug, title, author_id, dynasty, genre, collection, textbook_stage, difficulty_level, theme_label, tags_json, original_text, translation_text, background_text, appreciation_text, author_summary, source_name, source_collection, source_url, cover_asset_path) VALUES")
    work_values = []
    for w in dataset["works"]:
        work_values.append(
            f"({esc(w['id'])}, {esc(w['slug'])}, {esc(w['title'])}, {esc(w['author_id'])}, "
            f"{esc(w['dynasty'])}, {esc(w['genre'])}, {esc(w['collection'])}, {esc(w.get('textbook_stage'))}, "
            f"{w.get('difficulty_level', 1)}, {esc(w.get('theme_label'))}, {esc_json(w.get('tags', []))}, "
            f"{esc(w.get('original_text', ''))}, {esc(w.get('translation_text'))}, {esc(w.get('background_text'))}, "
            f"{esc(w.get('appreciation_text'))}, {esc(w.get('author_summary'))}, {esc(w.get('source_name'))}, "
            f"{esc(w.get('source_collection'))}, {esc(w.get('source_url'))}, {esc(asset_lookup.get(w['id']))})"
        )
    lines.append(",\n".join(work_values) + ";")
    lines.append("")

    # Assets
    lines.append("INSERT INTO assets (id, work_id, asset_type, local_path, source_url, license, credit, prompt, status) VALUES")
    asset_values = []
    for a in dataset["assets"]:
        asset_values.append(
            f"({esc(a['id'])}, {esc(a['work_id'])}, {esc(a.get('asset_type', 'cover'))}, "
            f"{esc(a.get('local_path', ''))}, {esc(a.get('source_url'))}, {esc(a.get('license'))}, "
            f"{esc(a.get('credit'))}, {esc(a.get('prompt'))}, {esc(a.get('status', 'ready'))})"
        )
    lines.append(",\n".join(asset_values) + ";")
    lines.append("")

    # Quizzes
    lines.append("INSERT INTO quizzes (id, work_id, question_type, stem, options_json, answer, explanation, difficulty) VALUES")
    quiz_values = []
    for q in dataset["quizzes"]:
        quiz_values.append(
            f"({esc(q['id'])}, {esc(q['work_id'])}, {esc(q.get('question_type', 'choice'))}, "
            f"{esc(q.get('stem', ''))}, {esc_json(q.get('options', []))}, {esc(q.get('answer', ''))}, "
            f"{esc(q.get('explanation'))}, {q.get('difficulty', 1)})"
        )
    lines.append(",\n".join(quiz_values) + ";")
    lines.append("")

    # Relations
    lines.append("INSERT INTO relations (id, from_work_id, to_work_id, relation_type, score) VALUES")
    rel_values = []
    for r in dataset["relations"]:
        rel_values.append(
            f"({esc(r['id'])}, {esc(r['from_work_id'])}, {esc(r['to_work_id'])}, "
            f"{esc(r.get('relation_type', 'similar'))}, {r.get('score', 0)})"
        )
    lines.append(",\n".join(rel_values) + ";")
    lines.append("")

    # Achievement definitions
    lines.append("INSERT INTO achievement_definitions (id, title, description, icon, metric, threshold, theme) VALUES")
    ach_values = []
    for ach in ACHIEVEMENT_DEFINITIONS:
        ach_values.append(
            f"({esc(ach[0])}, {esc(ach[1])}, {esc(ach[2])}, {esc(ach[3])}, {esc(ach[4])}, {ach[5]}, {esc(ach[6])})"
        )
    lines.append(",\n".join(ach_values) + ";")
    lines.append("")

    return lines


def generate_rls_sql() -> list[str]:
    """RLS: 公开数据表允许 anon 读取；用户数据表需要 anon key 可读写（当前是 demo 模式）。"""
    return [
        "-- ══════════════════════════════════════════════════════════════",
        "-- RLS Policies",
        "-- ══════════════════════════════════════════════════════════════",
        "",
        "-- Enable RLS on user-facing tables",
        "ALTER TABLE authors ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE works ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE assets ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE relations ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE mistake_notebook ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;",
        "",
        "-- Public read on content tables",
        "CREATE POLICY \"Public read authors\" ON authors FOR SELECT USING (true);",
        "CREATE POLICY \"Public read works\" ON works FOR SELECT USING (true);",
        "CREATE POLICY \"Public read assets\" ON assets FOR SELECT USING (true);",
        "CREATE POLICY \"Public read quizzes\" ON quizzes FOR SELECT USING (true);",
        "CREATE POLICY \"Public read relations\" ON relations FOR SELECT USING (true);",
        "CREATE POLICY \"Public read achievements\" ON achievement_definitions FOR SELECT USING (true);",
        "CREATE POLICY \"Public read user achievements\" ON user_achievements FOR SELECT USING (true);",
        "",
        "-- Anon can read/write learning progress (demo mode — no auth required)",
        "CREATE POLICY \"Anon read learning progress\" ON learning_progress FOR SELECT USING (true);",
        "CREATE POLICY \"Anon insert learning progress\" ON learning_progress FOR INSERT WITH CHECK (true);",
        "CREATE POLICY \"Anon update learning progress\" ON learning_progress FOR UPDATE USING (true) WITH CHECK (true);",
        "",
        "-- Anon can read/write mistake notebook",
        "CREATE POLICY \"Anon read mistakes\" ON mistake_notebook FOR SELECT USING (true);",
        "CREATE POLICY \"Anon insert mistakes\" ON mistake_notebook FOR INSERT WITH CHECK (true);",
        "CREATE POLICY \"Anon update mistakes\" ON mistake_notebook FOR UPDATE USING (true) WITH CHECK (true);",
        "",
        "-- Anon can read/write user achievements",
        "CREATE POLICY \"Anon insert user achievements\" ON user_achievements FOR INSERT WITH CHECK (true);",
        "CREATE POLICY \"Anon update user achievements\" ON user_achievements FOR UPDATE USING (true) WITH CHECK (true);",
        "",
    ]


def main() -> None:
    if not DATASET_PATH.exists():
        print(f"ERROR: Dataset not found at {DATASET_PATH}")
        sys.exit(1)

    dataset = json.loads(DATASET_PATH.read_text(encoding="utf-8"))

    sql_lines = []
    sql_lines.extend(generate_schema_sql())
    sql_lines.extend(generate_data_sql(dataset))
    sql_lines.extend(generate_rls_sql())

    sql_text = "\n".join(sql_lines)
    OUTPUT_PATH.write_text(sql_text, encoding="utf-8")

    print(f"Migration SQL generated: {OUTPUT_PATH}")
    print(f"  Size: {len(sql_text):,} bytes")
    print(f"  Authors: {len(dataset['authors'])}")
    print(f"  Works: {len(dataset['works'])}")
    print(f"  Assets: {len(dataset['assets'])}")
    print(f"  Quizzes: {len(dataset['quizzes'])}")
    print(f"  Relations: {len(dataset['relations'])}")
    print(f"  Achievements: {len(ACHIEVEMENT_DEFINITIONS)}")


if __name__ == "__main__":
    main()
