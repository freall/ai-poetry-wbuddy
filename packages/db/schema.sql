PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS authors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  dynasty TEXT NOT NULL,
  bio TEXT NOT NULL,
  achievements TEXT,
  avatar_asset_id TEXT
);

CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author_id TEXT NOT NULL,
  dynasty TEXT NOT NULL,
  genre TEXT NOT NULL,
  collection TEXT NOT NULL,
  textbook_stage TEXT,
  difficulty_level INTEGER NOT NULL DEFAULT 1,
  theme_label TEXT,
  tags_json TEXT NOT NULL,
  original_text TEXT NOT NULL,
  translation_text TEXT,
  background_text TEXT,
  appreciation_text TEXT,
  author_summary TEXT,
  source_name TEXT,
  source_collection TEXT,
  source_url TEXT,
  cover_asset_path TEXT,
  FOREIGN KEY (author_id) REFERENCES authors(id)
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  local_path TEXT NOT NULL,
  source_url TEXT,
  license TEXT,
  credit TEXT,
  prompt TEXT,
  status TEXT NOT NULL,
  FOREIGN KEY (work_id) REFERENCES works(id)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL,
  question_type TEXT NOT NULL,
  stem TEXT NOT NULL,
  options_json TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT,
  difficulty INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (work_id) REFERENCES works(id)
);

CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,
  from_work_id TEXT NOT NULL,
  to_work_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (from_work_id) REFERENCES works(id),
  FOREIGN KEY (to_work_id) REFERENCES works(id)
);

CREATE TABLE IF NOT EXISTS learning_progress (
  id TEXT PRIMARY KEY,
  user_local_id TEXT NOT NULL,
  work_id TEXT NOT NULL,
  viewed INTEGER NOT NULL DEFAULT 0,
  mastered INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  quiz_score INTEGER NOT NULL DEFAULT 0,
  reward_status TEXT NOT NULL DEFAULT 'locked',
  updated_at TEXT,
  FOREIGN KEY (work_id) REFERENCES works(id)
);

CREATE INDEX IF NOT EXISTS idx_works_collection ON works(collection);
CREATE INDEX IF NOT EXISTS idx_works_stage ON works(textbook_stage);
CREATE INDEX IF NOT EXISTS idx_works_author ON works(author_id);
CREATE INDEX IF NOT EXISTS idx_assets_work_id ON assets(work_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_work_id ON quizzes(work_id);
CREATE INDEX IF NOT EXISTS idx_relations_from_work_id ON relations(from_work_id);
