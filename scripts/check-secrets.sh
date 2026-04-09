#!/bin/bash
# 检查代码库中的敏感信息泄露

set -e

echo "🔍 检查代码库中的敏感信息泄露"
echo "========================================"

# 1. 检查硬编码的 JWT 令牌
echo "1. 检查硬编码的 JWT 令牌..."
if grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null; then
    echo "❌ 发现硬编码的 JWT 令牌！"
else
    echo "✅ 未发现硬编码 JWT 令牌"
fi

echo ""

# 2. 检查硬编码的 API 密钥
echo "2. 检查硬编码的 API 密钥..."
if grep -r "API_KEY\|SECRET_KEY\|PASSWORD\|TOKEN" . --exclude-dir=node_modules --exclude-dir=.git -i 2>/dev/null | grep -v "process.env\|NEXT_PUBLIC\|//\|#\|'" | head -10; then
    echo "⚠️  发现可能的硬编码密钥（需要人工确认）"
else
    echo "✅ 未发现明显的硬编码 API 密钥"
fi

echo ""

# 3. 检查 .env 文件是否被提交
echo "3. 检查 .env 文件是否被提交..."
if git ls-files | grep -E '\.env(\.|$)' | grep -v '.env.example' 2>/dev/null; then
    echo "❌ 发现 .env 文件被提交到 git！"
else
    echo "✅ 未发现提交的 .env 文件（.env.example 除外）"
fi

echo ""

# 4. 检查 Supabase 相关密钥
echo "4. 检查 Supabase 相关密钥..."
if grep -r "supabase\.co" . --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | grep -v "process.env\|NEXT_PUBLIC\|//\|#\|'" | head -5; then
    echo "⚠️  发现可能的 Supabase URL 硬编码"
else
    echo "✅ 未发现 Supabase URL 硬编码"
fi

echo ""

# 5. 检查是否使用环境变量
echo "5. 检查环境变量使用情况..."
echo "当前代码中使用环境变量的位置："
grep -r "process\.env" . --exclude-dir=node_modules --exclude-dir=.git | grep -E "SUPABASE|API|KEY|SECRET" | head -10

echo ""
echo "========================================"
echo "📋 安全建议："
echo "1. 立即在 Supabase Dashboard 中撤销泄露的密钥"
echo "2. 生成新的 Publishable Key 和 Service Role Key"
echo "3. 更新本地和部署环境中的环境变量"
echo "4. 考虑使用 git filter-branch 或 BFG Repo-Cleaner 清理历史记录"
echo "5. 设置 GitHub Secret Scanning 或 GitGuardian 等工具进行持续监控"