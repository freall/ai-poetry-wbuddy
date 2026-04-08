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

export type AchievementMetric = "viewed_count" | "mastered_count" | "quiz_correct_count" | "streak_days";
