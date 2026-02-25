/* ai-assets_new.js
   Prepared for future Supabase integration.
   Demo state uses localStorage only.
*/
(function () {
  "use strict";

  const $id = (id) => document.getElementById(id);

  const CONFIG = {
    V1: { id: "V1", ratePct: 1.71, clicksPerDay: 3, runSeconds: 10 },
    V2: { id: "V2", ratePct: 2.23, clicksPerDay: 4, runSeconds: 13 },
    cooldownMs: 24 * 60 * 60 * 1000,
    keys: {
      profile: "profile_demo",
      aiRuntime: "ai_assets_runtime_demo",
      myassetsActivity: "activity_demo"
    }
  };

  function now() { return Date.now(); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function to2(n) { return (Number.isFinite(n) ? n : 0).toFixed(2); }

  function safeParse(raw, fallback) {
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }

  function readStore(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return safeParse(raw, fallback);
  }

  function writeStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureProfile() {
    const p0 = readStore(CONFIG.keys.profile, null);
    if (!p0 || typeof p0 !== "object") {
      writeStore(CONFIG.keys.profile, { balance: 0, level: "V0", frozen: false });
      return;
    }
    const next = {
      balance: Number.isFinite(Number(p0.balance)) ? Number(p0.balance) : 0,
      level: typeof p0.level === "string" ? p0.level : "V0",
      frozen: Boolean(p0.frozen)
    };
    writeStore(CONFIG.keys.profile, next);
  }

  function getProfile() {
    return readStore(CONFIG.keys.profile, { balance: 0, level: "V0", frozen: false });
  }

  function setProfile(p) {
    writeStore(CONFIG.keys.profile, p);
  }

  function ensureRuntime() {
    const rt0 = readStore(CONFIG.keys.aiRuntime, null);
    if (!rt0 || typeof rt0 !== "object") {
      writeStore(CONFIG.keys.aiRuntime, {
        windowStartAt: 0,
        nextAt: 0,
        clicksUsed: 0,
        clicksTotal: 0,
        profitToday: 0,
        profitTotal: 0,
        activeLevel: "",
        lastProfit: 0
      });
      return;
    }
    const next = {
      windowStartAt: Number(rt0.windowStartAt) || 0,
      nextAt: Number(rt0.nextAt) || 0,
      clicksUsed: Number(rt0.clicksUsed) || 0,
      clicksTotal: Number(rt0.clicksTotal) || 0,
      profitToday: Number(rt0.profitToday) || 0,
      profitTotal: Number(rt0.profitTotal) || 0,
      activeLevel: typeof rt0.activeLevel === "string" ? rt0.activeLevel : "",
      lastProfit: Number(rt0.lastProfit) || 0
    };
    writeStore(CONFIG.keys.aiRuntime, next);
  }

  function getRuntime() {
    return readStore(CONFIG.keys.aiRuntime, {
      windowStartAt: 0,
      nextAt: 0,
      clicksUsed: 0,
      clicksTotal: 0,
      profitToday: 0,
      profitTotal: 0,
      activeLevel: "",
      lastProfit: 0
    });
  }

  function setRuntime(rt) {
    writeStore(CONFIG.keys.aiRuntime, rt);
  }

  function ensureMyassetsActivity() {
    const a0 = readStore(CONFIG.keys.myassetsActivity, null);
    if (!a0 || typeof a0 !== "object") {
      writeStore(CONFIG.keys.myassetsActivity, {
        today: 0,
        total: 0,
        networkToday: 0,
        networkTotal: 0,
        lastUpdatedAt: 0
      });
    }
  }

  function getMyassetsActivity() {
    return readStore(CONFIG.keys.myassetsActivity, {
      today: 0,
      total: 0,
      networkToday: 0,
      networkTotal: 0,
      lastUpdatedAt: 0
    });
  }

  function setMyassetsActivity(a) {
    writeStore(CONFIG.keys.myassetsActivity, a);
  }

  function msLeft(rt) {
    if (!rt.windowStartAt) return 0;
    return Math.max(0, (rt.windowStartAt + CONFIG.cooldownMs) - now());
  }

  function formatDuration(ms) {
    if (ms <= 0) return "Ready";
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return hh + ":" + mm + ":" + ss;
  }

  function getLevelConfig(levelId) {
    return levelId === "V2" ? CONFIG.V2 : CONFIG.V1;
  }

  function isLevelAllowed(levelId) {
    return levelId === "V1" || levelId === "V2";
  }

  function currentEarnLevel(profile) {
    if (profile.frozen) return null;
    if (profile.level === "V2") return "V2";
    if (profile.level === "V1") return "V1";
    return null;
  }

  function calcDailyTotalProfit(balance, ratePct) {
    return Math.max(0, balance * (ratePct / 100));
  }

  function getDailyPerClick(balance, levelCfg) {
    const total = calcDailyTotalProfit(balance, levelCfg.ratePct);
    const per = total / levelCfg.clicksPerDay;
    return { total, per };
  }

  function showToast(msg) {
    const t = $id("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2200);
  }

  function openModal() {
    const m = $id("modal");
    const b = $id("modalBackdrop");
    if (m) { m.classList.add("open"); m.setAttribute("aria-hidden", "false"); }
    if (b) { b.classList.add("open"); b.setAttribute("aria-hidden", "false"); }
  }

  function closeModal() {
    const m = $id("modal");
    const b = $id("modalBackdrop");
    if (m) { m.classList.remove("open"); m.setAttribute("aria-hidden", "true"); }
    if (b) { b.classList.remove("open"); b.setAttribute("aria-hidden", "true"); }
  }

  function setText(id, text) {
    const el = $id(id);
    if (el) el.textContent = text;
  }

  function setStatus(card, statusKind, text) {
    if (!card) return;
    const st = card.querySelector(".status");
    if (!st) return;
    st.className = "status " + statusKind;
    st.textContent = text;
  }

  function findCardByLevel(levelId) {
    const cards = Array.from(document.querySelectorAll(".level-card"));
    for (const c of cards) {
      const details = c.querySelector(".details");
      if (!details) continue;
      const txt = details.textContent || "";
      if (txt.includes("Level: " + levelId)) return c;
    }
    return null;
  }

  function syncCards(profile, rt) {
    const allowed = currentEarnLevel(profile);
    const cooldownLeft = msLeft(rt);

    const cardV1 = findCardByLevel("V1");
    const cardV2 = findCardByLevel("V2");

    if (cardV1) setStatus(cardV1, "locked", "Locked");
    if (cardV2) setStatus(cardV2, "locked", "Locked");

    Array.from(document.querySelectorAll('button[data-action="coming"]')).forEach((btn) => {
      btn.addEventListener("click", () => showToast("This level is not open."));
    });

    if (profile.frozen) return;

    if (allowed === "V1") {
      if (cardV1) setStatus(cardV1, "unlocked", cooldownLeft > 0 ? "Cooldown" : "Unlocked");
      if (cardV2) setStatus(cardV2, "locked", "Locked");
      return;
    }

    if (allowed === "V2") {
      if (cardV2) setStatus(cardV2, "unlocked", cooldownLeft > 0 ? "Cooldown" : "Unlocked");
      if (cardV1) setStatus(cardV1, "locked", "Locked");
    }
  }

  function updateTopStats(profile, rt) {
    const allowed = currentEarnLevel(profile);
    const cooldownLeft = msLeft(rt);

    const totalRunsEl = $id("totalRuns");
    const runsLeftEl = $id("runsLeft");

    const cfg = allowed ? getLevelConfig(allowed) : null;

    const totalRunsPerDay = cfg ? String(cfg.clicksPerDay) : "0";
    const remaining = cfg ? String(Math.max(0, cfg.clicksPerDay - rt.clicksUsed)) : "0";

    if (totalRunsEl) totalRunsEl.textContent = totalRunsPerDay;
    if (runsLeftEl) runsLeftEl.textContent = (allowed && cooldownLeft === 0) ? remaining : "0";
  }

  function setLockNote(text) {
    const box = $id("lockNote");
    if (!box) return;
    if (!text) {
      box.hidden = true;
      setText("lockNoteText", "");
      return;
    }
    box.hidden = false;
    setText("lockNoteText", text);
  }

  function resetModalUI(levelCfg) {
    const fill = $id("progressFill");
    if (fill) fill.style.width = "0%";
    setText("progressLabel", "Ready");
    setText("timeLeft", levelCfg.runSeconds + "s");
    setText("profitValue", "0.00");
    setText("resultSub", "Press Run to generate profit.");
    const claimBtn = $id("claimBtn");
    if (claimBtn) claimBtn.disabled = true;

    Array.from(document.querySelectorAll("#steps .step")).forEach((el) => {
      el.classList.remove("active");
      el.classList.remove("done");
    });

    setLockNote("");
  }

  async function animateRun(levelCfg, perClickProfit) {
    const steps = Array.from(document.querySelectorAll("#steps .step"));
    const phases = [
      { label: "Initializing GPU cores...", stepIndex: 0, pct: 18 },
      { label: "Loading market data...", stepIndex: 1, pct: 38 },
      { label: "Running AI prediction model...", stepIndex: 2, pct: 60 },
      { label: "Optimizing execution...", stepIndex: 3, pct: 82 },
      { label: "Generating profit...", stepIndex: 4, pct: 100 }
    ];

    const seconds = levelCfg.runSeconds;
    const startAt = now();

    for (let tick = 0; tick < seconds; tick++) {
      const elapsed = Math.floor((now() - startAt) / 1000);
      const remaining = clamp(seconds - elapsed, 0, seconds);
      setText("timeLeft", remaining + "s");

      const progress = clamp(((elapsed + 1) / seconds) * 100, 0, 100);
      const phase = phases.find((p) => progress <= p.pct) || phases[phases.length - 1];

      setText("progressLabel", phase.label);
      const fill = $id("progressFill");
      if (fill) fill.style.width = progress + "%";

      steps.forEach((el, idx) => {
        el.classList.remove("active");
        if (idx < phase.stepIndex) el.classList.add("done");
        else el.classList.remove("done");
        if (idx === phase.stepIndex) el.classList.add("active");
      });

      await new Promise((r) => setTimeout(r, 1000));
    }

    steps.forEach((el) => { el.classList.remove("active"); el.classList.add("done"); });
    setText("progressLabel", "Completed");
    setText("timeLeft", "0s");
    const fill = $id("progressFill");
    if (fill) fill.style.width = "100%";

    setText("profitValue", to2(perClickProfit));
  }

  function ensureSameLevelWindow(rt, levelId) {
    if (rt.activeLevel && rt.activeLevel !== levelId) {
      rt.windowStartAt = 0;
      rt.nextAt = 0;
      rt.clicksUsed = 0;
      rt.profitToday = 0;
      rt.activeLevel = "";
      rt.lastProfit = 0;
    }
    return rt;
  }

  function startOrResetWindow(rt, levelId) {
    const left = msLeft(rt);
    if (left === 0) {
      rt.windowStartAt = now();
      rt.nextAt = rt.windowStartAt + CONFIG.cooldownMs;
      rt.clicksUsed = 0;
      rt.profitToday = 0;
      rt.activeLevel = levelId;
      rt.lastProfit = 0;
    }
    return rt;
  }

  async function openSession(levelId) {
    ensureProfile();
    ensureRuntime();
    ensureMyassetsActivity();

    const profile = getProfile();
    const rt0 = getRuntime();
    const allowed = currentEarnLevel(profile);

    const cfg = getLevelConfig(levelId);
    setText("modalTitle", levelId + " session");
    setText("runTimeText", cfg.runSeconds + " seconds");
    setText("rateText", cfg.ratePct.toFixed(2) + "%");
    setText("modalBalance", to2(profile.balance));

    resetModalUI(cfg);

    if (!allowed) {
      setLockNote("Your account level is not eligible to earn.");
      const startBtn = $id("startBtn");
      if (startBtn) startBtn.disabled = true;
      openModal();
      return;
    }

    if (allowed !== levelId) {
      setLockNote("This level is not available for your current account level.");
      const startBtn = $id("startBtn");
      if (startBtn) startBtn.disabled = true;
      openModal();
      return;
    }

    const rt = ensureSameLevelWindow({ ...rt0 }, levelId);
    const cooldownLeft = msLeft(rt);

    if (cooldownLeft > 0 && rt.clicksUsed >= cfg.clicksPerDay) {
      setLockNote("You already ran today. Next run in " + formatDuration(cooldownLeft) + ".");
      const startBtn = $id("startBtn");
      if (startBtn) startBtn.disabled = true;
      openModal();
      return;
    }

    const startBtn = $id("startBtn");
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.dataset.level = levelId;
    }

    const claimBtn = $id("claimBtn");
    if (claimBtn) claimBtn.disabled = true;

    openModal();
  }

  async function runOnce(levelId) {
    ensureProfile();
    ensureRuntime();
    ensureMyassetsActivity();

    const profile0 = getProfile();
    const allowed = currentEarnLevel(profile0);
    const startBtn = $id("startBtn");
    const claimBtn = $id("claimBtn");

    if (!allowed || allowed !== levelId) {
      setLockNote("Not eligible.");
      if (startBtn) startBtn.disabled = true;
      return;
    }

    let rt = getRuntime();
    rt = ensureSameLevelWindow(rt, levelId);

    const cfg = getLevelConfig(levelId);
    rt = startOrResetWindow(rt, levelId);

    const cooldownLeft = msLeft(rt);
    if (cooldownLeft > 0 && rt.clicksUsed >= cfg.clicksPerDay) {
      setLockNote("You already ran today. Next run in " + formatDuration(cooldownLeft) + ".");
      if (startBtn) startBtn.disabled = true;
      return;
    }

    if (rt.clicksUsed >= cfg.clicksPerDay) {
      rt.clicksUsed = 0;
      rt.profitToday = 0;
    }

    const per = getDailyPerClick(profile0.balance, cfg).per;

    if (startBtn) startBtn.disabled = true;
    if (claimBtn) claimBtn.disabled = true;
    setLockNote("");

    await animateRun(cfg, per);

    const profile1 = getProfile();
    setProfile({ ...profile1, balance: Number(profile1.balance) + per });

    rt.clicksUsed += 1;
    rt.clicksTotal += 1;
    rt.profitToday = Number(rt.profitToday) + per;
    rt.profitTotal = Number(rt.profitTotal) + per;
    rt.lastProfit = per;
    setRuntime(rt);

    const act0 = getMyassetsActivity();
    setMyassetsActivity({
      ...act0,
      today: Number(act0.today) + per,
      total: Number(act0.total) + per,
      lastUpdatedAt: now()
    });

    setText("resultSub", "Profit added to balance.");

    const leftAfter = msLeft(rt);
    if (rt.clicksUsed >= cfg.clicksPerDay) {
      showToast("Completed: " + cfg.clicksPerDay + "/" + cfg.clicksPerDay + ". Next in " + formatDuration(leftAfter) + ".");
    } else {
      showToast("Run " + rt.clicksUsed + "/" + cfg.clicksPerDay + " completed.");
    }

    if (startBtn) startBtn.disabled = false;

    await refreshUI();
  }

  async function refreshUI() {
    ensureProfile();
    ensureRuntime();
    ensureMyassetsActivity();

    const profile = getProfile();
    const rt = getRuntime();

    syncCards(profile, rt);
    updateTopStats(profile, rt);
    setText("modalBalance", to2(profile.balance));
  }

  function bind() {
    Array.from(document.querySelectorAll('button[data-action="unlock"]')).forEach((btn) => {
      const levelId = btn.getAttribute("data-level") || "";
      btn.addEventListener("click", async () => {
        if (!isLevelAllowed(levelId)) {
          showToast("This level is not open.");
          return;
        }
        await openSession(levelId);
      });
    });

    const closeBtn = $id("closeModal");
    const backdrop = $id("modalBackdrop");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (backdrop) backdrop.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    const startBtn = $id("startBtn");
    if (startBtn) {
      startBtn.addEventListener("click", async () => {
        const levelId = startBtn.dataset.level || "V1";
        await runOnce(levelId);
      });
    }

    const claimBtn = $id("claimBtn");
    if (claimBtn) {
      claimBtn.addEventListener("click", () => {
        showToast("Profit is credited automatically after each run.");
      });
    }

    const setBalanceBtn = $id("setBalanceBtn");
    if (setBalanceBtn) {
      setBalanceBtn.addEventListener("click", () => {
        const p0 = getProfile();
        const v = prompt("Set demo balance (USDT):", String(p0.balance));
        if (v === null) return;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) {
          showToast("Invalid balance.");
          return;
        }
        setProfile({ ...p0, balance: n });
        showToast("Balance updated.");
        refreshUI();
      });
    }

    const back = document.querySelector(".back-btn");
    if (back) {
      back.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "myassets.html";
      });
    }

    setInterval(refreshUI, 1000);

    window.addEventListener("storage", (e) => {
      if (!e) return;
      if (e.key === CONFIG.keys.profile || e.key === CONFIG.keys.aiRuntime) refreshUI();
    });
  }

  function init() {
    ensureProfile();
    ensureRuntime();
    ensureMyassetsActivity();
    refreshUI();
    bind();

    const profile = getProfile();
    if (profile.frozen) showToast("Account locked. Contact support.");
  }

  document.addEventListener("DOMContentLoaded", init);
})();