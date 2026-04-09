import type {
  Achievement,
  CollectionStat,
  MistakeItem,
  ProgressSummary,
  WorkCard,
  WorkDetailPayload,
  WorkProgress,
  QuizItem,
  WorkDetail,
} from "./types";

export const DEMO_USER_ID = "demo-user";

// ─── Supabase 配置 ─────────────────────────────────────
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://kldrdqxtwcufrjcgrrbj.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ─── 资源 URL 解析 ─────────────────────────────────────
// GitHub Pages 部署后，静态资源在 basePath 下
export function resolveAssetUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // 封面 SVG 在 public/images/generated/ 下，GitHub Pages 静态托管
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/ai-poetry-wbuddy";
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}

// ─── 通用请求 ─────────────────────────────────────────
function supabaseFetch<T>(
  table: string,
  options: {
    select?: string;
    filters?: string[];
    order?: string;
    limit?: number;
    offset?: number;
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const {
    select = "*",
    filters,
    order,
    limit,
    offset,
    method = "GET",
    body,
    headers: extraHeaders,
  } = options;

  const params = new URLSearchParams();
  params.set("select", select);
  // PostgREST: each filter is a separate query param, e.g. collection.eq.唐诗三百首
  if (filters) {
    for (const f of filters) {
      const eqIdx = f.indexOf(".");
      if (eqIdx > 0) {
        params.set(f.substring(0, eqIdx), f.substring(eqIdx + 1));
      } else {
        params.append(f, "");
      }
    }
  }
  if (order) params.set("order", order);
  if (limit) params.set("limit", String(limit));
  if (offset) params.set("offset", String(offset));

  const queryString = params.toString();
  const url = `${SUPABASE_URL}/rest/v1/${table}${queryString ? `?${queryString}` : ""}`;

  return fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "GET" ? "count=exact" : "return=representation",
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Supabase ${res.status}: ${text}`);
    }
    if (method === "POST" || method === "PATCH" || method === "PUT") {
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    }
    return res.json() as Promise<T>;
  });
}

// ─── 辅助：把 ISO date string 转换为前端期望的格式 ───
function normalizeBoolean(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (val === 1) return true;
  if (val === 0) return false;
  return false;
}

// ─── API 对象 ─────────────────────────────────────────
export const api = {
  listWorks: async (params: {
    query?: string;
    collection?: string;
    stage?: string;
  }): Promise<{ items: WorkCard[] }> => {
    let filterParts: string[] = [];
    if (params.collection && params.collection !== "全部") {
      filterParts.push(`collection.eq.${params.collection}`);
    }
    if (params.stage && params.stage !== "全部") {
      filterParts.push(`textbook_stage.eq.${params.stage}`);
    }
    if (params.query) {
      const q = params.query;
      filterParts.push(`or(title.ilike.%${q}%,theme_label.ilike.%${q}%,original_text.ilike.%${q}%)`);
    }

    const rows = await supabaseFetch<
      Array<{
        id: string;
        slug: string;
        title: string;
        dynasty: string;
        genre: string;
        collection: string;
        textbook_stage: string | null;
        difficulty_level: number;
        theme_label: string | null;
        tags_json: string[];
        original_text: string;
        background_text: string | null;
        author_summary: string | null;
        cover_asset_path: string | null;
        // joined from authors
        authors: Array<{ name: string }>;
      }>
    >("works", {
      select:
        "id,slug,title,dynasty,genre,collection,textbook_stage,difficulty_level,theme_label,tags_json,original_text,background_text,author_summary,cover_asset_path,authors(name)",
      filters: filterParts.length > 0 ? filterParts : undefined,
      order: "collection,difficulty_level",
      limit: 36,
    });

    const items: WorkCard[] = rows.map((r) => {
      const excerpt = r.original_text.replace(/\n/g, " ").slice(0, 60) + "…";
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        authorName: r.authors?.[0]?.name ?? "佚名",
        dynasty: r.dynasty,
        genre: r.genre,
        collection: r.collection,
        textbookStage: r.textbook_stage,
        difficultyLevel: r.difficulty_level,
        themeLabel: r.theme_label,
        tags: Array.isArray(r.tags_json) ? r.tags_json : [],
        coverAssetPath: r.cover_asset_path,
        originalText: r.original_text,
        backgroundText: r.background_text,
        authorSummary: r.author_summary,
        quizCount: 0,
        relationCount: 0,
        excerpt,
      };
    });

    return { items };
  },

  collections: async (): Promise<{ items: CollectionStat[] }> => {
    const rows = await supabaseFetch<
      Array<{ collection: string; count: number }>
    >("works", {
      select: "collection",
    });

    // Group and count
    const map = new Map<string, { primary_count: number; middle_count: number; high_count: number }>();
    // Simple count from the flat list
    for (const r of rows) {
      if (!map.has(r.collection)) {
        map.set(r.collection, { primary_count: 0, middle_count: 0, high_count: 0 });
      }
      // We can't get stage breakdown without joining — use simplified stats
    }

    const items: CollectionStat[] = Array.from(map.entries()).map(([collection, stats]) => ({
      collection,
      total: rows.filter((r) => r.collection === collection).length,
      ...stats,
    }));

    return { items };
  },

  progressSummary: async (userId = DEMO_USER_ID): Promise<ProgressSummary> => {
    const totalWorks = await supabaseFetch<Array<{ count: number }>>("works", {
      select: "id",
      headers: { Range: "0-0" },
      // We can't get count easily, so fetch all IDs
    });

    const progress = await supabaseFetch<
      Array<{
        work_id: string;
        viewed: boolean;
        mastered: boolean;
        streak: number;
        quiz_score: number;
        reward_status: string;
      }>
    >("learning_progress", {
      select: "work_id,viewed,mastered,streak,quiz_score,reward_status",
      filters: [`user_local_id.eq.${userId}`],
    });

    const viewedCount = progress.filter((p) => p.viewed).length;
    const masteredCount = progress.filter((p) => p.mastered).length;
    const quizCorrectCount = progress.reduce((sum, p) => sum + p.quiz_score, 0);
    const bestStreak = progress.reduce((max, p) => Math.max(max, p.streak), 0);

    // Get all works for collection breakdown
    const allWorks = await supabaseFetch<
      Array<{ id: string; collection: string }>
    >("works", {
      select: "id,collection",
    });

    // Build set of viewed/mastered work IDs
    const viewedSet = new Set(progress.filter((p) => p.viewed).map((p) => p.work_id));
    const masteredSet = new Set(progress.filter((p) => p.mastered).map((p) => p.work_id));

    // Collection breakdown
    const collectionMap = new Map<string, { total: number; viewed: number; mastered: number }>();
    for (const w of allWorks) {
      if (!collectionMap.has(w.collection)) {
        collectionMap.set(w.collection, { total: 0, viewed: 0, mastered: 0 });
      }
      const entry = collectionMap.get(w.collection)!;
      entry.total += 1;
      if (viewedSet.has(w.id)) entry.viewed += 1;
      if (masteredSet.has(w.id)) entry.mastered += 1;
    }

    return {
      userId,
      totalWorks: allWorks.length,
      viewedCount,
      masteredCount,
      quizCorrectCount,
      bestStreak,
      masteryRate: allWorks.length > 0 ? Math.round((masteredCount / allWorks.length) * 100) : 0,
      collectionBreakdown: Array.from(collectionMap.entries()).map(([collection, stats]) => ({
        collection,
        ...stats,
      })),
    };
  },

  mistakes: async (userId = DEMO_USER_ID): Promise<{ items: MistakeItem[] }> => {
    const rows = await supabaseFetch<
      Array<{
        id: string;
        quiz_id: string;
        work_id: string;
        selected_answer: string;
        correct_answer: string;
        resolved: boolean;
        attempts: number;
        last_seen_at: string;
        quizzes: Array<{ stem: string }>;
        works: Array<{ slug: string; title: string; authors: Array<{ name: string }> }>;
      }>
    >("mistake_notebook", {
      select:
        "id,quiz_id,work_id,selected_answer,correct_answer,resolved,attempts,last_seen_at,quizzes(stem),works(slug,title,authors(name))",
      filters: [`user_local_id.eq.${userId}`],
      order: "last_seen_at.desc",
      limit: 20,
    });

    const items: MistakeItem[] = rows.map((r) => ({
      id: r.id,
      quizId: r.quiz_id,
      workId: r.work_id,
      slug: r.works?.[0]?.slug ?? "",
      title: r.works?.[0]?.title ?? "未知作品",
      authorName: r.works?.[0]?.authors?.[0]?.name ?? "佚名",
      stem: r.quizzes?.[0]?.stem ?? "",
      selectedAnswer: r.selected_answer,
      correctAnswer: r.correct_answer,
      resolved: r.resolved,
      attempts: r.attempts,
      lastSeenAt: r.last_seen_at,
    }));

    return { items };
  },

  achievements: async (userId = DEMO_USER_ID): Promise<{ items: Achievement[] }> => {
    const definitions = await supabaseFetch<
      Array<{
        id: string;
        title: string;
        description: string;
        icon: string;
        metric: string;
        threshold: number;
        theme: string;
      }>
    >("achievement_definitions", {
      select: "id,title,description,icon,metric,threshold,theme",
    });

    const userAchievements = await supabaseFetch<
      Array<{
        achievement_id: string;
        progress_value: number;
        unlocked_at: string;
      }>
    >("user_achievements", {
      select: "achievement_id,progress_value,unlocked_at",
      filters: [`user_local_id.eq.${userId}`],
    });

    // Get progress metrics
    const progress = await supabaseFetch<
      Array<{ viewed: boolean; mastered: boolean; streak: number; quiz_score: number }>
    >("learning_progress", {
      select: "viewed,mastered,streak,quiz_score",
      filters: [`user_local_id.eq.${userId}`],
    });

    const metrics: Record<string, number> = {
      viewed_count: progress.filter((p) => p.viewed).length,
      mastered_count: progress.filter((p) => p.mastered).length,
      quiz_correct_count: progress.reduce((s, p) => s + p.quiz_score, 0),
      streak_days: progress.reduce((m, p) => Math.max(m, p.streak), 0),
    };

    const metricLabels: Record<string, string> = {
      viewed_count: "浏览作品",
      mastered_count: "掌握作品",
      quiz_correct_count: "答对题目",
      streak_days: "连续天数",
    };

    const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievement_id, ua]));

    const items: Achievement[] = definitions.map((def) => {
      const ua = unlockedMap.get(def.id);
      const currentValue = ua?.progress_value ?? metrics[def.metric] ?? 0;
      const isUnlocked = currentValue >= def.threshold;
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        metric: def.metric,
        metricLabel: metricLabels[def.metric] ?? def.metric,
        threshold: def.threshold,
        theme: def.theme,
        progress: currentValue,
        unlocked: isUnlocked,
        unlockedAt: ua?.unlocked_at ?? null,
        remaining: Math.max(0, def.threshold - currentValue),
      };
    });

    return { items };
  },

  workDetail: async (slug: string): Promise<WorkDetailPayload> => {
    const workRows = await supabaseFetch<
      Array<{
        id: string;
        slug: string;
        title: string;
        author_id: string;
        dynasty: string;
        genre: string;
        collection: string;
        textbook_stage: string | null;
        difficulty_level: number;
        theme_label: string | null;
        tags_json: string[];
        original_text: string;
        translation_text: string | null;
        background_text: string | null;
        appreciation_text: string | null;
        author_summary: string | null;
        source_name: string | null;
        source_collection: string | null;
        source_url: string | null;
        cover_asset_path: string | null;
        authors: {
          id: string;
          name: string;
          dynasty: string;
          bio: string;
          achievements: string | null;
        };
      }>
    >("works", {
      select: `id,slug,title,author_id,dynasty,genre,collection,textbook_stage,difficulty_level,theme_label,tags_json,original_text,translation_text,background_text,appreciation_text,author_summary,source_name,source_collection,source_url,cover_asset_path,authors(id,name,dynasty,bio,achievements)`,
      filters: [`slug.eq.${slug}`],
      limit: 1,
    });

    const row = workRows[0];
    if (!row) throw new Error("Work not found");

    const work: WorkDetail = {
      id: row.id,
      slug: row.slug,
      title: row.title,
      authorName: row.authors.name,
      dynasty: row.dynasty,
      genre: row.genre,
      collection: row.collection,
      textbookStage: row.textbook_stage,
      difficultyLevel: row.difficulty_level,
      themeLabel: row.theme_label,
      tags: Array.isArray(row.tags_json) ? row.tags_json : [],
      coverAssetPath: row.cover_asset_path,
      originalText: row.original_text,
      backgroundText: row.background_text,
      authorSummary: row.author_summary,
      quizCount: 0,
      relationCount: 0,
      translationText: row.translation_text,
      appreciationText: row.appreciation_text,
      sourceName: row.source_name,
      sourceCollection: row.source_collection,
      sourceUrl: row.source_url,
      paragraphs: row.original_text.split("\n").filter(Boolean),
      author: row.authors,
    };

    // Fetch quizzes
    const quizRows = await supabaseFetch<
      Array<{
        id: string;
        work_id: string;
        question_type: string;
        stem: string;
        options_json: string[];
        answer: string;
        explanation: string | null;
        difficulty: number;
      }>
    >("quizzes", {
      select: "id,work_id,question_type,stem,options_json,answer,explanation,difficulty",
      filters: [`work_id.eq.${row.id}`],
      order: "id",
    });

    const quizzes: QuizItem[] = quizRows.map((q) => ({
      id: q.id,
      workId: q.work_id,
      questionType: q.question_type,
      stem: q.stem,
      options: Array.isArray(q.options_json) ? q.options_json : [],
      answer: q.answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
    }));

    work.quizCount = quizzes.length;

    // Fetch relations
    const relRows = await supabaseFetch<
      Array<{
        id: string;
        relation_type: string;
        score: number;
        to_works: Array<{
          id: string;
          slug: string;
          title: string;
          dynasty: string;
          genre: string;
          collection: string;
          textbook_stage: string | null;
          difficulty_level: number;
          theme_label: string | null;
          tags_json: string[];
          original_text: string;
          background_text: string | null;
          author_summary: string | null;
          cover_asset_path: string | null;
          authors: Array<{ name: string }>;
        }>;
      }>
    >("relations", {
      select:
        "id,relation_type,score,to_works(id,slug,title,dynasty,genre,collection,textbook_stage,difficulty_level,theme_label,tags_json,original_text,background_text,author_summary,cover_asset_path,authors(name))",
      filters: [`from_work_id.eq.${row.id}`],
      order: "score.desc",
      limit: 6,
    });

    const recommendations = relRows.map((r) => {
      const tw = r.to_works?.[0];
      if (!tw) return null;
      const excerpt = (tw.original_text || "").replace(/\n/g, " ").slice(0, 60) + "…";
      return {
        relationId: r.id,
        relationType: r.relation_type,
        score: r.score,
        work: {
          id: tw.id,
          slug: tw.slug,
          title: tw.title,
          authorName: tw.authors?.[0]?.name ?? "佚名",
          dynasty: tw.dynasty,
          genre: tw.genre,
          collection: tw.collection,
          textbookStage: tw.textbook_stage,
          difficultyLevel: tw.difficulty_level,
          themeLabel: tw.theme_label,
          tags: Array.isArray(tw.tags_json) ? tw.tags_json : [],
          coverAssetPath: tw.cover_asset_path,
          originalText: tw.original_text,
          backgroundText: tw.background_text,
          authorSummary: tw.author_summary,
          quizCount: 0,
          relationCount: 0,
          excerpt,
        },
      };
    }).filter(Boolean);

    work.relationCount = relRows.length;

    return { work, quizzes, recommendations: recommendations as WorkDetailPayload["recommendations"] };
  },

  workProgress: async (workId: string, userId = DEMO_USER_ID): Promise<WorkProgress> => {
    const rows = await supabaseFetch<
      Array<{
        id: string;
        user_local_id: string;
        work_id: string;
        viewed: boolean;
        mastered: boolean;
        streak: number;
        quiz_score: number;
        reward_status: string;
        updated_at: string | null;
      }>
    >("learning_progress", {
      select: "id,user_local_id,work_id,viewed,mastered,streak,quiz_score,reward_status,updated_at",
      filters: [`user_local_id.eq.${userId}`, `work_id.eq.${workId}`],
      limit: 1,
    });

    if (rows.length === 0) {
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

    const r = rows[0];
    return {
      id: r.id,
      userId: r.user_local_id,
      workId: r.work_id,
      viewed: r.viewed,
      mastered: r.mastered,
      streak: r.streak,
      quizScore: r.quiz_score,
      rewardStatus: r.reward_status,
      updatedAt: r.updated_at,
    };
  },

  saveProgress: async (payload: {
    userId?: string;
    workId: string;
    viewed?: boolean;
    mastered?: boolean;
    streak?: number;
    quizScore?: number;
    rewardStatus?: string;
  }): Promise<WorkProgress> => {
    const userId = payload.userId ?? DEMO_USER_ID;

    // Try PATCH (update) first, fallback to POST (insert)
    try {
      const result = await supabaseFetch<{
        id: string;
        user_local_id: string;
        work_id: string;
        viewed: boolean;
        mastered: boolean;
        streak: number;
        quiz_score: number;
        reward_status: string;
        updated_at: string;
      }>("learning_progress", {
        select: "id,user_local_id,work_id,viewed,mastered,streak,quiz_score,reward_status,updated_at",
        filters: [`user_local_id.eq.${userId}`, `work_id.eq.${payload.workId}`],
        method: "PATCH",
        body: {
          viewed: payload.viewed,
          mastered: payload.mastered,
          streak: payload.streak,
          quiz_score: payload.quizScore,
          reward_status: payload.rewardStatus,
        },
        headers: { Prefer: "return=representation" },
      });

      if (result) {
        return {
          id: result.id,
          userId: result.user_local_id,
          workId: result.work_id,
          viewed: result.viewed,
          mastered: result.mastered,
          streak: result.streak,
          quizScore: result.quiz_score,
          rewardStatus: result.reward_status,
          updatedAt: result.updated_at,
        };
      }
    } catch {
      // Not found — insert
    }

    const result = await supabaseFetch<{
      id: string;
      user_local_id: string;
      work_id: string;
      viewed: boolean;
      mastered: boolean;
      streak: number;
      quiz_score: number;
      reward_status: string;
      updated_at: string;
    }>("learning_progress", {
      select: "id,user_local_id,work_id,viewed,mastered,streak,quiz_score,reward_status,updated_at",
      method: "POST",
      body: {
        id: `progress-${userId}-${payload.workId}`,
        user_local_id: userId,
        work_id: payload.workId,
        viewed: payload.viewed ?? false,
        mastered: payload.mastered ?? false,
        streak: payload.streak ?? 0,
        quiz_score: payload.quizScore ?? 0,
        reward_status: payload.rewardStatus ?? "locked",
      },
    });

    return {
      id: result.id,
      userId: result.user_local_id,
      workId: result.work_id,
      viewed: result.viewed,
      mastered: result.mastered,
      streak: result.streak,
      quizScore: result.quiz_score,
      rewardStatus: result.reward_status,
      updatedAt: result.updated_at,
    };
  },

  submitQuiz: async (payload: {
    userId?: string;
    workId: string;
    quizId: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }): Promise<{ recorded: boolean; resolved: boolean }> => {
    const userId = payload.userId ?? DEMO_USER_ID;

    if (!payload.isCorrect) {
      // Insert or update mistake
      try {
        await supabaseFetch("mistake_notebook", {
          method: "PATCH",
          filters: [`user_local_id.eq.${userId}`, `quiz_id.eq.${payload.quizId}`],
          body: {
            attempts: 1, // Will be incremented via RPC or handled in frontend
            last_seen_at: new Date().toISOString(),
          },
        });
      } catch {
        // Insert new mistake
        await supabaseFetch("mistake_notebook", {
          method: "POST",
          body: {
            id: `mistake-${userId}-${payload.quizId}`,
            user_local_id: userId,
            work_id: payload.workId,
            quiz_id: payload.quizId,
            selected_answer: payload.selectedAnswer,
            correct_answer: payload.correctAnswer,
            resolved: false,
            attempts: 1,
            last_seen_at: new Date().toISOString(),
          },
        });
      }
    }

    return { recorded: true, resolved: payload.isCorrect };
  },
};
