// PROTOTYPE — standalone full-screen chat surface with in-memory data.
const root = document.querySelector("#chat-app");
const API_URL = "http://127.0.0.1:8787";

const state = {
  question: "",
  mode: "welcome",
  gapStage: "detected",
  coverage: 20,
  total: 25,
  drawer: null,
  runId: "RUN-1042",
  loading: false,
  apiAnswer: null,
  apiCitations: [],
  apiError: null,
  apiRun: null,
};

const traceSteps = [
  ["Hermes Answerer", "Applied llm-wiki evidence rules", "live"],
  ["File Search", "Searched the immutable source corpus", "live"],
  ["Source Reader", "Fetched exact source lines", "live"],
  ["Citation Validator", "Resolved claim-level evidence", "live"],
];

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}

function citation(file, section, label = "Original source") {
  return `<button class="chat-citation" data-citation="${escapeHtml(file)}">
    <span class="source-glyph">↗</span><span><strong>${escapeHtml(file)}</strong><small>${escapeHtml(section)} · Exact excerpt</small></span><span class="tag">${escapeHtml(label)}</span>
  </button>`;
}

function answer() {
  if (state.mode === "welcome") return "";
  if (state.loading) return `<div class="chat-answer"><div class="answer-meta"><span class="tag">Atlas</span><span>Routing your question</span></div><p><strong>Checking the workspace...</strong></p></div>`;
  if (state.apiError) return `<div class="chat-answer gap-block"><div class="answer-meta"><span class="tag orange">Runtime unavailable</span></div><p><strong>${escapeHtml(state.apiError)}</strong></p></div>`;
  if (state.apiAnswer) {
    const conversational = state.apiAnswer.status === "CONVERSATIONAL";
    const outOfScope = state.apiAnswer.status === "OUT_OF_SCOPE";
    const supported = state.apiAnswer.status === "SUPPORTED" || state.apiAnswer.status === "PARTIALLY_SUPPORTED";
    const citations = state.apiCitations.map(item => citation(item.sourceId, `Lines ${item.startLine}-${item.endLine}`, "Validated source")).join("");
    const label = conversational ? "Atlas" : outOfScope ? "Outside this workspace" : supported ? "Supported answer" : "Safe refusal";
    const detail = conversational || outOfScope ? "No knowledge-base run needed" : `${state.apiCitations.length} valid citation${state.apiCitations.length === 1 ? "" : "s"}`;
    return `<div class="chat-answer ${supported ? "supported-block" : outOfScope ? "gap-block" : ""}">
      <div class="answer-meta"><span class="tag ${outOfScope || (!supported && !conversational) ? "orange" : ""}">${label}</span><span>${detail}</span></div>
      <p><strong>${escapeHtml(state.apiAnswer.answer)}</strong></p>
      ${citations ? `<div class="chat-citations">${citations}</div>` : ""}
    </div>`;
  }
  if (state.mode === "supported") return `<div class="chat-answer supported-block">
    <div class="answer-meta"><span class="tag">✓ Supported answer</span><span>2 claims · 2 valid citations</span></div>
    <p><strong>Employees may work from another country for up to 20 consecutive days with written People Ops approval.</strong></p>
    <p>The employee remains responsible for visa and tax compliance. India and the United States require review before travel.</p>
    <div class="chat-citations">${citation("remote-work-across-borders.md","Duration and approval","Interview-backed")}${citation("remote-work-across-borders.md","Tax and immigration","Interview-backed")}</div>
  </div>`;
  return `<div class="chat-answer gap-block">
    <div class="answer-meta"><span class="tag orange">! Not documented</span><span>Safe refusal · GAP-09</span></div>
    <p><strong>I can’t answer this reliably from the available documents.</strong></p>
    <p>The handbook discusses remote work, but it does not specify a maximum cross-border duration or prohibited countries. I created a documentation gap for the Knowledge Owner.</p>
    <div class="sources-reviewed"><span class="source-glyph">R</span><span><strong>Sources reviewed — not supporting citations</strong><small>people/benefits.md · company/communication.md</small></span><span>2 files</span></div>
  </div>`;
}

