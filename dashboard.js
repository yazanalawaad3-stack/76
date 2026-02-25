/* dashboard.js
   Fetches the current user’s account details and updates the
   dashboard values on myassets.html.  It uses the LuxApp helper
   defined in supabaseClient.js to retrieve the user and income
   statistics.  The DOM elements are updated only if they exist,
   preserving the original layout and styling.
*/
(function () {
  'use strict';

  /**
   * Format a number as a USDT amount.  If the input is null or not a
   * number the function returns "$0.00".
   *
   * @param {number|string|null} v
   * @returns {string}
   */
  function toMoney(v) {
    const num = Number(v);
    return '$' + (Number.isFinite(num) ? num.toFixed(2) : '0.00');
  }

  async function load() {
    if (!window.LuxApp || !window.LuxApp.fetchCurrentUserData) return;
    try {
      const data = await window.LuxApp.fetchCurrentUserData();
      if (!data || !data.user) return;
      const user = data.user;
      // Update user ID (8‑digit code)
      const userIdEl = document.getElementById('userIdValue');
      if (userIdEl) {
        userIdEl.textContent = String(user.user_code || '');
      }
      // Demo/real balance
      const balEl = document.getElementById('demoBalance');
      if (balEl) {
        balEl.textContent = toMoney(user.real_balance);
      }
      // Income statistics
      const tiEl = document.getElementById('todayIncome');
      if (tiEl) {
        tiEl.textContent = toMoney(data.todayIncome);
      }
      const totalEl = document.getElementById('totalIncome');
      if (totalEl) {
        totalEl.textContent = toMoney(data.totalIncome);
      }
      const teamTodayEl = document.getElementById('teamIncome');
      if (teamTodayEl) {
        teamTodayEl.textContent = toMoney(data.teamIncome);
      }
      const teamTotalEl = document.getElementById('teamTotalIncome');
      if (teamTotalEl) {
        teamTotalEl.textContent = toMoney(data.teamTotalIncome);
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();