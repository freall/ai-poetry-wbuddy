"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api, resolveAssetUrl } from "../../lib/api";
import type { WorkDetailPayload, WorkProgress } from "../../lib/types";

export function WorkDetailClient({ slug }: { slug: string }) {
  const [payload, setPayload] = useState<WorkDetailPayload | null>(null);
  const [progress, setProgress] = useState<WorkProgress | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const detail = await api.workDetail(slug);
        const nextProgress = await api.workProgress(detail.work.id);
        setPayload(detail);
        setProgress(nextProgress);
      } catch (loadError) {
        const text = loadError instanceof Error ? loadError.message : "加载失败";
        setError(text);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [slug]);

  const completion = useMemo(() => {
    if (!payload?.quizzes.length || score === null) {
      return 0;
    }
    return Math.round((score / payload.quizzes.length) * 100);
  }, [payload?.quizzes.length, score]);

  const updateProgress = async (partial: Partial<WorkProgress>) => {
    if (!payload) return;
    // Use setProgress callback to avoid stale closure over `progress`
    const freshProgress = await new Promise<WorkProgress | null>((resolve) => {
      setProgress((prev) => {
        resolve(prev);
        return prev;
      });
    });
    const nextProgress = await api.saveProgress({
      workId: payload.work.id,
      viewed: partial.viewed ?? freshProgress?.viewed ?? true,
      mastered: partial.mastered ?? freshProgress?.mastered ?? false,
      streak: partial.streak ?? freshProgress?.streak ?? 1,
      quizScore: partial.quizScore ?? freshProgress?.quizScore ?? 0,
      rewardStatus: partial.rewardStatus ?? freshProgress?.rewardStatus ?? "bronze",
    });
    setProgress(nextProgress);
  };

  const submitQuiz = async () => {
    if (!payload) return;
    let nextScore = 0;
    for (const quiz of payload.quizzes) {
      const selectedAnswer = answers[quiz.id];
      if (!selectedAnswer) {
        setMessage("还有题目没选，先把这一轮做完整。");
        return;
      }
      const isCorrect = selectedAnswer === quiz.answer;
      if (isCorrect) {
        nextScore += 1;
      }
      await api.submitQuiz({
        workId: payload.work.id,
        quizId: quiz.id,
        selectedAnswer,
        correctAnswer: quiz.answer,
        isCorrect,
      });
    }

    const mastered = nextScore === payload.quizzes.length;
    const nextRewardStatus = mastered ? "gold" : nextScore >= Math.ceil(payload.quizzes.length * 0.67) ? "silver" : "bronze";
    await updateProgress({
      viewed: true,
      mastered,
      streak: Math.max(progress?.streak ?? 0, mastered ? 5 : 1),
      quizScore: nextScore,
      rewardStatus: nextRewardStatus,
    });
    setScore(nextScore);
    setMessage(mastered ? "这一篇已经掌握，可以去刷下一首了。" : "先把错题回看一遍，再试一次会更稳。");
  };

  if (loading) {
    return <main className="page-shell"><p className="panel">正在加载作品详情...</p></main>;
  }

  if (error || !payload) {
    return (
      <main className="page-shell">
        <div className="alert error">{error ?? "未找到作品"}</div>
        <Link href="/" className="button button-secondary">
          返回首页
        </Link>
      </main>
    );
  }

  const { work, quizzes, recommendations } = payload;

  return (
    <main className="page-shell detail-shell">
      <Link href="/" className="inline-link back-link">
        <ArrowLeft size={16} /> 返回首页
      </Link>

      <section className="detail-hero panel">
        <div className="detail-hero-cover">
          {resolveAssetUrl(work.coverAssetPath) ? <img src={resolveAssetUrl(work.coverAssetPath) ?? undefined} alt={work.title} /> : null}
        </div>
        <div className="detail-hero-copy">
          <div className="meta-row">
            <span className="meta-pill">{work.collection}</span>
            <span className="meta-pill">{work.themeLabel ?? "主题待补充"}</span>
            <span className="meta-pill">{work.textbookStage ?? "未分级"}</span>
          </div>
          <h1>{work.title}</h1>
          <p className="muted">
            {work.author.name} · {work.dynasty} · {work.genre} · 难度 {work.difficultyLevel}
          </p>
          <p>{work.backgroundText}</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => void updateProgress({ viewed: true, rewardStatus: progress?.rewardStatus ?? "bronze" })}>
              记录已浏览
            </button>
            <button className="button button-secondary" onClick={() => void updateProgress({ viewed: true, mastered: true, rewardStatus: "gold" })}>
              标记已掌握
            </button>
          </div>
          <div className="detail-progress-row">
            <span>学习状态：{progress?.mastered ? "已掌握" : progress?.viewed ? "学习中" : "未开始"}</span>
            <span>当前得分：{progress?.quizScore ?? 0}</span>
            <span>奖励等级：{progress?.rewardStatus ?? "locked"}</span>
          </div>
        </div>
      </section>

      <section className="detail-grid">
        <article className="panel prose-panel">
          <div className="panel-heading">
            <h2>原文</h2>
            <span>{work.paragraphs.length} 行</span>
          </div>
          <div className="poem-block">
            {work.paragraphs.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </article>

        <article className="panel prose-panel">
          <div className="panel-heading">
            <h2>译文与赏析</h2>
          </div>
          <p>{work.translationText ?? "译文正在补充中。"}</p>
          <p>{work.appreciationText ?? "赏析正在补充中。"}</p>
        </article>

        <article className="panel prose-panel">
          <div className="panel-heading">
            <h2>作者与背景</h2>
          </div>
          <p>{work.author.bio}</p>
          {work.author.achievements ? <p className="muted">代表标签：{work.author.achievements}</p> : null}
          {work.sourceName ? <p className="muted">内容来源：{work.sourceName} / {work.sourceCollection}</p> : null}
        </article>

        <article className="panel quiz-panel">
          <div className="panel-heading">
            <h2>随堂练习</h2>
            <span>{quizzes.length} 题</span>
          </div>
          <div className="stack-list">
            {quizzes.map((quiz, index) => (
              <div key={quiz.id} className="quiz-card">
                <strong>{index + 1}. {quiz.stem}</strong>
                <div className="option-list">
                  {quiz.options.map((option) => (
                    <label key={option} className={`option-item ${answers[quiz.id] === option ? "is-selected" : ""}`}>
                      <input
                        type="radio"
                        name={quiz.id}
                        value={option}
                        checked={answers[quiz.id] === option}
                        onChange={() => setAnswers((prev) => ({ ...prev, [quiz.id]: option }))}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                {score !== null ? (
                  <p className={`quiz-feedback ${answers[quiz.id] === quiz.answer ? "is-success" : "is-danger"}`}>
                    正确答案：{quiz.answer} {quiz.explanation ? `· ${quiz.explanation}` : ""}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => void submitQuiz()}>
              提交本轮练习
            </button>
            {score !== null ? (
              <span className="score-pill">
                <CheckCircle2 size={16} /> 得分 {score} / {quizzes.length} · 完成度 {completion}%
              </span>
            ) : null}
          </div>
          {message ? <div className="alert success"><Sparkles size={16} /> {message}</div> : null}
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>相关推荐</h2>
          <span>{recommendations.length} 条</span>
        </div>
        <div className="works-grid compact-grid">
          {recommendations.map((item) => (
            <article key={item.relationId} className="recommend-card">
              <span className="meta-pill">{item.relationType}</span>
              <h3>{item.work.title}</h3>
              <p className="muted">{item.work.authorName} · {item.work.collection}</p>
              <p>{item.work.excerpt}</p>
              <Link href={`/works/${item.work.slug}`} className="inline-link">
                继续学习
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
