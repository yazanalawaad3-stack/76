/* myassets.js
   Prepared for future Supabase integration.
   Demo state uses localStorage only.
   This file does NOT change navigation handlers (keeps existing app.js behavior).
*/
(function () {
  "use strict";

  const KEYS = {
    USER_ID: "user_id_demo",
    PROFILE: "profile_demo",
    ACTIVITY: "activity_demo",
    NETWORK_LEGACY: "network_activity_demo"
  };

  const $id = (id) => document.getElementById(id);

  function safeParse(raw, fallback) { try { return JSON.parse(raw); } catch (_) { return fallback; } }
  function readStore(key, fallback) { const raw = localStorage.getItem(key); return raw ? safeParse(raw, fallback) : fallback; }
  function writeStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function now() { return Date.now(); }

  function toMoney(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "0.00";
    return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function gen8() {
    const min = 10000000;
    const max = 99999999;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
  }

  function ensureUserId() {
    let id = localStorage.getItem(KEYS.USER_ID);
    if (!id || !/^\d{8}$/.test(id)) {
      id = gen8();
      localStorage.setItem(KEYS.USER_ID, id);
    }
    return id;
  }

  function ensureProfile() {
    const p0 = readStore(KEYS.PROFILE, null);
    if (!p0 || typeof p0 !== "object") {
      writeStore(KEYS.PROFILE, { balance: 4, level: "V0", frozen: false });
      return;
    }
    const next = {
      balance: Number.isFinite(Number(p0.balance)) ? Number(p0.balance) : 0,
      level: typeof p0.level === "string" ? p0.level : "V0",
      frozen: Boolean(p0.frozen)
    };
    writeStore(KEYS.PROFILE, next);
  }

  function ensureActivity() {
    const a0 = readStore(KEYS.ACTIVITY, null);
    if (!a0 || typeof a0 !== "object") {
      writeStore(KEYS.ACTIVITY, { today: 0, total: 0, networkToday: 0, networkTotal: 0, lastUpdatedAt: 0 });
    }
  }

  function mergeLegacyNetworkActivity() {
    const legacy = readStore(KEYS.NETWORK_LEGACY, null);
    if (!legacy || typeof legacy !== "object") return;

    const act0 = readStore(KEYS.ACTIVITY, { today: 0, total: 0, networkToday: 0, networkTotal: 0, lastUpdatedAt: 0 });
    const nt = Number.isFinite(Number(legacy.today)) ? Number(legacy.today) : 0;
    const ntt = Number.isFinite(Number(legacy.total)) ? Number(legacy.total) : 0;

    writeStore(KEYS.ACTIVITY, {
      ...act0,
      networkToday: Math.max(Number(act0.networkToday) || 0, nt),
      networkTotal: Math.max(Number(act0.networkTotal) || 0, ntt),
      lastUpdatedAt: now()
    });
  }

  function getProfile() { return readStore(KEYS.PROFILE, { balance: 0, level: "V0", frozen: false }); }
  function getActivity() { return readStore(KEYS.ACTIVITY, { today: 0, total: 0, networkToday: 0, networkTotal: 0, lastUpdatedAt: 0 }); }

  function render() {
    const id = ensureUserId();
    const profile = getProfile();
    const act = getActivity();

    const userIdValue = $id("userIdValue");
    if (userIdValue) userIdValue.textContent = id;

    const balanceEl = $id("demoBalance");
    if (balanceEl) balanceEl.textContent = toMoney(profile.balance);

    const todayIncome = $id("todayIncome");
    if (todayIncome) todayIncome.textContent = "$" + toMoney(act.today);

    const totalIncome = $id("totalIncome");
    if (totalIncome) totalIncome.textContent = "$" + toMoney(act.total);

    const teamIncome = $id("teamIncome");
    if (teamIncome) teamIncome.textContent = "$" + toMoney(act.networkToday);

    const teamTotal = $id("teamTotalIncome");
    if (teamTotal) teamTotal.textContent = "$" + toMoney(act.networkTotal);
  }

  function init() {
    ensureUserId();
    ensureProfile();
    ensureActivity();
    mergeLegacyNetworkActivity();
    render();

    window.addEventListener("storage", (e) => {
      if (!e) return;
      if (e.key === KEYS.PROFILE || e.key === KEYS.ACTIVITY || e.key === KEYS.NETWORK_LEGACY || e.key === KEYS.USER_ID) {
        mergeLegacyNetworkActivity();
        render();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();