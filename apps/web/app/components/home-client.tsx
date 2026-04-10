"use client";

import Link from "next/link";
import { Award, BookOpen, Flame, Search, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api, resolveAssetUrl } from "../../lib/api";
import type { Achievement, CollectionStat, MistakeItem, ProgressSummary, WorkCard } from "../../lib/types";

const themeMap: Record<string, string> = {
  gold: "theme-gold",
  jade: "theme-jade",
  rose: "theme-rose",
  indigo: "theme-indigo",
  amber: "theme-amber",
};

export function HomeClient() {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("全部");
  const [stage, setStage] = useState("全部");
  const [works, setWorks] = useState<WorkCard[]>([]);
  const [collections, setCollections] = useState<CollectionStat[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [worksResult, collectionResult, progressResult, mistakesResult, achievementsResult] = await Promise.all([
          api.listWorks({ query, collection, stage }),
          api.collections(),
          api.progressSummary(),
          api.mistakes(),
          api.achievements(),
        ]);
        setWorks(worksResult.items);
        setCollections(collectionResult.items);
        setProgress(progressResult);
        setMistakes(mistakesResult.items);
        setAchievements(achievementsResult.items);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "加载失败";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [collection, query, stage]);

  const unlockedAchievements = useMemo(() => achievements.filter((item) => item.unlocked), [achievements]);
  const activeAchievements = useMemo(() => achievements.filter((item) => !item.unlocked).slice(0, 3), [achievements]);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Classics Learning Platform · v0.1.0</span>
          <h1>把古诗词做成一个真正愿意反复打开的学习产品</h1>
          <p>
            现在不只是内容原型，而是完整的正式仓库骨架：626 篇内容、可检索的 API、学习进度、错题本与成就系统一起上线。
          </p>
          <div className="hero-actions">
            <a href="#works" className="button button-primary">
              直接开始学习
            </a>
            <Link href="/works/chun-xiao" className="button button-secondary">
              打开示例作品
            </Link>
          </div>
        </div>
        <div className="hero-metrics">
          <article className="metric-card">
            <BookOpen size={18} />
            <strong>{progress?.totalWorks ?? 0}</strong>
            <span>已收录作品</span>
          </article>
          <article className="metric-card">
            <Target size={18} />
            <strong>{progress?.quizCorrectCount ?? 0}</strong>
            <span>演示用户累计答对</span>
          </article>
          <article className="metric-card">
            <Award size={18} />
            <strong>{unlockedAchievements.length}</strong>
            <span>已解锁成就</span>
          </article>
          <article className="metric-card">
            <Flame size={18} />
            <strong>{progress?.bestStreak ?? 0}</strong>
            <span>最佳连续学习</span>
          </article>
        </div>
      </section>

      {error ? <div className="alert error">接口加载失败：{error}</div> : null}

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <h2>学习进度概览</h2>
            <span>{progress?.masteryRate ?? 0}% 完成率</span>
          </div>
          <div className="progress-metrics">
            <div>
              <strong>{progress?.viewedCount ?? 0}</strong>
              <span>已浏览</span>
            </div>
            <div>
              <strong>{progress?.masteredCount ?? 0}</strong>
              <span>已掌握</span>
            </div>
            <div>
              <strong>{progress?.collectionBreakdown.length ?? 0}</strong>
              <span>专题</span>
            </div>
          </div>
          <div className="stack-list compact-list">
            {(progress?.collectionBreakdown ?? []).map((item) => {
              const percent = item.total ? Math.round((item.mastered / item.total) * 100) : 0;
              return (
                <div key={item.collection} className="progress-row">
                  <div>
                    <strong>{item.collection}</strong>
                    <p>
                      已浏览 {item.viewed} / {item.total} · 已掌握 {item.mastered}
                    </p>
                  </div>
                  <span>{percent}%</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>错题本</h2>
            <span>{mistakes.filter((item) => !item.resolved).length} 条待回看</span>
          </div>
          <div className="stack-list compact-list">
            {mistakes.slice(0, 4).map((item) => (
              <Link key={item.id} href={`/works/${item.slug}`} className="mistake-card">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.stem}</p>
                </div>
                <span className={`status-pill ${item.resolved ? "is-resolved" : "is-pending"}`}>
                  {item.resolved ? "已订正" : "待复习"}
                </span>
              </Link>
            ))}
            {!mistakes.length ? <p className="empty-hint">当前没有错题记录，保持得不错。</p> : null}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>成就系统</h2>
            <span>{unlockedAchievements.length} / {achievements.length}</span>
          </div>
          <div className="achievement-grid">
            {achievements.map((item) => (
              <article key={item.id} className={`achievement-card ${item.unlocked ? "is-unlocked" : ""} ${themeMap[item.theme] ?? "theme-jade"}`}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
                <span>
                  {item.progress} / {item.threshold}
                </span>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="panel filters-panel" id="works">
        <div className="panel-heading">
          <h2>正式作品库</h2>
          <span>{collections.reduce((sum, item) => sum + item.total, 0)} 篇已可检索</span>
        </div>
        <div className="filters-row">
          <label className="search-field">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜标题、作者、主题或名句"
            />
          </label>
          <select value={collection} onChange={(event) => setCollection(event.target.value)}>
            <option value="全部">全部专题</option>
            {collections.map((item) => (
              <option key={item.collection} value={item.collection}>
                {item.collection}
              </option>
            ))}
          </select>
          <select value={stage} onChange={(event) => setStage(event.target.value)}>
            <option value="全部">全部学段</option>
            <option value="小学">小学</option>
            <option value="初中">初中</option>
            <option value="高中">高中</option>
          </select>
        </div>

        {loading ? <p className="empty-hint">正在加载正式内容库与学习面板...</p> : null}
        {!loading && !works.length ? <p className="empty-hint">没有找到匹配作品，试试换个关键词。</p> : null}

        <div className="works-grid">
          {works.map((work) => (
            <Link key={work.id} href={`/works/${work.slug}`} className="work-card work-card-link">
              <div className="cover-shell">
                {resolveAssetUrl(work.coverAssetPath, work.slug) ? <img src={resolveAssetUrl(work.coverAssetPath, work.slug) ?? undefined} alt={work.title} /> : <div className="cover-fallback">{work.title}</div>}
              </div>
              <div className="work-card-body">
                <div className="meta-row">
                  <span className="meta-pill">{work.collection}</span>
                  <span className="meta-pill">{work.textbookStage ?? "未分级"}</span>
                </div>
                <h3>{work.title}</h3>
                <p className="muted">
                  {work.authorName} · {work.dynasty} · 难度 {work.difficultyLevel}
                </p>
                <p className="work-excerpt">{work.excerpt}</p>
                <div className="tag-row">
                  {work.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="roadmap-grid">
        <article className="panel">
          <div className="panel-heading">
            <h2>当前已打通</h2>
          </div>
          <ul className="bullet-list">
            <li>626 篇作品标准化入库，自动生成封面、题目与相关推荐。</li>
            <li>Fastify API 提供搜索、详情、进度、错题本、成就接口。</li>
            <li>Next.js 正式前端接入学习看板和作品详情学习流程。</li>
          </ul>
        </article>
        <article className="panel">
          <div className="panel-heading">
            <h2>下一版本建议</h2>
          </div>
          <ul className="bullet-list">
            {activeAchievements.map((item) => (
              <li key={item.id}>
                {item.title}：还差 {item.remaining} 个 {item.metricLabel.toLowerCase()}。
              </li>
            ))}
            {!activeAchievements.length ? <li>演示用户已把首批基础成就全部点亮，可以继续补每日推荐与音频朗读。</li> : null}
          </ul>
        </article>
      </section>
    </main>
  );
}
