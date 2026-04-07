# API 方向说明（下一阶段）

这一阶段先完成了数据底座、SQLite 数据库和静态原型。

下一阶段建议在 `apps/api/` 中补齐正式 API，至少包含：

- `GET /works`
- `GET /works/:slug`
- `GET /search?q=`
- `GET /collections`
- `GET /recommendations/:workId`
- `GET /quizzes/:workId`
- `POST /progress`

建议技术栈：
- Fastify
- TypeScript
- Zod
- Drizzle ORM

当前 `data/processed/classics-prototype.db` 已可作为 API 首个数据来源。 
