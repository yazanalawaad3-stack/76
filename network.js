/* network.js
   Keeps the existing UI intact and prepares the page for Supabase integration.
*/

(() => {
  "use strict";

  const ACTIVE_WINDOW_DAYS = 30;

  // Commission rates per generation
  const GEN_RATE = {
    1: 0.20,
    2: 0.04,
    3: 0.02,
    4: 0.01
  };

  // Demo data (replace with Supabase rows later)
  // Expected shape:
  // {
  //   account: string,
  //   id: string,
  //   gen: 1|2|3|4,
  //   created_at: "YYYY-MM-DD",
  //   last_active: "YYYY-MM-DD",
  //   deposit_total: number,   // total funded amount for validity checks
  //   daily_profit: number     // today's profit used to calculate network bonus
  // }
  const demoMembers = [
    { account: "user_a", id: "10021", gen: 1, created_at: "2025-11-12", last_active: "2026-02-18", deposit_total: 150, daily_profit: 12.50 },
    { account: "user_b", id: "10058", gen: 1, created_at: "2025-09-02", last_active: "2026-01-12", deposit_total: 80,  daily_profit: 6.00 },
    { account: "user_c", id: "10111", gen: 2, created_at: "2026-02-02", last_active: "2026-02-21", deposit_total: 120, daily_profit: 4.25 },
    { account: "user_d", id: "10202", gen: 3, created_at: "2025-12-08", last_active: "2025-12-15", deposit_total: 300, daily_profit: 9.00 },
    { account: "user_e", id: "10333", gen: 4, created_at: "2025-10-25", last_active: "2026-02-05", deposit_total: 100, daily_profit: 2.10 }
  ];

  // Valid member rule for your network conditions:
  // - Must have deposit_total >= 100
  // - Must be active within the last ACTIVE_WINDOW_DAYS
  const VALID_DEPOSIT_MIN = 100;

  function parseDate(s) {
    if (!s) return null;
    const d = new Date(String(s).slice(0, 10) + "T00:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function daysBetween(a, b) {
    const ms = Math.abs(a.getTime() - b.getTime());
    return Math.floor(ms / 86400000);
  }

  function isActive(member) {
    const last = parseDate(member.last_active);
    if (!last) return false;
    const now = new Date();
    return daysBetween(now, last) <= ACTIVE_WINDOW_DAYS;
  }

  function isValid(member) {
    const dep = Number(member.deposit_total || 0);
    return dep >= VALID_DEPOSIT_MIN && isActive(member);
  }

  function n2(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  async function loadMembers() {
    // If you initialize Supabase client globally (window.supabaseClient), this will be ready.
    // Keep this in place for future DB wiring.
    const sb = window.supabaseClient || window.supabase;

    if (sb && typeof sb.from === "function") {
      // Example (adjust to your real schema):
      // const { data, error } = await sb
      //   .from("network_members")
      //   .select("account,id,gen,created_at,last_active,deposit_total,daily_profit")
      //   .order("created_at", { ascending: false });
      // if (!error && Array.isArray(data)) return data;
      return demoMembers;
    }

    return demoMembers;
  }

  const ids = {
    sumIncome: "sumIncome",
    sumActive: "sumActive",
    sumInactive: "sumInactive",
    g: {
      1: { income: "g1_income", valid: "g1_valid", reg: "g1_registered", pct: "g1_pct" },
      2: { income: "g2_income", valid: "g2_valid", reg: "g2_registered", pct: "g2_pct" },
      3: { income: "g3_income", valid: "g3_valid", reg: "g3_registered", pct: "g3_pct" },
      4: { income: "g4_income", valid: "g4_valid", reg: "g4_registered", pct: "g4_pct" }
    }
  };

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function setPct(gen) {
    const pctId = ids.g[gen]?.pct;
    if (!pctId) return;
    const pct = (GEN_RATE[gen] || 0) * 100;
    setText(pctId, pct.toFixed(2) + "%");
  }

  function buildStats(members) {
    const byGen = { 1: [], 2: [], 3: [], 4: [] };
    for (const m of members) {
      const g = Number(m.gen);
      if (byGen[g]) byGen[g].push(m);
    }

    const stats = {};
    for (const gen of [1, 2, 3, 4]) {
      const list = byGen[gen];
      const registered = list.length;
      const validList = list.filter(isValid);
      const valid = validList.length;

      // Team income: sum of daily_profit of all members in that generation
      const income = list.reduce((acc, x) => acc + n2(x.daily_profit), 0);

      // Bonus: income * rate
      const bonus = income * (GEN_RATE[gen] || 0);

      stats[gen] = { registered, valid, income, bonus, rate: GEN_RATE[gen] || 0 };
    }

    const totalIncome = [1, 2, 3, 4].reduce((acc, g) => acc + stats[g].income, 0);
    const totalRegistered = [1, 2, 3, 4].reduce((acc, g) => acc + stats[g].registered, 0);
    const totalValid = [1, 2, 3, 4].reduce((acc, g) => acc + stats[g].valid, 0);

    return { stats, totalIncome, totalRegistered, totalValid };
  }

  function persistDailyNetworkActivity(model) {
    // This is a lightweight placeholder so myassets.html can read it later.
    // You can replace this with a Supabase insert in the future.
    const today = new Date();
    const key = "network_activity_demo";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");

    const dateStr = today.toISOString().slice(0, 10);

    // Prevent duplicates for same day by replacing.
    const filtered = existing.filter((x) => x && x.date !== dateStr);

    const rows = [1, 2, 3, 4].map((gen) => ({
      date: dateStr,
      gen,
      base_income: Number(model.stats[gen].income.toFixed(2)),
      rate: model.stats[gen].rate,
      bonus: Number(model.stats[gen].bonus.toFixed(2))
    }));

    filtered.push({ date: dateStr, rows });
    localStorage.setItem(key, JSON.stringify(filtered));
  }

  function render(model) {
    // Generation cards
    for (const gen of [1, 2, 3, 4]) {
      const g = ids.g[gen];
      if (!g) continue;

      setText(g.income, model.stats[gen].income.toFixed(2));
      setText(g.valid, model.stats[gen].valid);
      setText(g.reg, model.stats[gen].registered);
      setPct(gen);
    }

    // Summary strip
    setText(ids.sumIncome, model.totalIncome.toFixed(2));
    setText(ids.sumActive, model.totalValid);
    setText(ids.sumInactive, Math.max(model.totalRegistered - model.totalValid, 0));
  }

  async function init() {
    const members = await loadMembers();
    const model = buildStats(members);
    render(model);
    persistDailyNetworkActivity(model);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
