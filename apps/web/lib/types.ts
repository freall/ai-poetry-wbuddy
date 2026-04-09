export type WorkCard = {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  dynasty: string;
  genre: string;
  collection: string;
  textbookStage: string | null;
  difficultyLevel: number;
  themeLabel: string | null;
  tags: string[];
  coverAssetPath: string | null;
  originalText: string;
  backgroundText: string | null;
  authorSummary: string | null;
  quizCount: number;
  relationCount: number;
  excerpt: string;
};

export type CollectionStat = {
  collection: string;
  total: number;
  primary_count: number;
  middle_count: number;
  high_count: number;
};

export type ProgressSummary = {
  userId: string;
  totalWorks: number;
  viewedCount: number;
  masteredCount: number;
  quizCorrectCount: number;
  bestStreak: number;
  masteryRate: number;
  collectionBreakdown: Array<{
    collection: string;
    total: number;
    viewed: number;
    mastered: number;
  }>;
};

export type MistakeItem = {
  id: string;
  quizId: string;
  workId: string;
  slug: string;
  title: string;
  authorName: string;
  stem: string;
  selectedAnswer: string;
  correctAnswer: string;
  resolved: boolean;
  attempts: number;
  lastSeenAt: string;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  metric: string;
  metricLabel: string;
  threshold: number;
  theme: string;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
  remaining: number;
};

export type QuizItem = {
  id: string;
  workId: string;
  questionType: string;
  stem: string;
  options: string[];
  answer: string;
  explanation: string | null;
  difficulty: number;
};

export type WorkDetail = {
  id: string;
  slug: string;
  title: string;
  authorName: string;
  dynasty: string;
  genre: string;
  collection: string;
  textbookStage: string | null;
  difficultyLevel: number;
  themeLabel: string | null;
  tags: string[];
  coverAssetPath: string | null;
  originalText: string;
  backgroundText: string | null;
  authorSummary: string | null;
  quizCount: number;
  relationCount: number;
  translationText: string | null;
  appreciationText: string | null;
  sourceName: string | null;
  sourceCollection: string | null;
  sourceUrl: string | null;
  paragraphs: string[];
  author: {
    id: string;
    name: string;
    dynasty: string;
    bio: string;
    achievements: string | null;
  };
};

export type WorkProgress = {
  id?: string;
  userId: string;
  workId: string;
  viewed: boolean;
  mastered: boolean;
  streak: number;
  quizScore: number;
  rewardStatus: string;
  updatedAt: string | null;
};

export type WorkDetailPayload = {
  work: WorkDetail;
  quizzes: QuizItem[];
  recommendations: Array<{
    relationId: string;
    relationType: string;
    score: number;
    work: WorkCard;
  }>;
};
