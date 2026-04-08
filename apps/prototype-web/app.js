const state = {
  dataset: null,
  works: [],
  filteredWorks: [],
  selectedCollection: "全部",
  selectedStage: "全部",
  query: "",
  activeWorkId: null,
  quizSelections: {},
  focusMode: false,
};

const elements = {
  statsGrid: document.getElementById("statsGrid"),
  collectionFilters: document.getElementById("collectionFilters"),
  stageFilters: document.getElementById("stageFilters"),
  worksFeed: document.getElementById("worksFeed"),
  detailPanel: document.getElementById("detailPanel"),
  resultCount: document.getElementById("resultCount"),
  feedTitle: document.getElementById("feedTitle"),
  searchInput: document.getElementById("searchInput"),
  randomBtn: document.getElementById("randomBtn"),
  focusBtn: document.getElementById("focusBtn"),
  celebration: document.getElementById("celebration"),
  celebrationText: document.getElementById("celebrationText"),
  closeCelebration: document.getElementById("closeCelebration"),
};

const textbookHighFrequency = new Set(["小学", "初中"]);

async function init() {
  const response = await fetch("/data/processed/initial-library.json");
  const dataset = await response.json();

  const assetMap = Object.fromEntries(dataset.assets.map((asset) => [asset.work_id, asset.local_path]));
  const relationMap = dataset.relations.reduce((acc, relation) => {
    acc[relation.from_work_id] ||= [];
    acc[relation.from_work_id].push(relation);
    return acc;
  }, {});
  const quizMap = dataset.quizzes.reduce((acc, quiz) => {
    acc[quiz.work_id] ||= [];
    acc[quiz.work_id].push(quiz);
    return acc;
  }, {});

  state.dataset = dataset;
  state.works = dataset.works.map((work) => ({
    ...work,
    cover: assetMap[work.id],
    relations: relationMap[work.id] || [],
    quizzes: quizMap[work.id] || [],
  }));
  state.filteredWorks = [...state.works];
  state.activeWorkId = state.works[0]?.id || null;

  bindEvents();
  renderStats();
  renderFilters();
  applyFilters();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    applyFilters();
  });

  elements.randomBtn.addEventListener("click", () => {
    const pool = state.filteredWorks.length ? state.filteredWorks : state.works;
    const randomWork = pool[Math.floor(Math.random() * pool.length)];
    if (randomWork) {
      state.activeWorkId = randomWork.id;
      renderDetail();
      document.getElementById(`work-card-${randomWork.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  elements.focusBtn.addEventListener("click", () => {
    state.focusMode = !state.focusMode;
    elements.focusBtn.textContent = state.focusMode ? "取消教材高频" : "只看教材高频";
    applyFilters();
  });

  elements.closeCelebration.addEventListener("click", closeCelebration);
  elements.celebration.addEventListener("click", (event) => {
    if (event.target === elements.celebration) {
      closeCelebration();
    }
  });
}

function renderStats() {
  const summary = state.dataset.summary;
  const cards = [
    { label: "首批作品", value: `${summary.works}` },
    { label: "作者数", value: `${summary.authors}` },
    { label: "练习题", value: `${summary.quizzes}` },
    { label: "古文专题", value: `${summary.collections["古文精选"]}` },
    { label: "唐诗专题", value: `${summary.collections["唐诗精选"]}` },
    { label: "宋词专题", value: `${summary.collections["宋词精选"]}` },
  ];

  elements.statsGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-card">
          <div class="stat-card__label">${card.label}</div>
          <div class="stat-card__value">${card.value}</div>
        </article>
      `
    )
    .join("");
}

function renderFilters() {
  const collections = ["全部", ...new Set(state.works.map((work) => work.collection))];
  const stages = ["全部", "小学", "初中", "高中"];
  elements.collectionFilters.innerHTML = collections
    .map(
      (collection) =>
        `<button class="chip ${state.selectedCollection === collection ? "is-active" : ""}" data-filter-type="collection" data-value="${collection}">${collection}</button>`
    )
    .join("");

  elements.stageFilters.innerHTML = stages
    .map(
      (stage) => `<button class="chip ${state.selectedStage === stage ? "is-active" : ""}" data-filter-type="stage" data-value="${stage}">${stage}</button>`)
    .join("");

  document.querySelectorAll("[data-filter-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.filterType;
      const value = button.dataset.value;
      if (type === "collection") {
        state.selectedCollection = value;
      }
      if (type === "stage") {
        state.selectedStage = value;
      }
      renderFilters();
      applyFilters();
    });
  });
}

