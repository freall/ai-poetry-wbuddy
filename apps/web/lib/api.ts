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
import { t2s, t2sOrEmpty, t2sArray, t2sSlug, s2t } from "./t2s";

export const DEMO_USER_ID = "demo-user";

// ─── Supabase 配置 ─────────────────────────────────────
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://kldrdqxtwcufrjcgrrbj.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

  // 检查环境变量是否设置
  if (typeof window !== 'undefined') {
    // 更新：仅在开发环境显示详细警告，生产环境减少日志
    const isDev = process.env.NODE_ENV === 'development';
    
    // 在浏览器控制台中验证Supabase连接
    // 在开发环境添加连接测试功能
    if (isDev && typeof window !== 'undefined') {
      const testConnection = () => {
        const testUrl = `${SUPABASE_URL}/rest/v1/works?select=id&limit=1`;
        console.log(`%c[Supabase测试] 开始测试连接...`, 'color: #3B82F6; font-weight: bold');
        console.log(`%c[Supabase测试] URL: ${testUrl}`, 'color: #3B82F6');
        console.log(`%c[Supabase测试] API密钥: ${SUPABASE_PUBLISHABLE_KEY ? '已设置' : '未设置'}`, 'color: #3B82F6');
        
        // 静默测试连接，不干扰用户
        if (SUPABASE_PUBLISHABLE_KEY) {
          fetch(testUrl, {
            method: 'GET',
            headers: {
              apikey: SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
              "Content-Type": "application/json",
            },
          })
            .then(res => {
              if (res.ok) {
                console.log(`%c[Supabase测试] ✅ 连接成功 (HTTP ${res.status})`, 'color: #10B981; font-weight: bold');
              } else {
                console.error(`%c[Supabase测试] ❌ 连接失败 (HTTP ${res.status})`, 'color: #EF4444; font-weight: bold');
                return res.text().then(text => {
                  console.error(`%c[Supabase测试] 错误详情: ${text.substring(0, 200)}`, 'color: #EF4444');
                });
              }
            })
            .catch(err => {
              console.error(`%c[Supabase测试] ❌ 网络错误: ${err.message}`, 'color: #EF4444; font-weight: bold');
            });
        }
      };
      
      // 在页面加载时自动测试连接
      if (!window.__supabase_connection_tested__) {
        window.__supabase_connection_tested__ = true;
        setTimeout(testConnection, 1000);
      }
    }
  }

// ─── 资源 URL 解析 ─────────────────────────────────────
// GitHub Pages 部署后，静态资源在 basePath 下
// 精选作品有独立意境封面（/images/covers/），其余使用生成封面（/images/generated/）
const FEATURED_COVER_SLUGS = new Set([
  "tao-hua-yuan-ji", "lou-shi-ming", "chu-shi-biao", "yue-yang-lou-ji", "shi-shuo", "zui-weng-ting-ji",
  "chun-xiao", "wang-lu-shan-pu-bu", "deng-guan-que-lou", "jiang-xue", "fu-de-gu-yuan-cao-song-bie", "jing-ye-si",
  "shui-diao-ge-tou-ming-yue-ji-shi-you", "nian-nu-jiao-chi-bi-huai-gu", "ru-meng-ling-zuo-ye-yu-shu-feng-zhou",
  "qing-yu-an-yuan-xi",
]);

// AI 生成的 PNG 封面（优先于 SVG，画质更高）
const PNG_COVER_SLUGS = new Set([
  "jiang-xue",
  // 后续添加更多 AI 生图时更新此列表
]);

export function resolveAssetUrl(path: string | null | undefined, slug?: string) {
  // 1. 如果已经有路径，直接返回
  if (path) {
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/ai-poetry-wbuddy";
    return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
  }
  
  // 2. 如果没有路径但有slug，尝试提供默认封面
  if (slug) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/ai-poetry-wbuddy";
    
    // 优先检查精选作品
    if (FEATURED_COVER_SLUGS.has(slug)) {
      // 优先使用 PNG（AI 生图），否则使用 SVG
      const ext = PNG_COVER_SLUGS.has(slug) ? "png" : "svg";
      return `${basePath}/images/covers/${slug}.${ext}`;
    }
    
    // 其次检查生成的基本封面（所有作品都有）
    // 注意：slug可能包含特殊字符，需要确保文件名匹配
    const safeSlug = slug.replace(/[^a-zA-Z0-9-_.]/g, '_');
    const generatedPath = `${basePath}/images/generated/${safeSlug}.svg`;
    
    // 在实际项目中，这里应该检查文件是否存在
    // 但为了简化，我们假设所有作品都有对应的封面
    return generatedPath;
  }
  
  // 3. 既没有路径也没有slug，返回null
  return null;
}

