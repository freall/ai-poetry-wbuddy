import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import { createRepository } from "./db.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(currentDir, "../../../public");
const repo = createRepository();
const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
});

await app.register(fastifyStatic, {
  root: publicDir,
  prefix: "/assets/",
});

const listWorksQuerySchema = z.object({
  query: z.string().trim().optional(),
  collection: z.string().trim().optional(),
  stage: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(60).optional(),
});

const userSchema = z.object({
  userId: z.string().trim().min(1).default(process.env.DEMO_USER_ID ?? "demo-user"),
});

const progressBodySchema = z.object({
  userId: z.string().trim().min(1),
  workId: z.string().trim().min(1),
  viewed: z.boolean().optional(),
  mastered: z.boolean().optional(),
  streak: z.number().int().min(0).max(365).optional(),
  quizScore: z.number().int().min(0).max(100).optional(),
  rewardStatus: z.string().trim().min(1).optional(),
});

const quizSubmissionSchema = z.object({
  userId: z.string().trim().min(1),
  workId: z.string().trim().min(1),
  quizId: z.string().trim().min(1),
  selectedAnswer: z.string().trim().min(1),
  correctAnswer: z.string().trim().min(1),
  isCorrect: z.boolean(),
});

app.get("/health", async () => ({
  status: "ok",
  dbPath: repo.dbPath,
}));

app.get("/collections", async () => ({
  items: repo.listCollections(),
}));

app.get("/works", async (request) => {
  const query = listWorksQuerySchema.parse(request.query);
  return {
    items: repo.listWorks(query),
  };
});

app.get("/works/:slug", async (request, reply) => {
  const params = z.object({ slug: z.string().trim().min(1) }).parse(request.params);
  const work = repo.getWorkBySlug(params.slug);
  if (!work) {
    reply.code(404);
    return { message: "未找到对应作品" };
  }

  return {
    work,
    quizzes: repo.getQuizzes(work.id),
    recommendations: repo.getRecommendations(work.id),
  };
});

app.get("/search", async (request) => {
  const query = z.object({ q: z.string().trim().min(1), limit: z.coerce.number().int().positive().max(20).optional() }).parse(request.query);
  return {
    items: repo.listWorks({ query: query.q, limit: query.limit ?? 12 }),
  };
});

app.get("/recommendations/:workId", async (request) => {
  const params = z.object({ workId: z.string().trim().min(1) }).parse(request.params);
  return {
    items: repo.getRecommendations(params.workId),
  };
});

app.get("/quizzes/:workId", async (request) => {
  const params = z.object({ workId: z.string().trim().min(1) }).parse(request.params);
  return {
    items: repo.getQuizzes(params.workId),
  };
});

app.get("/progress/summary", async (request) => {
  const query = userSchema.parse(request.query);
  return repo.getProgressSummary(query.userId);
});

app.get("/progress/work/:workId", async (request) => {
  const params = z.object({ workId: z.string().trim().min(1) }).parse(request.params);
  const query = userSchema.parse(request.query);
  return repo.getWorkProgress(query.userId, params.workId);
});

app.post("/progress", async (request) => {
  const body = progressBodySchema.parse(request.body);
  return repo.upsertProgress(body);
});

app.post("/quiz-submissions", async (request) => {
  const body = quizSubmissionSchema.parse(request.body);
  return repo.recordQuizSubmission(body);
});

app.get("/mistakes", async (request) => {
  const query = userSchema.parse(request.query);
  return {
    items: repo.getMistakes(query.userId),
  };
});

app.get("/achievements", async (request) => {
  const query = userSchema.parse(request.query);
  return {
    items: repo.getAchievements(query.userId),
  };
});

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof z.ZodError) {
    reply.code(400).send({
      message: "请求参数不合法",
      issues: error.flatten(),
    });
    return;
  }

  app.log.error(error);
  reply.code(500).send({
    message: "服务器开小差了，请稍后再试",
  });
});

const port = Number(process.env.PORT ?? 4000);
await app.listen({ port, host: "0.0.0.0" });
