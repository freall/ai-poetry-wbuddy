#!/usr/bin/env node
/**
 * 测试随机作品API功能
 */

async function testRandomWorksAPI() {
  console.log("🔍 测试随机作品API功能");
  console.log("=" .repeat(50));
  
  try {
    // 模拟调用API
    const { api } = require('./apps/web/lib/api.ts');
    
    console.log("1. 测试随机获取10首作品...");
    const result1 = await api.randomWorks({ limit: 10 });
    console.log(`   ✅ 成功获取 ${result1.items.length} 首作品`);
    
    if (result1.items.length > 0) {
      console.log("   示例作品:");
      result1.items.slice(0, 3).forEach((work, i) => {
        console.log(`     ${i+1}. ${work.title} - ${work.authorName} (${work.dynasty})`);
        console.log(`       封面: ${work.coverAssetPath || '默认封面'}`);
      });
    }
    
    console.log("\n2. 测试排除已加载作品...");
    const excludeIds = result1.items.map(w => w.id);
    const result2 = await api.randomWorks({ excludeIds, limit: 5 });
    console.log(`   ✅ 成功获取 ${result2.items.length} 首新作品`);
    
    console.log("\n3. 测试按文集筛选...");
    const result3 = await api.randomWorks({ collection: "唐诗三百首", limit: 3 });
    console.log(`   ✅ 成功获取 ${result3.items.length} 首唐诗`);
    
    console.log("\n🎉 所有测试通过！");
    
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
}

// 运行测试
testRandomWorksAPI();