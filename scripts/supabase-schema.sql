-- ══════════════════════════════════════════════════════════════
-- Supabase Migration: Schema & RLS (DDL)
-- 请在 Supabase Dashboard SQL Editor 中执行此文件
-- https://supabase.com/dashboard/project/kldrdqxtwcufrjcgrrbj/sql
-- ══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS mistake_notebook CASCADE;
DROP TABLE IF EXISTS learning_progress CASCADE;
DROP TABLE IF EXISTS achievement_definitions CASCADE;
DROP TABLE IF EXISTS relations CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS works CASCADE;
DROP TABLE IF EXISTS authors CASCADE;

CREATE TABLE authors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  dynasty TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  achievements TEXT,
  avatar_asset_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE works (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES authors(id),
  dynasty TEXT NOT NULL,
  genre TEXT NOT NULL,
  collection TEXT NOT NULL,
  textbook_stage TEXT,
  difficulty_level INTEGER NOT NULL DEFAULT 1,
  theme_label TEXT,
  tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  original_text TEXT NOT NULL DEFAULT '',
  translation_text TEXT,
  background_text TEXT,
  appreciation_text TEXT,
  author_summary TEXT,
  source_name TEXT,
  source_collection TEXT,
  source_url TEXT,
  cover_asset_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  local_path TEXT NOT NULL DEFAULT '',
  source_url TEXT,
  license TEXT,
  credit TEXT,
  prompt TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quizzes (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL DEFAULT 'choice',
  stem TEXT NOT NULL DEFAULT '',
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  answer TEXT NOT NULL DEFAULT '',
  explanation TEXT,
  difficulty INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE relations (
  id TEXT PRIMARY KEY,
  from_work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  to_work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'similar',
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE achievement_definitions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'sparkles',
  metric TEXT NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 1,
  theme TEXT NOT NULL DEFAULT 'jade',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE learning_progress (
  id TEXT PRIMARY KEY,
  user_local_id TEXT NOT NULL,
  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  viewed BOOLEAN NOT NULL DEFAULT FALSE,
  mastered BOOLEAN NOT NULL DEFAULT FALSE,
  streak INTEGER NOT NULL DEFAULT 0,
  quiz_score INTEGER NOT NULL DEFAULT 0,
  reward_status TEXT NOT NULL DEFAULT 'locked',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_local_id, work_id)
);

CREATE TABLE mistake_notebook (
  id TEXT PRIMARY KEY,
  user_local_id TEXT NOT NULL,
  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  selected_answer TEXT NOT NULL DEFAULT '',
  correct_answer TEXT NOT NULL DEFAULT '',
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_local_id, quiz_id)
);

CREATE TABLE user_achievements (
  id TEXT PRIMARY KEY,
  achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  user_local_id TEXT NOT NULL,
  progress_value INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_local_id, achievement_id)
);

-- ══════════════════════════════════════════════════════════════
-- Indexes
-- ══════════════════════════════════════════════════════════════

CREATE INDEX idx_works_collection ON works(collection);
CREATE INDEX idx_works_stage ON works(textbook_stage);
CREATE INDEX idx_works_author ON works(author_id);
CREATE INDEX idx_works_dynasty ON works(dynasty);
CREATE INDEX idx_works_search ON works USING GIN(to_tsvector('simple', title || ' ' || COALESCE(theme_label, '') || ' ' || original_text));
CREATE INDEX idx_assets_work_id ON assets(work_id);
CREATE INDEX idx_quizzes_work_id ON quizzes(work_id);
CREATE INDEX idx_relations_from ON relations(from_work_id);
CREATE INDEX idx_relations_to ON relations(to_work_id);
CREATE INDEX idx_learning_progress_user ON learning_progress(user_local_id);
CREATE INDEX idx_mistake_notebook_user ON mistake_notebook(user_local_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_local_id);

-- ══════════════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════════════

ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mistake_notebook ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Public read on content tables
CREATE POLICY "Public read authors" ON authors FOR SELECT USING (true);
CREATE POLICY "Public read works" ON works FOR SELECT USING (true);
CREATE POLICY "Public read assets" ON assets FOR SELECT USING (true);
CREATE POLICY "Public read quizzes" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Public read relations" ON relations FOR SELECT USING (true);
CREATE POLICY "Public read achievements" ON achievement_definitions FOR SELECT USING (true);
CREATE POLICY "Public read user achievements" ON user_achievements FOR SELECT USING (true);

-- Anon can read/write learning progress (demo mode)
CREATE POLICY "Anon read learning progress" ON learning_progress FOR SELECT USING (true);
CREATE POLICY "Anon insert learning progress" ON learning_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update learning progress" ON learning_progress FOR UPDATE USING (true) WITH CHECK (true);

-- Anon can read/write mistake notebook
CREATE POLICY "Anon read mistakes" ON mistake_notebook FOR SELECT USING (true);
CREATE POLICY "Anon insert mistakes" ON mistake_notebook FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update mistakes" ON mistake_notebook FOR UPDATE USING (true) WITH CHECK (true);

-- Anon can read/write user achievements
CREATE POLICY "Anon insert user achievements" ON user_achievements FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update user achievements" ON user_achievements FOR UPDATE USING (true) WITH CHECK (true);