function applyFilters() {
  const query = state.query.toLowerCase();
  state.filteredWorks = state.works.filter((work) => {
    const matchesCollection = state.selectedCollection === "全部" || work.collection === state.selectedCollection;
    const matchesStage = state.selectedStage === "全部" || work.textbook_stage === state.selectedStage;
    const matchesFocus = !state.focusMode || textbookHighFrequency.has(work.textbook_stage);
    const haystack = [work.title, work.author_name, work.theme_label, work.tags.join(" "), work.background_text].join(" ").toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    return matchesCollection && matchesStage && matchesFocus && matchesQuery;
  });

  if (!state.filteredWorks.find((work) => work.id === state.activeWorkId)) {
    state.activeWorkId = state.filteredWorks[0]?.id || null;
  }

  const titleParts = [];
  if (state.selectedCollection !== "全部") titleParts.push(state.selectedCollection);
  if (state.selectedStage !== "全部") titleParts.push(state.selectedStage);
  if (state.focusMode) titleParts.push("教材高频");
  elements.feedTitle.textContent = titleParts.length ? titleParts.join(" · ") : "全部作品";
  elements.resultCount.textContent = `当前展示 ${state.filteredWorks.length} / ${state.works.length} 篇`;

  renderFeed();
  renderDetail();
}

