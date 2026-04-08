import type {
  Achievement,
  CollectionStat,
  MistakeItem,
  ProgressSummary,
  WorkCard,
  WorkDetailPayload,
  WorkProgress,
} from "./types";

export const DEMO_USER_ID = "demo-user";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "http://127.0.0.1:4000";

export function resolveAssetUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE_URL}/assets${path.startsWith("/") ? path : `/${path}`}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const api = {
  listWorks: (params: { query?: string; collection?: string; stage?: string }) => {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set("query", params.query);
    if (params.collection) searchParams.set("collection", params.collection);
    if (params.stage) searchParams.set("stage", params.stage);
    searchParams.set("limit", "36");
    return request<{ items: WorkCard[] }>(`/works?${searchParams.toString()}`);
  },
  collections: () => request<{ items: CollectionStat[] }>("/collections"),
  progressSummary: (userId = DEMO_USER_ID) => request<ProgressSummary>(`/progress/summary?userId=${userId}`),
  mistakes: (userId = DEMO_USER_ID) => request<{ items: MistakeItem[] }>(`/mistakes?userId=${userId}`),
  achievements: (userId = DEMO_USER_ID) => request<{ items: Achievement[] }>(`/achievements?userId=${userId}`),
  workDetail: (slug: string) => request<WorkDetailPayload>(`/works/${slug}`),
  workProgress: (workId: string, userId = DEMO_USER_ID) => request<WorkProgress>(`/progress/work/${workId}?userId=${userId}`),
  saveProgress: (payload: {
    userId?: string;
    workId: string;
    viewed?: boolean;
    mastered?: boolean;
    streak?: number;
    quizScore?: number;
    rewardStatus?: string;
  }) =>
    request<WorkProgress>("/progress", {
      method: "POST",
      body: JSON.stringify({
        userId: payload.userId ?? DEMO_USER_ID,
        ...payload,
      }),
    }),
  submitQuiz: (payload: {
    userId?: string;
    workId: string;
    quizId: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }) =>
    request<{ recorded: boolean; resolved: boolean }>("/quiz-submissions", {
      method: "POST",
      body: JSON.stringify({
        userId: payload.userId ?? DEMO_USER_ID,
        ...payload,
      }),
    }),
};
