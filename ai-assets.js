(function () {
  const $ = (sel) => document.getElementById(sel);

  const CONFIG = {
    V1: { id: "V1", ratePct: 1.73, runSeconds: 10, unlockBalance: 50 },
    V2: { id: "V2", ratePct: 2.23, runSeconds: 13, unlockBalance: 500 },
    cooldownMs: 24 * 60 * 60 * 1000,
    storageKey: "ai_levels_runtime"
  };

  const api = {
    async getUser() {
      return window.AI_USER ? { ...window.AI_USER } : { userId: "demo", balance: 0 };
    },
    async claim(payload) {
      if (typeof window.AI_CLAIM === "function") {
        return await window.AI_CLAIM(payload);
      }
      return { ok: true, serverTime: Date.now() };
    }
  };

  const store = {
    read() {
      try {
        const raw = localStorage.getItem(CONFIG.storageKey);
        if (!raw) return { lastRunAt: 0, pendingProfit: 0, pendingLevel: "", canClaim: false };
        const v = JSON.parse(raw);
        return { lastRunAt: 0, pendingProfit: 0, pendingLevel: "", canClaim: false, ...v };
      } catch {
        return { lastRunAt: 0, pendingProfit: 0, pendingLevel: "", canClaim: false };
      }
    },
    write(next) {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(next));
    },
    reset() {
      localStorage.removeItem(CONFIG.storageKey);
    }
  };

  function now() { return Date.now(); }
  function format2(n) { return (Number.isFinite(n) ? n : 0).toFixed(2); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function msUntilNextRun(lastRunAt) {
    if (!lastRunAt) return 0;
    return Math.max(0, (lastRunAt + CONFIG.cooldownMs) - now());
  }

  function formatDuration(ms) {
    if (ms <= 0) return "Ready";
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return hh + ":" + mm + ":" + ss;
  }

  function getCurrentLevel(balance) {
    if (balance >= CONFIG.V2.unlockBalance) return CONFIG.V2;
    if (balance >= CONFIG.V1.unlockBalance) return CONFIG.V1;
    return null;
  }

  function setText(id, t) {
    const el = $(id);
    if (el) el.textContent = t;
  }

  function setDailyProgress(msLeft) {
    const bar = $("dailyProgress");
    if (!bar) return;
    const pct = msLeft <= 0 ? 100 : clamp(((CONFIG.cooldownMs - msLeft) / CONFIG.cooldownMs) * 100, 0, 100);
    bar.style.width = pct.toFixed(1) + "%";
  }

  function setStatus(el, kind, text) {
    if (!el) return;
    el.className = "status " + kind;
    el.textContent = text;
  }

  function openModal() {
    $("modal").classList.add("open");
    $("modalBackdrop").classList.add("open");
    $("modal").setAttribute("aria-hidden", "false");
    $("modalBackdrop").setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    $("modal").classList.remove("open");
    $("modalBackdrop").classList.remove("open");
    $("modal").setAttribute("aria-hidden", "true");
    $("modalBackdrop").setAttribute("aria-hidden", "true");
  }

  function resetModalUI(level) {
    $("progressFill").style.width = "0%";
    setText("progressLabel", "Ready");
    setText("timeLeft", level.runSeconds + "s");
    setText("profitValue", "0.00");
    setText("resultSub", "Start the session to calculate profit.");
    $("claimBtn").disabled = true;

    const steps = Array.from(document.querySelectorAll("#steps .step"));
    steps.forEach((el) => { el.classList.remove("active"); el.classList.remove("done"); });

    $("lockNote").hidden = true;
    setText("lockNoteText", "");
  }

  async function prepareModal(levelId) {
    const user = await api.getUser();
    const runtime = store.read();

    const level = levelId === "V2" ? CONFIG.V2 : CONFIG.V1;
    const currentLevel = getCurrentLevel(user.balance);
    const cooldownLeft = msUntilNextRun(runtime.lastRunAt);

    setText("modalTitle", levelId + " session");
    setText("runTimeText", level.runSeconds + " seconds");
    setText("rateText", level.ratePct.toFixed(2) + "%");
    setText("modalBalance", format2(user.balance));

    resetModalUI(level);

    const eligible = currentLevel && currentLevel.id === level.id;
    const canRun = eligible && cooldownLeft === 0;

    if (!eligible) {
      $("lockNote").hidden = false;
      setText("lockNoteText", "This level is not available for your current balance.");
      $("startBtn").disabled = true;
    } else if (!canRun) {
      $("lockNote").hidden = false;
      setText("lockNoteText", "You already ran today. Next run in " + formatDuration(cooldownLeft) + ".");
      $("startBtn").disabled = true;
    } else {
      $("startBtn").disabled = false;
    }

    $("startBtn").dataset.level = level.id;
    $("claimBtn").dataset.level = level.id;

    openModal();
  }

  function calcProfit(balance, ratePct) {
    return Math.max(0, balance * (ratePct / 100));
  }

  function animateNumber(el, from, to, durationMs) {
    return new Promise((resolve) => {
      const start = performance.now();
      const step = (t) => {
        const p = clamp((t - start) / durationMs, 0, 1);
        const v = from + (to - from) * (1 - Math.pow(1 - p, 3));
        el.textContent = format2(v);
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  async function runSession(levelId) {
    const user = await api.getUser();
    const runtime0 = store.read();

    const level = levelId === "V2" ? CONFIG.V2 : CONFIG.V1;
    const currentLevel = getCurrentLevel(user.balance);
    const cooldownLeft = msUntilNextRun(runtime0.lastRunAt);

    if (!currentLevel || currentLevel.id !== level.id) {
      $("lockNote").hidden = false;
      setText("lockNoteText", "This level is not available for your current balance.");
      return;
    }
    if (cooldownLeft > 0) {
      $("lockNote").hidden = false;
      setText("lockNoteText", "You already ran today. Next run in " + formatDuration(cooldownLeft) + ".");
      return;
    }

    $("startBtn").disabled = true;
    $("claimBtn").disabled = true;
    $("lockNote").hidden = true;

    const steps = Array.from(document.querySelectorAll("#steps .step"));
    const phases = [
      { label: "Initializing GPU cores...", stepIndex: 0, pct: 18 },
      { label: "Loading market data...", stepIndex: 1, pct: 38 },
      { label: "Running AI prediction model...", stepIndex: 2, pct: 60 },
      { label: "Optimizing execution...", stepIndex: 3, pct: 82 },
      { label: "Generating profit...", stepIndex: 4, pct: 100 }
    ];

    const profit = calcProfit(user.balance, level.ratePct);
    const seconds = level.runSeconds;

    const startAt = now();
    for (let tick = 0; tick < seconds; tick++) {
      const elapsed = Math.floor((now() - startAt) / 1000);
      const remaining = clamp(seconds - elapsed, 0, seconds);
      setText("timeLeft", remaining + "s");

      const progress = clamp(((elapsed + 1) / seconds) * 100, 0, 100);
      const phase = phases.find((p) => progress <= p.pct) || phases[phases.length - 1];

      setText("progressLabel", phase.label);
      $("progressFill").style.width = progress + "%";

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
    $("progressFill").style.width = "100%";

    setText("resultSub", "Profit calculated. You can claim it now.");
    await animateNumber($("profitValue"), 0, profit, 650);

    const runtime1 = store.read();
    runtime1.pendingProfit = profit;
    runtime1.pendingLevel = level.id;
    runtime1.canClaim = true;
    store.write(runtime1);

    $("claimBtn").disabled = false;
  }

  async function claim() {
    const user = await api.getUser();
    const rt0 = store.read();
    if (!rt0.canClaim || rt0.pendingProfit <= 0 || !rt0.pendingLevel) return;

    const payload = {
      level: rt0.pendingLevel,
      profit: rt0.pendingProfit,
      balance: user.balance,
      clientTime: Date.now()
    };

    const res = await api.claim(payload);
    if (!res || !res.ok) {
      $("lockNote").hidden = false;
      setText("lockNoteText", "Claim failed. Try again.");
      return;
    }

    const rt1 = store.read();
    rt1.lastRunAt = Date.now();
    rt1.canClaim = false;
    rt1.pendingProfit = 0;
    rt1.pendingLevel = "";
    store.write(rt1);

    $("claimBtn").disabled = true;
    setText("resultSub", "Claimed. Next run available after 24 hours.");
    await refresh();
  }

  async function refresh() {
    const user = await api.getUser();
    const rt = store.read();

    const currentLevel = getCurrentLevel(user.balance);
    const cooldownLeft = msUntilNextRun(rt.lastRunAt);

    const totalRuns = $("totalRuns");
    if (totalRuns) totalRuns.textContent = "1";

    const runsLeft = $("runsLeft");
    if (runsLeft) runsLeft.textContent = cooldownLeft > 0 ? "0" : "1";

    setDailyProgress(cooldownLeft);

    const statusV1 = $("statusV1");
    const statusV2 = $("statusV2");
    const btnV1 = $("btnV1");
    const btnV2 = $("btnV2");
    const cardV1 = $("cardV1");

    const hasV1 = user.balance >= CONFIG.V1.unlockBalance;
    const hasV2 = user.balance >= CONFIG.V2.unlockBalance;

    if (currentLevel && currentLevel.id === "V2" && cardV1) cardV1.style.display = "none";
    if (!currentLevel || currentLevel.id !== "V2") {
      if (cardV1) cardV1.style.display = "";
    }

    if (!hasV1) {
      setStatus(statusV1, "locked", "Locked");
      if (btnV1) { btnV1.disabled = true; btnV1.textContent = "Locked"; }
    } else if (currentLevel && currentLevel.id === "V1") {
      setStatus(statusV1, cooldownLeft > 0 ? "unlocked" : "unlocked", cooldownLeft > 0 ? "Cooldown" : "Unlocked");
      if (btnV1) { btnV1.disabled = false; btnV1.textContent = "Unlock Now"; }
    } else {
      if (currentLevel && currentLevel.id === "V2") {
        if (btnV1) { btnV1.disabled = true; btnV1.textContent = "Locked"; }
        setStatus(statusV1, "locked", "Locked");
      }
    }

    if (!hasV2) {
      setStatus(statusV2, "locked", "Locked");
      if (btnV2) { btnV2.disabled = true; btnV2.textContent = "Locked"; }
    } else if (currentLevel && currentLevel.id === "V2") {
      setStatus(statusV2, cooldownLeft > 0 ? "unlocked" : "unlocked", cooldownLeft > 0 ? "Cooldown" : "Unlocked");
      if (btnV2) { btnV2.disabled = false; btnV2.textContent = "Unlock Now"; }
    }

    const balEl = document.querySelector(".stat-card .value#runsLeft") ? null : null;
    const headerBalance = document.querySelector(".wallet-balance");
    const maybe = document.getElementById("balanceValue");
    if (maybe) maybe.textContent = format2(user.balance);

    const openToday = $("openToday");
    if (openToday) {
      openToday.disabled = !currentLevel || cooldownLeft > 0;
    }

    const note = $("openToday");
    return { user, currentLevel, cooldownLeft };
  }

  function bind() {
    const btnV1 = $("btnV1");
    const btnV2 = $("btnV2");

    if (btnV1) btnV1.addEventListener("click", () => prepareModal("V1"));
    if (btnV2) btnV2.addEventListener("click", () => prepareModal("V2"));

    const openToday = $("openToday");
    if (openToday) openToday.addEventListener("click", async () => {
      const { currentLevel } = await refresh();
      if (!currentLevel) return;
      await prepareModal(currentLevel.id);
    });

    $("closeModal").addEventListener("click", closeModal);
    $("modalBackdrop").addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    $("startBtn").addEventListener("click", async () => {
      const level = $("startBtn").dataset.level || "V1";
      await runSession(level);
    });

    $("claimBtn").addEventListener("click", claim);

    setInterval(refresh, 1000);
  }

  window.AILevels = {
    async init(options) {
      if (options && typeof options.getUser === "function") api.getUser = options.getUser;
      if (options && typeof options.claim === "function") api.claim = options.claim;
      await refresh();
    },
    reset() { store.reset(); },
    refresh
  };

  document.addEventListener("DOMContentLoaded", async () => {
    await refresh();
    bind();
  });
})();


// Back button: always return to myassets.html
document.addEventListener("DOMContentLoaded", () => {
  const back = document.querySelector(".back-btn");
  if (!back) return;
  back.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "myassets.html";
  });
});
