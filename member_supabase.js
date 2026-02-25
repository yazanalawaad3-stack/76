/* member_supabase.js
   Simplified membership status display using Supabase.  This script
   queries the current user’s level and balance via LuxApp and
   updates the Member page to indicate the account status.  The
   original demo logic around referrals and progression is
   intentionally omitted; instead the user’s level is taken from the
   database.  As the user deposits and meets the criteria defined in
   the backend triggers the level will update automatically.
*/
(function () {
  'use strict';
  const heroLevelEl = document.getElementById('heroLevel');
  const heroLockEl = document.getElementById('heroLock');
  const heroLockTextEl = document.getElementById('heroLockText');
  const balanceTextEl = document.getElementById('balanceText');
  const balanceSubEl = document.getElementById('balanceSub');
  const usersTextEl = document.getElementById('usersText');
  const usersSubEl = document.getElementById('usersSub');

  // Minimal requirements for display (balance/user count).  Adjust to
  // match backend level thresholds if needed.
  const REQUIREMENTS = {
    0: { balance: 0, users: 0 },
    1: { balance: 50, users: 0 },
    2: { balance: 500, users: 5 },
    3: { balance: 3000, users: 10 },
    4: { balance: 6000, users: 0 },
    5: { balance: 10000, users: 0 },
    6: { balance: 15000, users: 0 },
    7: { balance: 20000, users: 0 }
  };

  function formatAmt(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }

  async function loadMemberInfo() {
    if (!window.LuxApp || !window.LuxApp.fetchCurrentUserData) return;
    try {
      const { user } = await window.LuxApp.fetchCurrentUserData();
      if (!user) return;
      const lvl = Number(user.level) || 0;
      if (heroLevelEl) heroLevelEl.textContent = 'V' + lvl;
      if (heroLockEl && heroLockTextEl) {
        const unlocked = lvl > 0;
        heroLockEl.classList.toggle('unlocked', unlocked);
        heroLockTextEl.textContent = unlocked ? 'Unlocked' : 'Locked';
      }
      const req = REQUIREMENTS[lvl] || { balance: 0, users: 0 };
      if (balanceTextEl) {
        balanceTextEl.textContent = `${formatAmt(user.real_balance)} / ${req.balance}`;
      }
      if (balanceSubEl) {
        balanceSubEl.textContent = 'Balance needed for this level';
      }
      if (usersTextEl) {
        // For direct referrals you would query the team_bonus or referrals tree; here we leave 0
        usersTextEl.textContent = `0 / ${req.users}`;
      }
      if (usersSubEl) {
        usersSubEl.textContent = 'Direct referrals that reached VIP status';
      }
    } catch (err) {
      console.error(err);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadMemberInfo);
  } else {
    loadMemberInfo();
  }
})();