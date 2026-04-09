#!/usr/bin/env node
/**
 * prepare-assets.js — 构建前准备静态资源
 * 1. 从 data/processed/classics-library.json 生成 slugs.json
 * 2. 从 repo root public/images/ 复制封面到 apps/web/public/images/
 */
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "../../..");
const webDir = path.resolve(__dirname, "..");

// 1. Generate slugs.json
const datasetPath = path.join(rootDir, "data", "processed", "classics-library.json");
if (fs.existsSync(datasetPath)) {
  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));
  const slugs = dataset.works.map((w) => ({ slug: w.slug }));
  const slugsPath = path.join(webDir, "slugs.json");
  fs.writeFileSync(slugsPath, JSON.stringify(slugs, null, 0));
  console.log(`✓ Generated slugs.json with ${slugs.length} entries`);
} else {
  console.warn("⚠ Dataset not found, skipping slugs.json generation");
}

// 2. Copy cover images
const srcImages = path.join(rootDir, "public", "images");
const dstImages = path.join(webDir, "public", "images");
if (fs.existsSync(srcImages)) {
  fs.mkdirSync(dstImages, { recursive: true });
  const generatedDir = path.join(dstImages, "generated");
  fs.mkdirSync(generatedDir, { recursive: true });
  
  const srcGenerated = path.join(srcImages, "generated");
  if (fs.existsSync(srcGenerated)) {
    const files = fs.readdirSync(srcGenerated).filter((f) => f.endsWith(".svg"));
    for (const file of files) {
      fs.copyFileSync(path.join(srcGenerated, file), path.join(generatedDir, file));
    }
    console.log(`✓ Copied ${files.length} cover images`);
  }
} else {
  console.warn("⚠ Source images directory not found");
}
