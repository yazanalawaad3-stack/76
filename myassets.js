/* myassets.js
   Prepared for future Supabase integration.
   Demo state uses localStorage only.
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
      // Registration bonus: 4
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
      writeStore(KEYS.ACTIVITY, {
        today: 0,
        total: 0,
        networkToday: 0,
        networkTotal: 0,
        lastUpdatedAt: 0
      });
    }
  }

  function mergeLegacyNetworkActivity() {
    const legacy = readStore(KEYS.NETWORK_LEGACY, null);
    if (!legacy || typeof legacy !== "object") return;

    const act0 = readStore(KEYS.ACTIVITY, {
      today: 0,
      total: 0,
      networkToday: 0,
      networkTotal: 0,
      lastUpdatedAt: 0
    });

    const nt = Number.isFinite(Number(legacy.today)) ? Number(legacy.today) : 0;
    const ntt = Number.isFinite(Number(legacy.total)) ? Number(legacy.total) : 0;

    const merged = {
      ...act0,
      networkToday: Math.max(act0.networkToday || 0, nt),
      networkTotal: Math.max(act0.networkTotal || 0, ntt),
      lastUpdatedAt: now()
    };

    writeStore(KEYS.ACTIVITY, merged);
  }

  function getProfile() {
    return readStore(KEYS.PROFILE, { balance: 0, level: "V0", frozen: false });
  }

  function getActivity() {
    return readStore(KEYS.ACTIVITY, {
      today: 0,
      total: 0,
      networkToday: 0,
      networkTotal: 0,
      lastUpdatedAt: 0
    });
  }

  function setToast(text) {
    const toastText = $id("toastText");
    if (toastText) toastText.textContent = text;

    const toast = $id("luxToast");
    if (!toast) return;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
  }

  function copyText(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => setToast("Copied"),
        () => setToast("Copy failed")
      );
      return;
    }
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      setToast("Copied");
    } catch (_) {
      setToast("Copy failed");
    } finally {
      document.body.removeChild(ta);
    }
  }

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

  function toggleSettingsMenu(force) {
    const menu = $id("settingsMenu");
    if (!menu) return;

    const isHidden = menu.getAttribute("aria-hidden") !== "false";
    const nextOpen = typeof force === "boolean" ? force : isHidden;

    menu.setAttribute("aria-hidden", nextOpen ? "false" : "true");
    menu.classList.toggle("open", nextOpen);
  }

  function closeSettingsMenu() {
    toggleSettingsMenu(false);
  }

  function bindTop() {
    const copyBtn = $id("copyUserIdBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const id = localStorage.getItem(KEYS.USER_ID) || "";
        copyText(id);
      });
    }

    const settingsBtn = $id("settingsBtn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleSettingsMenu();
      });
    }

    const notifyBtn = $id("notifyBtn");
    if (notifyBtn) {
      notifyBtn.addEventListener("click", () => setToast("No notifications"));
    }

    document.addEventListener("click", (e) => {
      const menu = $id("settingsMenu");
      if (!menu) return;
      const target = e.target;
      const inside = menu.contains(target) || (settingsBtn && settingsBtn.contains(target));
      if (!inside) closeSettingsMenu();
    });

    const menu = $id("settingsMenu");
    if (menu) {
      menu.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const action = btn.getAttribute("data-action") || "";
        closeSettingsMenu();

        if (action === "member") window.location.href = "member.html";
        else if (action === "rewards") window.location.href = "ai-assets.html";
        else if (action === "security") setToast("Security Center");
        else if (action === "language") setToast("Language Settings");
        else if (action === "about") setToast("About Platform");
        else if (action === "guide") setToast("Platform Guide");
        else if (action === "getapp") setToast("Get the App");
      });
    }
  }

  function bindQuick() {
    const invite = $id("inviteFriendsBtn");
    if (invite) {
      invite.addEventListener("click", () => {
        const id = localStorage.getItem(KEYS.USER_ID) || "";
        copyText(id);
        setToast("Invite code copied");
      });
    }

    const walletBtn = $id("walletBtn");
    if (walletBtn) walletBtn.addEventListener("click", () => window.location.href = "wallet.html");

    const quickNetworkBtn = $id("quickNetworkBtn");
    if (quickNetworkBtn) quickNetworkBtn.addEventListener("click", () => window.location.href = "network.html");

    const analyticsBtn = $id("analyticsBtn");
    if (analyticsBtn) analyticsBtn.addEventListener("click", () => window.location.href = "ai-assets.html");
  }

  function bindDock() {
    const items = Array.from(document.querySelectorAll(".dock-item"));
    items.forEach((btn) => {
      btn.addEventListener("click", () => {
        const screen = (btn.getAttribute("data-screen") || "").toLowerCase();

        if (screen.includes("ai")) window.location.href = "ai-assets.html";
        else if (screen.includes("market")) window.location.href = "myassets.html";
        else if (screen.includes("profile")) setToast("Profile");
        else if (screen.includes("community")) setToast("Community");
        else if (screen.includes("packages")) setToast("Packages");
      });
    });
  }

  function updateRatesDemo() {
    // Demo only: show stable placeholders, ready to be replaced by Supabase/API later.
    const rBNB = $id("rateBNB");
    const rTRX = $id("rateTRX");
    const rETH = $id("rateETH");
    const cBNB = $id("chgBNB");
    const cTRX = $id("chgTRX");
    const cETH = $id("chgETH");
    const updated = $id("ratesUpdatedAt");

    const tick = () => {
      const bnb = 600 + Math.random() * 30;
      const trx = 0.10 + Math.random() * 0.02;
      const eth = 2800 + Math.random() * 120;

      if (rBNB) rBNB.textContent = "$" + bnb.toFixed(2);
      if (rTRX) rTRX.textContent = "$" + trx.toFixed(4);
      if (rETH) rETH.textContent = "$" + eth.toFixed(2);

      const s1 = (Math.random() * 2 - 1);
      const s2 = (Math.random() * 2 - 1);
      const s3 = (Math.random() * 2 - 1);

      if (cBNB) cBNB.textContent = (s1 >= 0 ? "+" : "") + s1.toFixed(2) + "%";
      if (cTRX) cTRX.textContent = (s2 >= 0 ? "+" : "") + s2.toFixed(2) + "%";
      if (cETH) cETH.textContent = (s3 >= 0 ? "+" : "") + s3.toFixed(2) + "%";

      if (updated) updated.textContent = "Updated just now";
    };

    tick();
    setInterval(tick, 15000);
  }

  function init() {
    ensureUserId();
    ensureProfile();
    ensureActivity();
    mergeLegacyNetworkActivity();

    render();
    bindTop();
    bindQuick();
    bindDock();
    updateRatesDemo();

    window.addEventListener("storage", (e) => {
      if (!e) return;
      if (e.key === KEYS.PROFILE || e.key === KEYS.ACTIVITY || e.key === KEYS.NETWORK_LEGACY) {
        mergeLegacyNetworkActivity();
        render();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();