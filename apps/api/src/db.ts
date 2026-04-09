import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { AchievementMetric, ProgressSummary, QuizItem, WorkCard } from "./types.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../../..");

const ACHIEVEMENT_METRIC_LABELS: Record<AchievementMetric, string> = {
  viewed_count: "已浏览作品",
  mastered_count: "已掌握作品",
  quiz_correct_count: "累计答对题目",
  streak_days: "连续学习天数",
};

const resolveDbPath = () => {
  const configuredPath = process.env.CLASSICS_DB_PATH ?? "./data/processed/classics-app.db";
  return isAbsolute(configuredPath) ? configuredPath : resolve(repoRoot, configuredPath);
};

const parseJsonArray = (value: string | null) => {
  if (!value) {
    return [] as string[];
  }
  return JSON.parse(value) as string[];
};

const buildExcerpt = (text: string) => {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 52 ? `${compact.slice(0, 52)}...` : compact;
};

const mapWorkCard = (row: Record<string, unknown>): WorkCard => ({
  id: String(row.id),
  slug: String(row.slug),
  title: String(row.title),
  authorName: String(row.author_name),
  dynasty: String(row.dynasty),
  genre: String(row.genre),
  collection: String(row.collection),
  textbookStage: row.textbook_stage ? String(row.textbook_stage) : null,
  difficultyLevel: Number(row.difficulty_level),
  themeLabel: row.theme_label ? String(row.theme_label) : null,
  tags: parseJsonArray((row.tags_json as string | null) ?? null),
  coverAssetPath: row.cover_asset_path ? String(row.cover_asset_path) : null,
  originalText: String(row.original_text),
  backgroundText: row.background_text ? String(row.background_text) : null,
  authorSummary: row.author_summary ? String(row.author_summary) : null,
  quizCount: Number(row.quiz_count ?? 0),
  relationCount: Number(row.relation_count ?? 0),
});

const mapQuiz = (row: Record<string, unknown>): QuizItem => ({
  id: String(row.id),
  workId: String(row.work_id),
  questionType: String(row.question_type),
  stem: String(row.stem),
  options: parseJsonArray((row.options_json as string | null) ?? null),
  answer: String(row.answer),
  explanation: row.explanation ? String(row.explanation) : null,
  difficulty: Number(row.difficulty),
});

const toInteger = (value: unknown) => Number(value ?? 0);

