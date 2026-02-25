/* member.js
   Prepared for future Supabase integration.
   Demo data is stored in localStorage only.
*/

(function () {
  "use strict";

  const STORAGE_KEYS = {
    PROFILE: "profile_demo",
    REFERRALS: "referrals_demo",
    MEMBER_STATE: "member_state_demo"
  };

  const LEVELS = ["V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7"];

  function safeJsonParse(value, fallback) {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  }

  function readStore(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return safeJsonParse(raw, fallback);
  }

  function writeStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function normalizeNumber(n, def) {
    const x = Number(n);
    return Number.isFinite(x) ? x : def;
  }

  function ensureDemoData() {
    const profile = readStore(STORAGE_KEYS.PROFILE, null);
    if (!profile || typeof profile !== "object") {
      writeStore(STORAGE_KEYS.PROFILE, {
        balance: 0,
        level: "V0",
        frozen: false
      });
    } else {
      const next = {
        balance: normalizeNumber(profile.balance, 0),
        level: LEVELS.includes(profile.level) ? profile.level : "V0",
        frozen: Boolean(profile.frozen)
      };
      writeStore(STORAGE_KEYS.PROFILE, next);
    }

    const refs = readStore(STORAGE_KEYS.REFERRALS, null);
    if (!Array.isArray(refs)) {
      // Schema:
      // [{ id, gen, deposited, balance }]
      writeStore(STORAGE_KEYS.REFERRALS, []);
    } else {
      // Sanitize
      const cleaned = refs
        .filter(r => r && typeof r === "object")
        .map(r => ({
          id: String(r.id ?? ""),
          gen: normalizeNumber(r.gen, 1),
          deposited: Boolean(r.deposited),
          balance: normalizeNumber(r.balance, 0)
        }));
      writeStore(STORAGE_KEYS.REFERRALS, cleaned);
    }

    const state = readStore(STORAGE_KEYS.MEMBER_STATE, null);
    if (!state || typeof state !== "object") {
      writeStore(STORAGE_KEYS.MEMBER_STATE, {
        selectedLevel: "V1"
      });
    } else {
      writeStore(STORAGE_KEYS.MEMBER_STATE, {
        selectedLevel: LEVELS.includes(state.selectedLevel) ? state.selectedLevel : "V1"
      });
    }
  }

  function getProfile() {
    return readStore(STORAGE_KEYS.PROFILE, { balance: 0, level: "V0", frozen: false });
  }

  function setProfile(next) {
    writeStore(STORAGE_KEYS.PROFILE, next);
  }

  function getReferrals() {
    return readStore(STORAGE_KEYS.REFERRALS, []);
  }

  function countActiveGen1(refs) {
    // Active = Gen1 only + deposited + balance >= 100
    return refs.filter(r => r.gen === 1 && r.deposited && r.balance >= 100).length;
  }

  function computeUserLevel(profile, refs) {
    const balance = normalizeNumber(profile.balance, 0);
    const activeGen1 = countActiveGen1(refs);

    // Freeze rule:
    // If user reaches V3 requirements, account becomes frozen and requires support.
    // We still store level as V3 for display, but frozen blocks "earning/withdraw" in other pages later.
    const v3Achieved = balance >= 3000 && activeGen1 >= 15;

    if (v3Achieved) {
      return { level: "V3", frozen: true, activeGen1 };
    }

    // V2 requirements
    const v2Achieved = balance >= 500 && activeGen1 >= 5;

    if (v2Achieved) {
      return { level: "V2", frozen: false, activeGen1 };
    }

    // V1 requirements
    const v1Achieved = balance >= 50;

    if (v1Achieved) {
      return { level: "V1", frozen: false, activeGen1 };
    }

    return { level: "V0", frozen: false, activeGen1 };
  }

  function isLevelTabOpen(levelKey) {
    // Only V1, V2, V3 are shown as usable.
    // V4..V7 stay locked always.
    return levelKey === "V1" || levelKey === "V2" || levelKey === "V3";
  }

  function requirementsFor(levelKey) {
    // For UI stats per selected tab
    if (levelKey === "V1") return { balanceReq: 50, usersReq: 0 };
    if (levelKey === "V2") return { balanceReq: 500, usersReq: 5 };
    if (levelKey === "V3") return { balanceReq: 3000, usersReq: 15 };
    if (levelKey === "V4") return { balanceReq: 6000, usersReq: 0 };
    if (levelKey === "V5") return { balanceReq: 10000, usersReq: 0 };
    if (levelKey === "V6") return { balanceReq: 15000, usersReq: 0 };
    if (levelKey === "V7") return { balanceReq: 20000, usersReq: 0 };
    return { balanceReq: 0, usersReq: 0 };
  }

  function computeProgress(selectedLevel, profile, refs) {
    const req = requirementsFor(selectedLevel);
    const b = normalizeNumber(profile.balance, 0);
    const activeGen1 = countActiveGen1(refs);

    const balancePct = req.balanceReq === 0 ? 1 : clamp(b / req.balanceReq, 0, 1);
    const usersPct = req.usersReq === 0 ? 1 : clamp(activeGen1 / req.usersReq, 0, 1);
    const pct = Math.round(((balancePct + usersPct) / 2) * 100);

    let achieved = balancePct >= 1 && usersPct >= 1;

    // V4..V7 are never open (locked)
    if (!isLevelTabOpen(selectedLevel)) achieved = false;

    return { pct, achieved, balancePct, usersPct, activeGen1, req };
  }

  function q(id) { return document.getElementById(id); }

  const els = {
    heroLevel: q("heroLevel"),
    heroLock: q("heroLock"),
    heroLockText: q("heroLockText"),
    balanceText: q("balanceText"),
    balanceSub: q("balanceSub"),
    usersText: q("usersText"),
    usersSub: q("usersSub"),
    benefitsGrid: q("benefitsGrid"),
    achieveModal: q("achieveModal"),
    modalTitle: q("modalTitle"),
    modalText: q("modalText"),
    modalClose: q("modalClose"),
    modalLater: q("modalLater"),
    modalOk: q("modalOk"),
    backBtn: q("backBtn"),
    tabs: Array.from(document.querySelectorAll(".tab"))
  };

  function setLock(locked) {
    const unlocked = !locked;
    els.heroLock.classList.toggle("unlocked", unlocked);
    els.heroLockText.textContent = unlocked ? "Unlocked" : "Locked";
  }

  function openModal(title, text) {
    els.modalTitle.textContent = title;
    els.modalText.textContent = text;
    els.achieveModal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    els.achieveModal.classList.remove("show");
    document.body.style.overflow = "";
  }

  function renderBenefits(levelKey) {
    // Keep benefits as original markup structure:
    // If existing HTML expects benefits, we render something minimal & stable
    const map = {
      V1: [
        { name: "Min Withdrawal", desc: "20 USDT" },
        { name: "Max Withdrawal", desc: "500 USDT" },
        { name: "Withdrawal Fee", desc: "5%" },
        { name: "Team Income Depth", desc: "2 levels" }
      ],
      V2: [
        { name: "Min Withdrawal", desc: "20 USDT" },
        { name: "Max Withdrawal", desc: "1000 USDT" },
        { name: "Withdrawal Fee", desc: "5%" },
        { name: "Team Income Depth", desc: "3 levels" }
      ],
      V3: [
        { name: "Min Withdrawal", desc: "20 USDT" },
        { name: "Max Withdrawal", desc: "2000 USDT" },
        { name: "Withdrawal Fee", desc: "5%" },
        { name: "Team Income Depth", desc: "4 levels" }
      ],
      V4: [
        { name: "Unavailable", desc: "This level is not open." }
      ],
      V5: [
        { name: "Unavailable", desc: "This level is not open." }
      ],
      V6: [
        { name: "Unavailable", desc: "This level is not open." }
      ],
      V7: [
        { name: "Unavailable", desc: "This level is not open." }
      ]
    };

    const list = map[levelKey] || [];
    els.benefitsGrid.innerHTML = "";
    list.forEach((b) => {
      const div = document.createElement("div");
      div.className = "benefit";

      const top = document.createElement("div");
      top.className = "btop";

      const icon = document.createElement("span");
      icon.className = "mini";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M6 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M12 6v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/>
          <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="1.7" opacity=".45"/>
        </svg>
      `;

      const name = document.createElement("div");
      name.className = "bname";
      name.textContent = b.name;

      top.appendChild(icon);
      top.appendChild(name);

      const desc = document.createElement("div");
      desc.className = "bdesc";
      desc.textContent = b.desc;

      div.appendChild(top);
      div.appendChild(desc);
      els.benefitsGrid.appendChild(div);
    });
  }

  function selectLevel(levelKey) {
    const state = readStore(STORAGE_KEYS.MEMBER_STATE, { selectedLevel: "V1" });
    state.selectedLevel = levelKey;
    writeStore(STORAGE_KEYS.MEMBER_STATE, state);

    els.tabs.forEach((t) => {
      t.setAttribute("aria-selected", t.dataset.level === levelKey ? "true" : "false");
    });

    const profile = getProfile();
    const refs = getReferrals();
    const progress = computeProgress(levelKey, profile, refs);

    els.heroLevel.textContent = levelKey;

    // If tab is not open, always locked
    const locked = !progress.achieved;

    // Stats area
    els.balanceText.textContent = `${normalizeNumber(profile.balance, 0)} / ${progress.req.balanceReq}`;
    els.usersText.textContent = `${progress.activeGen1} / ${progress.req.usersReq}`;
    els.balanceSub.textContent = `Balance needed for ${levelKey}`;
    els.usersSub.textContent = `Effective users needed for ${levelKey}`;

    setLock(locked);
    renderBenefits(levelKey);

    // V3 special modal (reach => freeze)
    if (levelKey === "V3" && progress.achieved) {
      openModal(
        "V3 Requirements Achieved",
        "You have met the V3 requirements. Please contact support to activate this tier."
      );
    }

    // Closed levels modal
    if (!isLevelTabOpen(levelKey)) {
      openModal("Locked Level", "This level is not open.");
    }
  }

  function enforceBusinessRules() {
    const profile = getProfile();
    const refs = getReferrals();
    const computed = computeUserLevel(profile, refs);

    const nextProfile = {
      balance: normalizeNumber(profile.balance, 0),
      level: computed.level,
      frozen: computed.frozen
    };

    setProfile(nextProfile);
  }

  function initTabsLocking() {
    els.tabs.forEach((t) => {
      const lvl = t.dataset.level;
      if (!isLevelTabOpen(lvl)) {
        // Keep the tab click available for UI but it will show locked modal
      }
    });
  }

  function initEvents() {
    els.tabs.forEach((t) => {
      t.addEventListener("click", () => selectLevel(t.dataset.level));
    });

    els.modalClose.addEventListener("click", closeModal);
    els.modalLater.addEventListener("click", closeModal);
    els.modalOk.addEventListener("click", closeModal);
    els.achieveModal.addEventListener("click", (e) => {
      if (e.target === els.achieveModal) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    els.backBtn.addEventListener("click", () => {
      window.location.href = "myassets.html";
    });

    // React to external changes from other pages (deposit, network updates)
    window.addEventListener("storage", (e) => {
      if (!e) return;
      if (e.key === STORAGE_KEYS.PROFILE || e.key === STORAGE_KEYS.REFERRALS) {
        enforceBusinessRules();
        const state = readStore(STORAGE_KEYS.MEMBER_STATE, { selectedLevel: "V1" });
        selectLevel(state.selectedLevel || "V1");
      }
    });
  }

  function init() {
    ensureDemoData();
    enforceBusinessRules();
    initTabsLocking();
    initEvents();

    const state = readStore(STORAGE_KEYS.MEMBER_STATE, { selectedLevel: "V1" });
    const defaultTab = state.selectedLevel || "V1";
    selectLevel(defaultTab);

    // If user is frozen, show support message once per load
    const profile = getProfile();
    if (profile.frozen) {
      openModal("Account Locked", "Please contact support to unlock your account.");
    }
  }

  init();
})();