function renderFeed() {
  if (!state.filteredWorks.length) {
    elements.worksFeed.innerHTML = `
      <div class="panel empty-state">
        <div class="empty-state__icon">⌕</div>
        <h3>没有找到匹配结果</h3>
        <p>试试换个作者、作品名或主题关键词。</p>
      </div>
    `;
    return;
  }

  elements.worksFeed.innerHTML = state.filteredWorks
    .map((work) => {
      const lines = work.original_text.split(/\n+/).slice(0, 3).join(" / ");
      return `
        <article id="work-card-${work.id}" class="work-card">
          <div class="work-card__cover" style="background-image: url('${work.cover}');"></div>
          <div class="work-card__body">
            <div class="work-card__header">
              <div>
                <h3>${work.title}</h3>
                <div class="work-card__meta">
                  <span class="meta-chip">${work.author_name}</span>
                  <span class="meta-chip">${work.dynasty}</span>
                  <span class="meta-chip">${work.genre}</span>
                  <span class="meta-chip">${work.textbook_stage}</span>
                </div>
              </div>
              <span class="meta-chip">难度 ${work.difficulty_level}</span>
            </div>
            <p class="work-card__summary">${work.background_text}</p>
            <p class="work-card__summary"><strong>原文速览：</strong>${lines}</p>
            <div class="tag-row">${work.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
            <div class="work-card__actions">
              <button class="button button--primary" data-action="open" data-id="${work.id}">打开详情</button>
              <button class="button button--ghost" data-action="quiz" data-id="${work.id}">直接做题</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll("[data-action='open'], [data-action='quiz']").forEach((button) => {
    button.addEventListener("click", () => {
      const workId = button.dataset.id;
      state.activeWorkId = workId;
      renderDetail(button.dataset.action === "quiz");
    });
  });
}

function renderDetail(focusQuiz = false) {
  const work = state.filteredWorks.find((item) => item.id === state.activeWorkId) || state.works.find((item) => item.id === state.activeWorkId);
  if (!work) {
    elements.detailPanel.className = "panel detail-panel empty-state";
    elements.detailPanel.innerHTML = `
      <div class="empty-state__icon">✦</div>
      <h3>先选一篇作品</h3>
      <p>左侧可以搜索、筛选，或者直接点“随机抽一篇”。</p>
    `;
    return;
  }

  const relatedWorks = work.relations
    .map((relation) => ({
      relation,
      work: state.works.find((item) => item.id === relation.to_work_id),
    }))
    .filter((item) => item.work)
    .slice(0, 4);

  const quizHtml = renderQuizSection(work, focusQuiz);
  const prevNext = buildPrevNext(work.id);

  elements.detailPanel.className = "panel detail-panel";
  elements.detailPanel.innerHTML = `
    <div class="detail-cover" style="background-image: url('${work.cover}');"></div>
    <div class="detail-head">
      <div class="detail-actions">
        <span class="meta-chip">${work.collection}</span>
        <span class="meta-chip">${work.theme_label}</span>
        <span class="meta-chip">${work.textbook_stage}</span>
      </div>
      <h3>${work.title}</h3>
      <p>${work.author_name} · ${work.dynasty} · ${work.genre}</p>
    </div>

    <div class="detail-actions">
      ${prevNext.prev ? `<button class="button button--ghost" data-nav-id="${prevNext.prev.id}">上一篇 · ${prevNext.prev.title}</button>` : ""}
      ${prevNext.next ? `<button class="button button--ghost" data-nav-id="${prevNext.next.id}">下一篇 · ${prevNext.next.title}</button>` : ""}
    </div>

    <section class="detail-section">
      <h4>原文</h4>
      <div class="poem-block">${escapeHtml(work.original_text)}</div>
    </section>

    <section class="detail-section">
      <h4>白话理解</h4>
      <div class="translation-block">${escapeHtml(work.translation_text || "原型阶段暂未补入这篇的译文。")}</div>
    </section>

    <section class="detail-section author-card">
      <h4>作者卡片</h4>
      <p>${work.author_summary}</p>
      <div class="tag-row">${work.historical_refs.map((item) => `<span class="tag">${item}</span>`).join("")}</div>
    </section>

    <section class="detail-section">
      <h4>创作背景</h4>
      <p>${work.background_text}</p>
    </section>

    <section class="detail-section">
      <h4>学习提示</h4>
      <p>${work.appreciation_text}</p>
    </section>

    <section class="detail-section">
      <h4>相关推荐</h4>
      ${relatedWorks.length
        ? `<ul class="related-list">${relatedWorks
            .map(
              ({ relation, work: related }) =>
                `<li><a class="related-link" href="#" data-related-id="${related.id}">${related.title}</a> · ${related.author_name} · ${relation.relation_type}</li>`
            )
            .join("")}</ul>`
        : `<p>这篇作品的相关推荐还在补全中。</p>`}
    </section>

    ${quizHtml}

    <section class="detail-section">
      <h4>数据来源</h4>
      <ul class="source-list">
        <li>原文来源：${work.source_name}</li>
        <li>专题归档：${work.source_collection}</li>
        <li><a class="related-link" href="${work.source_url}" target="_blank" rel="noreferrer">查看源文件路径</a></li>
      </ul>
    </section>
  `;

  document.querySelectorAll("[data-nav-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeWorkId = button.dataset.navId;
      renderDetail();
    });
  });

  document.querySelectorAll("[data-related-id]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      state.activeWorkId = link.dataset.relatedId;
      renderDetail();
    });
  });

  bindQuizEvents(work);
}

function buildPrevNext(activeId) {
  const list = state.filteredWorks.length ? state.filteredWorks : state.works;
  const index = list.findIndex((item) => item.id === activeId);
  return {
    prev: index > 0 ? list[index - 1] : null,
    next: index >= 0 && index < list.length - 1 ? list[index + 1] : null,
  };
}

function renderQuizSection(work, focusQuiz) {
  const quizzes = work.quizzes;
  return `
    <section class="detail-section" id="quizSection">
      <h4>学习小练习</h4>
      <p class="quiz-feedback">每篇原型先放 3 道题，答对后触发庆祝反馈，后面可以扩展成闯关、积分和错题本。</p>
      <div class="quiz-grid">
        ${quizzes
          .map((quiz, index) => {
            const selected = state.quizSelections[quiz.id];
            return `
              <article class="quiz-card">
                <span class="quiz-chip">第 ${index + 1} 题</span>
                <div class="quiz-stem">${quiz.stem}</div>
                <div class="quiz-options">
                  ${quiz.options
                    .map((option) => {
                      const selectedClass = selected === option ? "is-selected" : "";
                      return `<button class="quiz-option ${selectedClass}" data-quiz-id="${quiz.id}" data-option="${option}">${option}</button>`;
                    })
                    .join("")}
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
      <div class="quiz-submit-row">
        <button class="button button--primary" id="submitQuizBtn">提交并领奖励</button>
        <div id="quizFeedback" class="quiz-feedback">${focusQuiz ? "已为你定位到练习区，选完答案后直接提交。" : ""}</div>
      </div>
    </section>
  `;
}

function bindQuizEvents(work) {
  document.querySelectorAll(".quiz-option").forEach((button) => {
    button.addEventListener("click", () => {
      state.quizSelections[button.dataset.quizId] = button.dataset.option;
      renderDetail(true);
      document.getElementById("quizSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const submitButton = document.getElementById("submitQuizBtn");
  const feedback = document.getElementById("quizFeedback");
  if (!submitButton || !feedback) return;

  submitButton.addEventListener("click", () => {
    let correctCount = 0;
    work.quizzes.forEach((quiz) => {
      const answer = state.quizSelections[quiz.id];
      const options = document.querySelectorAll(`[data-quiz-id='${quiz.id}']`);
      options.forEach((optionButton) => {
        optionButton.classList.remove("is-correct", "is-wrong");
        if (optionButton.dataset.option === quiz.answer) {
          optionButton.classList.add("is-correct");
        }
        if (answer && optionButton.dataset.option === answer && answer !== quiz.answer) {
          optionButton.classList.add("is-wrong");
        }
      });
      if (answer === quiz.answer) {
        correctCount += 1;
      }
    });

    feedback.textContent = `本次答对 ${correctCount} / ${work.quizzes.length} 题。${correctCount === work.quizzes.length ? "已点亮学习徽章！" : "再试一次也没关系，正确答案已经高亮。"}`;
    if (correctCount === work.quizzes.length) {
      elements.celebrationText.textContent = `《${work.title}》闯关完成，已解锁“${work.theme_label}”徽章。`;
      elements.celebration.classList.remove("hidden");
      elements.celebration.setAttribute("aria-hidden", "false");
    }
  });
}

function closeCelebration() {
  elements.celebration.classList.add("hidden");
  elements.celebration.setAttribute("aria-hidden", "true");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "<br />");
}

init().catch((error) => {
  console.error(error);
  elements.detailPanel.className = "panel detail-panel empty-state";
  elements.detailPanel.innerHTML = `
    <div class="empty-state__icon">!</div>
    <h3>数据加载失败</h3>
    <p>请确认在 classics-learning-platform 根目录启动本地静态服务，并访问 /apps/web/index.html。</p>
  `;
});