function gapWorkflow() {
  if (state.mode === "supported") return `<section class="workflow-card success"><div class="workflow-kicker">Published</div><h3>Remote work across borders</h3><p>Approved, indexed, and validated. Two evaluation cases now pass.</p><button class="btn secondary" data-action="reset">Reset demo</button></section>`;
  if (state.gapStage === "interview") return `<section class="workflow-card"><div class="workflow-kicker">Gap Interview</div><h3>Remote work across borders</h3><label>Maximum duration<input value="20 consecutive days" /></label><label>Required approval<input value="Written People Ops approval" /></label><label>Tax and visa responsibility<textarea>Employee owns compliance; India and US require review.</textarea></label><button class="btn orange" data-action="draft">Generate policy draft</button></section>`;
  if (state.gapStage === "draft") return `<section class="workflow-card"><div class="workflow-kicker">Draft awaiting approval</div><h3>Remote work across borders</h3><p>Employees may work internationally for up to <strong>20 consecutive days</strong> with written People Ops approval.</p><p class="muted">Interview-backed · Owner: People Ops</p><button class="btn" data-action="approve">Approve, index & validate</button></section>`;
  return `<section class="workflow-card"><div class="workflow-kicker">Knowledge gap detected</div><h3>Remote work across borders</h3><p>Two unanswered questions were deduplicated into one gap.</p><button class="btn orange" data-action="interview">Answer Gap Interview</button></section>`;
}

function historyPanel() {
  return `<aside class="chat-history standalone-history">
    <button class="new-chat" data-action="new"><span>＋ New conversation</span><span>⌘K</span></button>
    <div class="history-label">Today</div>
    <button class="history-item active" data-history="country">Cross-border remote work<small>Gap detected · just now</small></button>
    <button class="history-item" data-history="office">Home office equipment<small>Supported · 2 citations</small></button>
    <button class="history-item" data-history="phishing">Reporting phishing<small>Supported · 1 citation</small></button>
    <div class="history-label">Yesterday</div>
    <button class="history-item">Time-off policy<small>Supported · 3 citations</small></button>
    <div class="history-footer"><strong>PostHog public handbook</strong><span>12 documents · indexed 8 min ago</span><button class="text-action">Manage knowledge base ↗</button></div>
  </aside>`;
}

function evidencePanel() {
  const preflight = state.loading && !state.apiRun;
  const skipped = state.apiRun?.skipped;
  const citationList = state.apiCitations.length
    ? state.apiCitations.map(item => `<div class="sources-reviewed"><span class="source-glyph">R</span><span><strong>${escapeHtml(item.sourceId)}</strong><small>Lines ${escapeHtml(item.startLine)}-${escapeHtml(item.endLine)}</small></span><span>valid</span></div>`).join("")
    : `<p class="muted">${preflight ? "Classifying the question before document retrieval." : skipped ? "This message did not require document retrieval." : "Ask a question to inspect its exact source evidence."}</p>`;
  const workflowState = state.loading ? "Routing" : skipped ? "Retrieval skipped" : state.apiAnswer ? state.apiAnswer.status.replaceAll("_", " ") : "Ready";
  const trace = preflight || skipped
    ? `<div class="trace compact-trace"><div class="trace-step"><span class="trace-icon">${skipped ? "✓" : "1"}</span><span><strong>Atlas preflight</strong><p>${skipped ? "Answered without starting Hermes retrieval" : "Determining whether evidence retrieval is needed"}</p></span><span class="trace-cost">${skipped ? "instant" : "routing"}</span></div></div>`
    : `<div class="trace compact-trace">${traceSteps.map((t,i)=>`<div class="trace-step"><span class="trace-icon">${i+1}</span><span><strong>${t[0]}</strong><p>${t[1]}</p></span><span class="trace-cost">${t[2]}</span></div>`).join("")}</div>`;
  return `<aside class="evidence-rail standalone-evidence">
    <div class="rail-head"><h2>Evidence & workflow</h2><button class="icon-btn mobile-only" data-close aria-label="Close evidence">×</button></div>
    <div class="rail-tabs"><button class="rail-tab active">Sources</button><button class="rail-tab">Trace</button></div>
    <div class="rail-body">
      <section class="workflow-card ${state.apiAnswer && !state.apiError ? "success" : ""}"><div class="workflow-kicker">${workflowState}</div><h3>Validated evidence</h3>${citationList}</section>
      <section class="rail-section"><div class="eyebrow">${preflight || skipped ? "Atlas preflight" : `Hermes · ${state.runId}`}</div><h3>Agent trace</h3>${trace}</section>
      <section class="rail-section"><div class="eval-head"><span><small>Corpus</small><strong>12 sources</strong></span><span class="tag">llm-wiki</span></div></section>
    </div>
  </aside>`;
}

