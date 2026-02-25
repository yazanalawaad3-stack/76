// dashboard.js
// Fetches user profile and activity statistics from Supabase once the
// dashboard page loads and updates the relevant elements.  This
// script relies on the LuxApp helpers defined in supabaseClient.js.

(function () {
  'use strict';
  async function updateDashboard() {
    try {
      const data = await window.LuxApp.fetchCurrentUserData();
      if (!data) return;
      const { user, todayIncome, totalIncome, teamIncome, teamTotalIncome } = data;
      // Update ID
      const uidEl = document.getElementById('userIdValue');
      if (uidEl && user.user_code) uidEl.textContent = String(user.user_code);
      // Update balance (real_balance displayed as USDT)
      const balEl = document.getElementById('demoBalance');
      if (balEl) {
        const v = Number(user.real_balance || 0);
        balEl.textContent = v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      // Update activity values
      const todayEl = document.getElementById('todayIncome');
      if (todayEl) todayEl.textContent = '$' + Number(todayIncome || 0).toFixed(2);
      const totalEl = document.getElementById('totalIncome');
      if (totalEl) totalEl.textContent = '$' + Number(totalIncome || 0).toFixed(2);
      const teamTodayEl = document.getElementById('teamIncome');
      if (teamTodayEl) teamTodayEl.textContent = '$' + Number(teamIncome || 0).toFixed(2);
      const teamTotalEl = document.getElementById('teamTotalIncome');
      if (teamTotalEl) teamTotalEl.textContent = '$' + Number(teamTotalIncome || 0).toFixed(2);
    } catch (err) {
      console.error(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateDashboard);
  } else {
    updateDashboard();
  }
})();