export const createRepository = () => {
  const dbPath = resolveDbPath();
  if (!existsSync(dbPath)) {
    throw new Error(`数据库不存在，请先执行 npm run build:data -> ${dbPath}`);
  }

  const db = new Database(dbPath, { readonly: false, fileMustExist: true });
  db.pragma("foreign_keys = ON");

  const getMetricValues = (userId: string) => {
    const row = db
      .prepare(
        `
        SELECT
          SUM(CASE WHEN viewed = 1 THEN 1 ELSE 0 END) AS viewed_count,
          SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END) AS mastered_count,
          COALESCE(SUM(quiz_score), 0) AS quiz_correct_count,
          COALESCE(MAX(streak), 0) AS streak_days
        FROM learning_progress
        WHERE user_local_id = ?
      `,
      )
      .get(userId) as Record<string, unknown> | undefined;

    return {
      viewed_count: toInteger(row?.viewed_count),
      mastered_count: toInteger(row?.mastered_count),
      quiz_correct_count: toInteger(row?.quiz_correct_count),
      streak_days: toInteger(row?.streak_days),
    } as Record<AchievementMetric, number>;
  };

  const syncAchievements = (userId: string) => {
    const metrics = getMetricValues(userId);
    const now = new Date().toISOString();
    const definitions = db
      .prepare("SELECT id, metric, threshold FROM achievement_definitions ORDER BY threshold ASC")
      .all() as Array<Record<string, unknown>>;

    const insertAchievement = db.prepare(
      `
      INSERT INTO user_achievements (id, achievement_id, user_local_id, progress_value, unlocked_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_local_id, achievement_id) DO UPDATE SET
        progress_value = excluded.progress_value,
        unlocked_at = user_achievements.unlocked_at
    `,
    );

    for (const definition of definitions) {
      const metric = String(definition.metric) as AchievementMetric;
      const progressValue = metrics[metric] ?? 0;
      if (progressValue < Number(definition.threshold)) {
        continue;
      }
      insertAchievement.run(`user-achievement-${userId}-${definition.id}`, definition.id, userId, progressValue, now);
    }
  };

  const listWorks = (params: { query?: string; collection?: string; stage?: string; limit?: number }) => {
    const conditions = ["1 = 1"];
    const sqlParams: Record<string, unknown> = {
      limit: Math.min(Math.max(params.limit ?? 24, 1), 60),
    };

    if (params.collection && params.collection !== "全部") {
      conditions.push("w.collection = @collection");
      sqlParams.collection = params.collection;
    }
    if (params.stage && params.stage !== "全部") {
      conditions.push("w.textbook_stage = @stage");
      sqlParams.stage = params.stage;
    }
    if (params.query) {
      conditions.push(`(
        w.title LIKE @keyword OR
        a.name LIKE @keyword OR
        w.theme_label LIKE @keyword OR
        w.tags_json LIKE @keyword OR
        w.original_text LIKE @keyword
      )`);
      sqlParams.keyword = `%${params.query}%`;
    }

    const rows = db
      .prepare(
        `
        SELECT
          w.*,
          a.name AS author_name,
          COUNT(DISTINCT q.id) AS quiz_count,
          COUNT(DISTINCT r.id) AS relation_count
        FROM works w
        INNER JOIN authors a ON a.id = w.author_id
        LEFT JOIN quizzes q ON q.work_id = w.id
        LEFT JOIN relations r ON r.from_work_id = w.id
        WHERE ${conditions.join(" AND ")}
        GROUP BY w.id
        ORDER BY
          CASE w.collection
            WHEN '唐诗三百首' THEN 1
            WHEN '宋词三百首' THEN 2
            WHEN '古文精选' THEN 3
            ELSE 9
          END,
          w.difficulty_level ASC,
          w.title COLLATE NOCASE ASC
        LIMIT @limit
      `,
      )
      .all(sqlParams) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      ...mapWorkCard(row),
      excerpt: buildExcerpt(String(row.original_text)),
    }));
  };

  const getWorkBySlug = (slug: string) => {
    const row = db
      .prepare(
        `
        SELECT
          w.*,
          a.name AS author_name,
          a.bio AS author_bio,
          a.achievements AS author_achievements,
          COUNT(DISTINCT q.id) AS quiz_count,
          COUNT(DISTINCT r.id) AS relation_count
        FROM works w
        INNER JOIN authors a ON a.id = w.author_id
        LEFT JOIN quizzes q ON q.work_id = w.id
        LEFT JOIN relations r ON r.from_work_id = w.id
        WHERE w.slug = ?
        GROUP BY w.id
      `,
      )
      .get(slug) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    const work = mapWorkCard(row);
    return {
      ...work,
      author: {
        id: String(row.author_id),
        name: String(row.author_name),
        dynasty: String(row.dynasty),
        bio: String(row.author_bio ?? row.author_summary ?? ""),
        achievements: row.author_achievements ? String(row.author_achievements) : null,
      },
      translationText: row.translation_text ? String(row.translation_text) : null,
      appreciationText: row.appreciation_text ? String(row.appreciation_text) : null,
      sourceName: row.source_name ? String(row.source_name) : null,
      sourceCollection: row.source_collection ? String(row.source_collection) : null,
      sourceUrl: row.source_url ? String(row.source_url) : null,
      paragraphs: String(row.original_text)
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean),
    };
  };

  const getQuizzes = (workId: string) => {
    const rows = db
      .prepare("SELECT * FROM quizzes WHERE work_id = ? ORDER BY id ASC")
      .all(workId) as Array<Record<string, unknown>>;
    return rows.map(mapQuiz);
  };

  const getRecommendations = (workId: string, limit = 4) => {
    const rows = db
      .prepare(
        `
        SELECT
          r.id AS relation_id,
          r.relation_type,
          r.score,
          w.*,
          a.name AS author_name,
          COUNT(DISTINCT q.id) AS quiz_count,
          COUNT(DISTINCT rel.id) AS relation_count
        FROM relations r
        INNER JOIN works w ON w.id = r.to_work_id
        INNER JOIN authors a ON a.id = w.author_id
        LEFT JOIN quizzes q ON q.work_id = w.id
        LEFT JOIN relations rel ON rel.from_work_id = w.id
        WHERE r.from_work_id = ?
        GROUP BY r.id, w.id
        ORDER BY r.score DESC, w.difficulty_level ASC
        LIMIT ?
      `,
      )
      .all(workId, limit) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      relationId: String(row.relation_id),
      relationType: String(row.relation_type),
      score: Number(row.score),
      work: {
        ...mapWorkCard(row),
        excerpt: buildExcerpt(String(row.original_text)),
      },
    }));
  };

  const listCollections = () => {
    return db
      .prepare(
        `
        SELECT
          collection,
          COUNT(*) AS total,
          SUM(CASE WHEN textbook_stage = '小学' THEN 1 ELSE 0 END) AS primary_count,
          SUM(CASE WHEN textbook_stage = '初中' THEN 1 ELSE 0 END) AS middle_count,
          SUM(CASE WHEN textbook_stage = '高中' THEN 1 ELSE 0 END) AS high_count
        FROM works
        GROUP BY collection
        ORDER BY total DESC
      `,
      )
      .all();
  };

  const getProgressSummary = (userId: string): ProgressSummary => {
    const totals = db.prepare("SELECT COUNT(*) AS total_works FROM works").get() as { total_works: number };
    const summaryRow = db
      .prepare(
        `
        SELECT
          SUM(CASE WHEN viewed = 1 THEN 1 ELSE 0 END) AS viewed_count,
          SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END) AS mastered_count,
          COALESCE(SUM(quiz_score), 0) AS quiz_correct_count,
          COALESCE(MAX(streak), 0) AS best_streak
        FROM learning_progress
        WHERE user_local_id = ?
      `,
      )
      .get(userId) as Record<string, unknown> | undefined;

    const collectionBreakdown = db
      .prepare(
        `
        SELECT
          w.collection AS collection,
          COUNT(*) AS total,
          SUM(CASE WHEN lp.viewed = 1 THEN 1 ELSE 0 END) AS viewed,
          SUM(CASE WHEN lp.mastered = 1 THEN 1 ELSE 0 END) AS mastered
        FROM works w
        LEFT JOIN learning_progress lp
          ON lp.work_id = w.id
         AND lp.user_local_id = ?
        GROUP BY w.collection
        ORDER BY total DESC
      `,
      )
      .all(userId) as Array<Record<string, unknown>>;

    const masteredCount = toInteger(summaryRow?.mastered_count);
    return {
      userId,
      totalWorks: totals.total_works,
      viewedCount: toInteger(summaryRow?.viewed_count),
      masteredCount,
      quizCorrectCount: toInteger(summaryRow?.quiz_correct_count),
      bestStreak: toInteger(summaryRow?.best_streak),
      masteryRate: totals.total_works ? Number(((masteredCount / totals.total_works) * 100).toFixed(1)) : 0,
      collectionBreakdown: collectionBreakdown.map((row) => ({
        collection: String(row.collection),
        total: Number(row.total),
        viewed: Number(row.viewed ?? 0),
        mastered: Number(row.mastered ?? 0),
      })),
    };
  };

  const getWorkProgress = (userId: string, workId: string) => {
    const row = db
      .prepare(
        `
        SELECT id, viewed, mastered, streak, quiz_score, reward_status, updated_at
        FROM learning_progress
        WHERE user_local_id = ? AND work_id = ?
      `,
      )
      .get(userId, workId) as Record<string, unknown> | undefined;

    if (!row) {
      return {
        userId,
        workId,
        viewed: false,
        mastered: false,
        streak: 0,
        quizScore: 0,
        rewardStatus: "locked",
        updatedAt: null,
      };
    }

    return {
      id: String(row.id),
      userId,
      workId,
      viewed: Boolean(row.viewed),
      mastered: Boolean(row.mastered),
      streak: Number(row.streak),
      quizScore: Number(row.quiz_score),
      rewardStatus: String(row.reward_status),
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    };
  };

  const upsertProgress = (input: {
    userId: string;
    workId: string;
    viewed?: boolean;
    mastered?: boolean;
    streak?: number;
    quizScore?: number;
    rewardStatus?: string;
  }) => {
    const timestamp = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO learning_progress (
        id, user_local_id, work_id, viewed, mastered, streak, quiz_score, reward_status, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_local_id, work_id) DO UPDATE SET
        viewed = excluded.viewed,
        mastered = excluded.mastered,
        streak = excluded.streak,
        quiz_score = excluded.quiz_score,
        reward_status = excluded.reward_status,
        updated_at = excluded.updated_at
    `,
    ).run(
      `progress-${input.userId}-${input.workId}`,
      input.userId,
      input.workId,
      input.viewed ? 1 : 0,
      input.mastered ? 1 : 0,
      input.streak ?? 0,
      input.quizScore ?? 0,
      input.rewardStatus ?? "locked",
      timestamp,
    );

    syncAchievements(input.userId);
    return getWorkProgress(input.userId, input.workId);
  };

  const recordQuizSubmission = (input: {
    userId: string;
    workId: string;
    quizId: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }) => {
    const timestamp = new Date().toISOString();
    if (input.isCorrect) {
      db.prepare(
        `
        UPDATE mistake_notebook
        SET
          selected_answer = ?,
          correct_answer = ?,
          resolved = 1,
          attempts = attempts + 1,
          last_seen_at = ?
        WHERE user_local_id = ? AND quiz_id = ?
      `,
      ).run(input.selectedAnswer, input.correctAnswer, timestamp, input.userId, input.quizId);

      return {
        recorded: true,
        resolved: true,
      };
    }

    db.prepare(
      `
      INSERT INTO mistake_notebook (
        id, user_local_id, work_id, quiz_id, selected_answer, correct_answer, resolved, attempts, last_seen_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?)
      ON CONFLICT(user_local_id, quiz_id) DO UPDATE SET
        selected_answer = excluded.selected_answer,
        correct_answer = excluded.correct_answer,
        resolved = 0,
        attempts = mistake_notebook.attempts + 1,
        last_seen_at = excluded.last_seen_at
    `,
    ).run(
      `mistake-${input.userId}-${input.quizId}`,
      input.userId,
      input.workId,
      input.quizId,
      input.selectedAnswer,
      input.correctAnswer,
      timestamp,
    );

    return {
      recorded: true,
      resolved: false,
    };
  };

  const getMistakes = (userId: string) => {
    const rows = db
      .prepare(
        `
        SELECT
          m.id,
          m.quiz_id,
          m.work_id,
          m.selected_answer,
          m.correct_answer,
          m.resolved,
          m.attempts,
          m.last_seen_at,
          w.slug,
          w.title,
          a.name AS author_name,
          q.stem
        FROM mistake_notebook m
        INNER JOIN works w ON w.id = m.work_id
        INNER JOIN authors a ON a.id = w.author_id
        INNER JOIN quizzes q ON q.id = m.quiz_id
        WHERE m.user_local_id = ?
        ORDER BY m.resolved ASC, m.last_seen_at DESC
      `,
      )
      .all(userId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id),
      quizId: String(row.quiz_id),
      workId: String(row.work_id),
      slug: String(row.slug),
      title: String(row.title),
      authorName: String(row.author_name),
      stem: String(row.stem),
      selectedAnswer: String(row.selected_answer),
      correctAnswer: String(row.correct_answer),
      resolved: Boolean(row.resolved),
      attempts: Number(row.attempts),
      lastSeenAt: String(row.last_seen_at),
    }));
  };

  const getAchievements = (userId: string) => {
    syncAchievements(userId);
    const metrics = getMetricValues(userId);
    const rows = db
      .prepare(
        `
        SELECT
          ad.id,
          ad.title,
          ad.description,
          ad.icon,
          ad.metric,
          ad.threshold,
          ad.theme,
          ua.unlocked_at,
          ua.progress_value
        FROM achievement_definitions ad
        LEFT JOIN user_achievements ua
          ON ua.achievement_id = ad.id
         AND ua.user_local_id = ?
        ORDER BY ad.threshold ASC
      `,
      )
      .all(userId) as Array<Record<string, unknown>>;

    return rows.map((row) => {
      const metric = String(row.metric) as AchievementMetric;
      const progress = metrics[metric] ?? 0;
      const threshold = Number(row.threshold);
      return {
        id: String(row.id),
        title: String(row.title),
        description: String(row.description),
        icon: String(row.icon),
        metric,
        metricLabel: ACHIEVEMENT_METRIC_LABELS[metric],
        threshold,
        theme: String(row.theme),
        progress,
        unlocked: Boolean(row.unlocked_at),
        unlockedAt: row.unlocked_at ? String(row.unlocked_at) : null,
        remaining: Math.max(0, threshold - progress),
      };
    });
  };

  return {
    dbPath,
    listWorks,
    getWorkBySlug,
    getQuizzes,
    getRecommendations,
    listCollections,
    getProgressSummary,
    getWorkProgress,
    upsertProgress,
    recordQuizSubmission,
    getMistakes,
    getAchievements,
  };
};
