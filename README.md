# Classics Learning Platform

一个面向中小学生的古诗词与古文学习平台，目标是把“内容站”做成“轻松、现代、可激励、可扩展”的学习产品。

## 当前已落地的内容

### 1. 数据底座
- 已采集首批 **16 篇**作品
  - 唐诗精选：6 篇
  - 宋词精选：4 篇
  - 古文精选：6 篇
- 已生成：
  - `data/processed/initial-library.json`
  - `data/processed/classics-prototype.db`
- 已配套：
  - 作者信息
  - 主题标签
  - 相关推荐
  - 本地封面 SVG
  - 每篇 3 道练习题（共 48 题）

### 2. 数据库
- schema：`packages/db/schema.sql`
- 生成脚本：`scripts/build_initial_db.py`
- 当前数据库文件：`data/processed/classics-prototype.db`

### 3. Web 原型
- 原型目录：`apps/web/`
- 页面能力：
  - 搜索
  - 按专题 / 学段筛选
  - 作品流浏览
  - 作品详情
  - 上一篇 / 下一篇
  - 推荐关联作品
  - 答题激励与庆祝效果

## 一键运行方式

### 重新生成数据
```bash
cd classics-learning-platform
python3 scripts/fetch_initial_dataset.py
python3 scripts/build_initial_db.py
```

### 本地预览原型
```bash
cd classics-learning-platform
python3 -m http.server 4173
```

打开：
- `http://127.0.0.1:4173/apps/web/index.html`

## 当前目录重点
- `AGENTS.md`：协作、安全、开源依赖规范
- `DESIGN.md`：统一视觉与交互原则
- `ARCHITECTURE.md`：系统架构与阶段路线
- `DATA_SOURCES.md`：公开数据源与素材策略
- `apps/web/`：首个前端原型
- `packages/db/schema.sql`：数据库结构
- `data/processed/`：结构化 JSON + SQLite 数据库
- `scripts/fetch_initial_dataset.py`：首批数据采集与标准化脚本
- `scripts/build_initial_db.py`：数据库构建脚本

## 下一步建议
1. 扩大篇目清单到完整的唐诗三百首 / 宋词三百首 / 中小学教材常见篇目
2. 为每篇补齐更精细的注释、逐句译文、背景与讲解
3. 引入真实历史画作 / 书法资源清单与本地素材 manifest
4. 把静态原型升级为正式前后端应用（Next.js + API + 数据库服务）
5. 增加学习进度、成就系统、错题本与每日推荐