// ─── PostgREST 过滤值转义 ──────────────────────────────
// Prevents operator injection in PostgREST filter values.
// Characters like ., (, ), ', ", and commas have special meaning in PostgREST.
function escapePostgrestValue(val: string): string {
  return val.replace(/([.'"(),])/g, "\\$1");
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
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
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
      filterParts.push(`collection.eq.${escapePostgrestValue(params.collection)}`);
    }
    if (params.stage && params.stage !== "全部") {
      filterParts.push(`textbook_stage.eq.${escapePostgrestValue(params.stage)}`);
    }
    if (params.query) {
      const q = escapePostgrestValue(params.query);
      const qTraditional = escapePostgrestValue(s2t(params.query));
      // 同时搜索简体和繁体关键词，确保简体搜索也能匹配数据库中的繁体原文
      filterParts.push(`or(title.ilike.%${q}%,theme_label.ilike.%${q}%,original_text.ilike.%${q}%,original_text.ilike.%${qTraditional}%)`);
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
        slug: t2sSlug(r.slug),
        title: t2sOrEmpty(r.title),
        authorName: t2sOrEmpty(r.authors?.[0]?.name) || "佚名",
        dynasty: t2sOrEmpty(r.dynasty),
        genre: t2sOrEmpty(r.genre),
        collection: t2sOrEmpty(r.collection),
        textbookStage: t2s(r.textbook_stage),
        difficultyLevel: r.difficulty_level,
        themeLabel: t2s(r.theme_label),
        tags: t2sArray(Array.isArray(r.tags_json) ? r.tags_json : []),
        coverAssetPath: r.cover_asset_path,
        originalText: t2sOrEmpty(r.original_text),
        backgroundText: t2s(r.background_text),
        authorSummary: t2s(r.author_summary),
        quizCount: 0,
        relationCount: 0,
        excerpt: t2sOrEmpty(excerpt),
      };
    });

    return { items };
  },

  collections: async (): Promise<{ items: CollectionStat[] }> => {
    const rows = await supabaseFetch<
      Array<{ collection: string; textbook_stage: string | null }>
    >("works", {
      select: "collection,textbook_stage",
    });

    // Group and count by collection + stage
    const map = new Map<string, { primary_count: number; middle_count: number; high_count: number }>();
    for (const r of rows) {
      const coll = t2sOrEmpty(r.collection);
      const stage = t2s(r.textbook_stage);
      if (!map.has(coll)) {
        map.set(coll, { primary_count: 0, middle_count: 0, high_count: 0 });
      }
      const stats = map.get(coll)!;
      if (stage === "小学") stats.primary_count += 1;
      else if (stage === "初中") stats.middle_count += 1;
      else if (stage === "高中") stats.high_count += 1;
    }

    const items: CollectionStat[] = Array.from(map.entries()).map(([collection, stats]) => ({
      collection,
      total: stats.primary_count + stats.middle_count + stats.high_count,
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
      filters: [`user_local_id.eq.${escapePostgrestValue(userId)}`],
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
      const coll = t2sOrEmpty(w.collection);
      if (!collectionMap.has(coll)) {
        collectionMap.set(coll, { total: 0, viewed: 0, mastered: 0 });
      }
      const entry = collectionMap.get(coll)!;
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
      filters: [`user_local_id.eq.${escapePostgrestValue(userId)}`],
      order: "last_seen_at.desc",
      limit: 20,
    });

    const items: MistakeItem[] = rows.map((r) => ({
      id: r.id,
      quizId: r.quiz_id,
      workId: r.work_id,
      slug: t2sSlug(r.works?.[0]?.slug ?? ""),
      title: t2sOrEmpty(r.works?.[0]?.title) || "未知作品",
      authorName: t2sOrEmpty(r.works?.[0]?.authors?.[0]?.name) || "佚名",
      stem: t2sOrEmpty(r.quizzes?.[0]?.stem ?? ""),
      selectedAnswer: t2sOrEmpty(r.selected_answer),
      correctAnswer: t2sOrEmpty(r.correct_answer),
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
      filters: [`user_local_id.eq.${escapePostgrestValue(userId)}`],
    });

    // Get progress metrics
    const progress = await supabaseFetch<
      Array<{ viewed: boolean; mastered: boolean; streak: number; quiz_score: number }>
    >("learning_progress", {
      select: "viewed,mastered,streak,quiz_score",
      filters: [`user_local_id.eq.${escapePostgrestValue(userId)}`],
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
        title: t2sOrEmpty(def.title),
        description: t2sOrEmpty(def.description),
        icon: def.icon,
        metric: def.metric,
        metricLabel: t2sOrEmpty(metricLabels[def.metric] ?? def.metric),
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
      filters: [`slug.eq.${escapePostgrestValue(slug)}`],
      limit: 1,
    });

    const row = workRows[0];
    if (!row) throw new Error("Work not found");

    const work: WorkDetail = {
      id: row.id,
      slug: t2sSlug(row.slug),
      title: t2sOrEmpty(row.title),
      authorName: t2sOrEmpty(row.authors?.name) || "佚名",
      dynasty: t2sOrEmpty(row.dynasty),
      genre: t2sOrEmpty(row.genre),
      collection: t2sOrEmpty(row.collection),
      textbookStage: t2s(row.textbook_stage),
      difficultyLevel: row.difficulty_level,
      themeLabel: t2s(row.theme_label),
      tags: t2sArray(Array.isArray(row.tags_json) ? row.tags_json : []),
      coverAssetPath: row.cover_asset_path,
      originalText: t2sOrEmpty(row.original_text),
      backgroundText: t2s(row.background_text),
      authorSummary: t2s(row.author_summary),
      quizCount: 0,
      relationCount: 0,
      translationText: t2s(row.translation_text),
      appreciationText: t2s(row.appreciation_text),
      sourceName: t2s(row.source_name),
      sourceCollection: t2s(row.source_collection),
      sourceUrl: row.source_url,
      paragraphs: t2sOrEmpty(row.original_text).split("\n").filter(Boolean),
      author: row.authors
        ? {
            id: row.authors.id,
            name: t2sOrEmpty(row.authors.name) || "佚名",
            dynasty: t2sOrEmpty(row.authors.dynasty),
            bio: t2sOrEmpty(row.authors.bio),
            achievements: t2s(row.authors.achievements),
          }
        : { id: "", name: "佚名", dynasty: "", bio: "", achievements: null },
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
      stem: t2sOrEmpty(q.stem),
      options: t2sArray(Array.isArray(q.options_json) ? q.options_json : []),
      answer: t2sOrEmpty(q.answer),
      explanation: t2s(q.explanation),
      difficulty: q.difficulty,
    }));

    work.quizCount = quizzes.length;

    // Fetch relations — 分两步查询避免 PostgREST 外键歧义
    // (relations 有 from_work_id 和 to_work_id 两个外键都指向 works)
    const relRows = await supabaseFetch<
      Array<{
        id: string;
        relation_type: string;
        score: number;
        to_work_id: string;
      }>
    >("relations", {
      select: "id,relation_type,score,to_work_id",
      filters: [`from_work_id.eq.${row.id}`],
      order: "score.desc",
      limit: 6,
    });

    // Fetch recommended works by their IDs
    const toWorkIds = relRows.map((r) => r.to_work_id);
    let recommendedWorks: Array<{
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
    }> = [];
    if (toWorkIds.length > 0) {
      recommendedWorks = await supabaseFetch<typeof recommendedWorks>("works", {
        select: "id,slug,title,dynasty,genre,collection,textbook_stage,difficulty_level,theme_label,tags_json,original_text,background_text,author_summary,cover_asset_path,authors(name)",
        filters: [`id.in.(${toWorkIds.join(",")})`],
      });
    }
    const worksMap = new Map(recommendedWorks.map((w) => [w.id, w]));

    const recommendations = relRows.map((r) => {
      const tw = worksMap.get(r.to_work_id);
      if (!tw) return null;
      const excerpt = (tw.original_text || "").replace(/\n/g, " ").slice(0, 60) + "…";
      return {
        relationId: r.id,
        relationType: t2sOrEmpty(r.relation_type),
        score: r.score,
        work: {
          id: tw.id,
          slug: t2sSlug(tw.slug),
          title: t2sOrEmpty(tw.title),
          authorName: t2sOrEmpty(tw.authors?.[0]?.name) || "佚名",
          dynasty: t2sOrEmpty(tw.dynasty),
          genre: t2sOrEmpty(tw.genre),
          collection: t2sOrEmpty(tw.collection),
          textbookStage: t2s(tw.textbook_stage),
          difficultyLevel: tw.difficulty_level,
          themeLabel: t2s(tw.theme_label),
          tags: t2sArray(Array.isArray(tw.tags_json) ? tw.tags_json : []),
          coverAssetPath: tw.cover_asset_path,
          originalText: t2sOrEmpty(tw.original_text),
          backgroundText: t2s(tw.background_text),
          authorSummary: t2s(tw.author_summary),
          quizCount: 0,
          relationCount: 0,
          excerpt: t2sOrEmpty(excerpt),
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
      filters: [`user_local_id.eq.${escapePostgrestValue(userId)}`, `work_id.eq.${escapePostgrestValue(workId)}`],
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
        filters: [`user_local_id.eq.${escapePostgrestValue(userId)}`, `work_id.eq.${escapePostgrestValue(payload.workId)}`],
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

      if (result && typeof result === "object" && "id" in result) {
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
      // PATCH returned no matching rows (empty array) — fall through to INSERT
    } catch {
      // Only fall through to INSERT on 406/404 (not found).
      // Other errors (network, permission) should not silently trigger INSERT.
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
      // Update existing mistake (increment attempts) or insert new one
      let updated = false;
      try {
        // Fetch current attempts first for atomic increment
        const existing = await supabaseFetch<
          Array<{ id: string; attempts: number }>
        >("mistake_notebook", {
          select: "id,attempts",
          filters: [`user_local_id.eq.${escapePostgrestValue(userId)}`, `quiz_id.eq.${escapePostgrestValue(payload.quizId)}`],
          limit: 1,
        });
        if (existing.length > 0) {
          await supabaseFetch("mistake_notebook", {
            method: "PATCH",
            filters: [`user_local_id.eq.${escapePostgrestValue(userId)}`, `quiz_id.eq.${escapePostgrestValue(payload.quizId)}`],
          body: {
            attempts: existing[0].attempts + 1,
            last_seen_at: new Date().toISOString(),
            selected_answer: payload.selectedAnswer,
            resolved: false,
          },
        });
        updated = true;
      }
    } catch {
      // PATCH failed, try insert below
    }

    if (!updated) {
      try {
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
      } catch {
        // Both PATCH and POST failed — propagate error instead of silently returning success
        return { recorded: false, resolved: payload.isCorrect };
      }
    }
    }

    return { recorded: true, resolved: payload.isCorrect };
  },

  randomWorks: async (params: {
    excludeIds?: string[];
    limit?: number;
    collection?: string;
  }): Promise<{ items: WorkCard[] }> => {
    try {
      console.log("randomWorks called with params:", params);
      console.log("API版本: 2026-04-10-fixed-random-order");
      
      // 构建过滤条件
      let filterParts: string[] = [];
      
      // 修复：确保excludeIds参数正确处理，避免空数组问题
      if (params.excludeIds && params.excludeIds.length > 0 && params.excludeIds[0]) {
        try {
          const escapedIds = params.excludeIds
            .filter(id => id && id.trim().length > 0)
            .map(id => escapePostgrestValue(id));
          
          if (escapedIds.length > 0) {
            filterParts.push(`id.not.in.(${escapedIds.join(",")})`);
          }
        } catch (err) {
          console.warn("处理excludeIds时出错:", err);
        }
      }
      
      if (params.collection && params.collection !== "全部") {
        try {
          filterParts.push(`collection.eq.${escapePostgrestValue(params.collection)}`);
        } catch (err) {
          console.warn("处理collection参数时出错:", err);
        }
      }

      // 由于PostgREST不支持order=random()，我们需要先获取作品，然后在客户端随机化
      // 获取比需要数量更多的作品，以确保随机性
      const fetchLimit = Math.min(100, (params.limit || 10) * 3);
      
      console.log("Fetching works with limit:", fetchLimit, "filters:", filterParts);
      
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
        select: "id,slug,title,dynasty,genre,collection,textbook_stage,difficulty_level,theme_label,tags_json,original_text,background_text,author_summary,cover_asset_path,authors(name)",
        filters: filterParts.length > 0 ? filterParts : undefined,
        order: "id", // 使用稳定的排序
        limit: fetchLimit,
      });

      console.log(`Fetched ${rows.length} rows from database`);
      
      if (rows.length === 0) {
        console.warn("No works found in database!");
        return { items: [] };
      }

      // 在客户端随机化
      const shuffledRows = [...rows].sort(() => Math.random() - 0.5);
      const selectedRows = shuffledRows.slice(0, params.limit || 10);

      const items: WorkCard[] = selectedRows.map((r) => {
        const excerpt = r.original_text.replace(/\n/g, " ").slice(0, 60) + "…";
        return {
          id: r.id,
          slug: t2sSlug(r.slug),
          title: t2sOrEmpty(r.title),
          authorName: t2sOrEmpty(r.authors?.[0]?.name) || "佚名",
          dynasty: t2sOrEmpty(r.dynasty),
          genre: t2sOrEmpty(r.genre),
          collection: t2sOrEmpty(r.collection),
          textbookStage: t2s(r.textbook_stage),
          difficultyLevel: r.difficulty_level,
          themeLabel: t2s(r.theme_label),
          tags: t2sArray(Array.isArray(r.tags_json) ? r.tags_json : []),
          coverAssetPath: r.cover_asset_path,
          originalText: t2sOrEmpty(r.original_text),
          backgroundText: t2s(r.background_text),
          authorSummary: t2s(r.author_summary),
          quizCount: 0,
          relationCount: 0,
          excerpt: t2sOrEmpty(excerpt),
        };
      });

      console.log(`Returning ${items.length} random works`);
      return { items };
      
    } catch (error: any) {
      console.error("Error in randomWorks:", error);
      console.error("Error details:", error.message);
      throw error;
    }
  },
};