function conversation() {
  const conversationTitle = state.mode === "welcome"
    ? "New conversation"
    : state.question.length > 44 ? `${state.question.slice(0, 41)}…` : state.question;
  const userMessage = state.mode === "welcome" ? "" : `<article class="message user-message"><div class="user-bubble">${escapeHtml(state.question)}</div></article>`;
  const assistantMessage = state.mode === "welcome" ? "" : `<article class="message assistant-message"><div class="message-role"><span class="avatar">A</span> Atlas ${state.apiRun && !state.apiRun.skipped ? `<span class="tag">Hermes · ${state.runId}</span>` : ""}</div>${answer()}</article>`;
  const runtimeLabel = state.apiAnswer && !state.apiRun?.skipped ? "Hermes active" : "Atlas online";
  return `<section class="chat-stage standalone-stage">
    <header class="chat-stage-head standalone-conversation-head"><div class="mobile-chat-actions"><button class="icon-btn" data-drawer="history" aria-label="Open conversations">☰</button></div><div class="conversation-title"><h2>${escapeHtml(conversationTitle)}</h2><small>PostHog demo workspace</small></div><div class="head-actions"><span class="pill desktop-status"><span class="status-dot"></span> ${runtimeLabel}</span><button class="icon-btn" data-drawer="evidence" aria-label="Open evidence">◫</button></div></header>
    <div class="chat-scroll standalone-scroll">
      <div class="message assistant-message intro-message"><div class="message-role"><span class="avatar">A</span> Atlas</div><p>Ask me anything about company policies and operations.</p><p class="muted">I answer only from validated evidence. Every factual claim links to its source; undocumented questions become Knowledge Gaps.</p></div>
      ${userMessage}${assistantMessage}
    </div>
    <footer class="chat-compose-wrap standalone-composer"><div class="chat-compose-inner">
      <div class="quick"><button data-question="What can I expense for my home office?">Home office expenses</button><button data-question="How many days can I work from another country?">Cross-border work</button><button data-question="How do I report phishing?">Report phishing</button></div>
      <form class="composer" id="standalone-ask"><textarea id="standalone-question" rows="1" placeholder="Ask a question about your company…">${state.mode === "welcome" ? "" : escapeHtml(state.question)}</textarea><button class="btn" aria-label="Send question">↑</button></form>
      <div class="composer-note">No evidence, no answer · Atlas can make mistakes only by refusing, never by inventing policy</div>
    </div></footer>
  </section>`;
}

function render() {
  root.innerHTML = `<div class="standalone-chat ${state.drawer ? `drawer-${state.drawer}` : ""}">
    <header class="chat-global-header"><a class="brand" href="./index.html"><span class="brand-mark">A</span><span>Atlas<small>Knowledge Base Agency</small></span></a><div class="workspace-name">PostHog demo <span>/</span> Team Q&A</div><div class="top-actions"><span class="pill"><span class="status-dot"></span> 12 docs indexed</span><button class="user-chip">AS</button></div></header>
    <main class="standalone-layout">${historyPanel()}${conversation()}${evidencePanel()}</main>
    <button class="drawer-overlay" data-close aria-label="Close panel"></button>
  </div>`;
  bind();
}

async function ask(question) {
  state.question = question.trim();
  if (!state.question) return;
  state.mode = "supported";
  state.runId = `RUN-${Math.floor(1043 + Math.random()*20)}`;
  state.drawer = null;
  state.loading = true;
  state.apiAnswer = null;
  state.apiCitations = [];
  state.apiError = null;
  state.apiRun = null;
  render();
  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: state.question }),
    });
    const result = await response.json();
    state.apiAnswer = result.answer;
    state.apiCitations = result.citations ?? [];
    state.apiRun = result.run ?? null;
    state.mode = result.run?.skipped ? "direct" : result.decision?.publishable ? "supported" : "gap";
    state.runId = result.run?.skipped ? "" : `HERMES-${Math.round(result.run?.durationMs ?? 0)}`;
    if (!response.ok && result.decision?.reason) state.apiError = result.decision.reason;
  } catch (error) {
    state.mode = "gap";
    state.apiError = error instanceof Error ? error.message : "Hermes runtime unavailable";
  } finally {
    state.loading = false;
    render();
  }
}

function bind() {
  root.querySelector("#standalone-ask")?.addEventListener("submit", event => { event.preventDefault(); ask(root.querySelector("#standalone-question").value); });
  root.querySelectorAll("[data-question]").forEach(button => button.onclick = () => ask(button.dataset.question));
  root.querySelectorAll("[data-drawer]").forEach(button => button.onclick = () => { state.drawer = button.dataset.drawer; render(); });
  root.querySelectorAll("[data-close]").forEach(button => button.onclick = () => { state.drawer = null; render(); });
  root.querySelectorAll("[data-history]").forEach(button => button.onclick = () => {
    const questions = {country:"How many days can I work from another country?",office:"What can I expense for my home office?",phishing:"How do I report phishing?"};
    ask(questions[button.dataset.history]);
  });
  root.querySelectorAll("[data-action]").forEach(button => button.onclick = () => {
    const action = button.dataset.action;
    if (action === "new") { state.mode="welcome"; state.question=""; state.drawer=null; }
    if (action === "interview") state.gapStage="interview";
    if (action === "draft") state.gapStage="draft";
    if (action === "approve") { state.gapStage="published"; state.mode="supported"; state.coverage=22; }
    if (action === "reset") { state.gapStage="detected"; state.mode="gap"; state.coverage=20; }
    render();
  });
}

render();
