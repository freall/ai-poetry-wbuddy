#!/usr/bin/env node
/**
 * 通过 Supabase REST API 导入内容数据到已建好的表中。
 * 前置条件：已在 Supabase Dashboard SQL Editor 中执行 supabase-schema.sql
 * 
 * 用法：
 *   SUPABASE_SECRET_KEY=xxx node scripts/supabase-import-data.js
 *   或在 .env.local 中配置 SUPABASE_SECRET_KEY 后直接运行
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

// 尝试从 .env.local 加载环境变量
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kldrdqxtwcufrjcgrrbj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || '';

const datasetPath = path.resolve(__dirname, '../data/processed/classics-library.json');
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));

function supabaseRequest(table, method, body, queryParams) {
  return new Promise((resolve, reject) => {
    if (!SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SECRET_KEY environment variable is required');
      process.exit(1);
    }
    
    const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
    if (queryParams) url.search = queryParams;
    const postData = body ? JSON.stringify(body) : null;
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method,
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          const err = new Error(`HTTP ${res.statusCode} on ${method} ${table}: ${data}`);
          err.statusCode = res.statusCode;
          err.body = data;
          reject(err);
        } else {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function batchInsert(table, rows, batchSize = 100) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    try {
      await supabaseRequest(table, 'POST', batch);
      inserted += batch.length;
      process.stdout.write(`\r  ${table}: ${inserted}/${rows.length}`);
    } catch (err) {
      if (err.statusCode === 409 || (err.body && err.body.includes('duplicate'))) {
        // Duplicate key — skip
        inserted += batch.length;
        process.stdout.write(`\r  ${table}: ${inserted}/${rows.length} (skipping duplicates)`);
      } else {
        console.error(`\n  ERROR on ${table} batch ${i}: ${err.message}`);
        if (err.body) console.error(`  ${err.body.substring(0, 200)}`);
        throw err;
      }
    }
  }
  console.log(); // newline
}

async function main() {
  console.log('Supabase REST API Data Import');
  console.log(`  Project: ${SUPABASE_URL}`);
  console.log('');

  // 清空现有数据（按依赖顺序删除）
  console.log('Cleaning existing data...');
  const tablesToDelete = ['user_achievements', 'mistake_notebook', 'learning_progress', 'achievement_definitions', 'relations', 'quizzes', 'assets', 'works', 'authors'];
  for (const table of tablesToDelete) {
    try {
      // PostgREST: DELETE 需要过滤条件，id=not.is.null 匹配所有行
      await supabaseRequest(table, 'DELETE', null, 'id=not.is.null');
      console.log(`  ${table}: cleaned`);
    } catch (err) {
      // 空表会返回 406，忽略
      console.log(`  ${table}: ${err.message.includes('406') ? 'empty (skipped)' : err.message}`);
    }
  }
  console.log('');

  // 1. Authors
  console.log('Importing authors...');
  const authors = dataset.authors.map(a => ({
    id: a.id,
    name: a.name,
    dynasty: a.dynasty,
    bio: a.bio || '',
    achievements: a.achievements || null,
    avatar_asset_id: a.avatar_asset_id || null,
  }));
  await batchInsert('authors', authors);

  // 2. Works
  console.log('Importing works...');
  const assetLookup = {};
  for (const a of dataset.assets) {
    assetLookup[a.work_id] = a.local_path;
  }
  const works = dataset.works.map(w => ({
    id: w.id,
    slug: w.slug,
    title: w.title,
    author_id: w.author_id,
    dynasty: w.dynasty,
    genre: w.genre,
    collection: w.collection,
    textbook_stage: w.textbook_stage || null,
    difficulty_level: w.difficulty_level || 1,
    theme_label: w.theme_label || null,
    tags_json: w.tags || [],
    original_text: w.original_text || '',
    translation_text: w.translation_text || null,
    background_text: w.background_text || null,
    appreciation_text: w.appreciation_text || null,
    author_summary: w.author_summary || null,
    source_name: w.source_name || null,
    source_collection: w.source_collection || null,
    source_url: w.source_url || null,
    cover_asset_path: assetLookup[w.id] || null,
  }));
  await batchInsert('works', works, 50);

  // 3. Assets
  console.log('Importing assets...');
  const assets = dataset.assets.map(a => ({
    id: a.id,
    work_id: a.work_id,
    asset_type: a.asset_type || 'cover',
    local_path: a.local_path || '',
    source_url: a.source_url || null,
    license: a.license || null,
    credit: a.credit || null,
    prompt: a.prompt || null,
    status: a.status || 'ready',
  }));
  await batchInsert('assets', assets);

  // 4. Quizzes
  console.log('Importing quizzes...');
  const quizzes = dataset.quizzes.map(q => ({
    id: q.id,
    work_id: q.work_id,
    question_type: q.question_type || 'choice',
    stem: q.stem || '',
    options_json: q.options || [],
    answer: q.answer || '',
    explanation: q.explanation || null,
    difficulty: q.difficulty || 1,
  }));
  await batchInsert('quizzes', quizzes, 100);

  // 5. Relations
  console.log('Importing relations...');
  const relations = dataset.relations.map(r => ({
    id: r.id,
    from_work_id: r.from_work_id,
    to_work_id: r.to_work_id,
    relation_type: r.relation_type || 'similar',
    score: r.score || 0,
  }));
  await batchInsert('relations', relations, 100);

  // 6. Achievement definitions
  console.log('Importing achievement_definitions...');
  const achievements = [
    { id: 'achievement-first-scroll', title: '初入诗境', description: '完成第一篇作品浏览，点亮学习旅程。', icon: 'sparkles', metric: 'viewed_count', threshold: 1, theme: 'gold' },
    { id: 'achievement-growing-reader', title: '渐入佳境', description: '累计浏览 7 篇作品，形成稳定的阅读节奏。', icon: 'book-open-check', metric: 'viewed_count', threshold: 7, theme: 'jade' },
    { id: 'achievement-mastery-starter', title: '会背也会懂', description: '掌握 3 篇作品，拿到第一个学习徽章。', icon: 'medal', metric: 'mastered_count', threshold: 3, theme: 'rose' },
    { id: 'achievement-quiz-runner', title: '答题连击', description: '累计答对 12 题，说明不仅在看，也在真正理解。', icon: 'target', metric: 'quiz_correct_count', threshold: 12, theme: 'indigo' },
    { id: 'achievement-streak-keeper', title: '七日有风', description: '连续学习 5 天，开始建立自己的古典节奏。', icon: 'flame', metric: 'streak_days', threshold: 5, theme: 'amber' },
  ];
  await batchInsert('achievement_definitions', achievements);

  console.log('\n✅ All data imported successfully!');
  console.log(`  Authors: ${authors.length}`);
  console.log(`  Works: ${works.length}`);
  console.log(`  Assets: ${assets.length}`);
  console.log(`  Quizzes: ${quizzes.length}`);
  console.log(`  Relations: ${relations.length}`);
  console.log(`  Achievements: ${achievements.length}`);
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
