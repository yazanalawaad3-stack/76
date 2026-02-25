// network_supabase.js
// Displays team statistics using Supabase data.  This module
// computes the user’s team income per generation and the count of
// active members (i.e. members who have generated bonuses) for each
// generation.  Because the full referral tree can be large, this
// implementation uses the `team_bonus` table rather than walking the
// invitation chain directly.  It assumes that every bonus entry
// corresponds to an active team member.
(function () {
  'use strict';

  async function populateNetwork() {
    try {
      const data = await window.LuxApp.fetchCurrentUserData();
      if (!data || !data.user) return;
      const user = data.user;
      // Fetch all team bonus entries for this user
      const { data: bonuses, error } = await window.LuxApp.supabase
        .from('team_bonus')
        .select('generation, amount, created_at, from_user_id')
        .eq('user_id', user.id);
      if (error) throw error;
      // Aggregate totals by generation
      const totals = {};
      const todayTotals = {};
      const activeCounts = {};
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      bonuses.forEach((b) => {
        const gen = b.generation;
        totals[gen] = (totals[gen] || 0) + Number(b.amount);
        activeCounts[gen] = activeCounts[gen] || new Set();
        activeCounts[gen].add(b.from_user_id);
        const created = b.created_at ? new Date(b.created_at) : null;
        if (created && created >= startOfDay) {
          todayTotals[gen] = (todayTotals[gen] || 0) + Number(b.amount);
        }
      });
      // Fill table rows
      for (let gen = 1; gen <= 4; gen++) {
        const row = document.querySelector(`[data-generation="${gen}"]`);
        if (!row) continue;
        const genTotal = totals[gen] || 0;
        const genToday = todayTotals[gen] || 0;
        const count = activeCounts[gen] ? activeCounts[gen].size : 0;
        // Each row contains: Generation label, daily income, total income, active users
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          cells[1].textContent = '$' + genToday.toFixed(2);
          cells[2].textContent = '$' + genTotal.toFixed(2);
          cells[3].textContent = String(count);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateNetwork);
  } else {
    populateNetwork();
  }
})();
