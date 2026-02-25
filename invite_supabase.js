// invite_supabase.js
// Displays the logged‑in user’s invitation link and code using
// Supabase data.  Provides copy and share helpers.  Requires
// supabaseClient.js and the LuxApp namespace.
(function () {
  'use strict';

  // Fallback copy function if navigator.clipboard is unavailable
  async function safeCopy(text) {
    const value = String(text ?? '');
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return !!ok;
      } catch (_) {
        return false;
      }
    }
  }

  async function populateInvite() {
    try {
      const data = await window.LuxApp.fetchCurrentUserData();
      if (!data || !data.user) return;
      const code = data.user.invite_code;
      const base = window.location.origin || '';
      const url = new URL('register.html', base.endsWith('/') ? base : base + '/');
      url.searchParams.set('code', code);
      const link = url.toString();
      const linkEl = document.getElementById('inviteLinkText');
      const codeEl = document.getElementById('inviteCodeText');
      if (linkEl) linkEl.textContent = link;
      if (codeEl) codeEl.textContent = code;
      // Bind copy buttons
      const copyLinkBtn = document.getElementById('copyInviteLinkBtn');
      if (copyLinkBtn) copyLinkBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const ok = await safeCopy(link);
        alert(ok ? 'Link copied' : 'Copy failed');
      });
      const copyCodeBtn = document.getElementById('copyInviteCodeBtn');
      if (copyCodeBtn) copyCodeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const ok = await safeCopy(code);
        alert(ok ? 'Code copied' : 'Copy failed');
      });
      const shareBtn = document.getElementById('shareBtn');
      if (shareBtn) shareBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const payload = {
          title: 'Invitation',
          text: 'Invite code: ' + code,
          url: link
        };
        try {
          if (navigator.share) {
            await navigator.share(payload);
            return;
          }
        } catch (_) {}
        const ok = await safeCopy(link + '\n' + code);
        alert(ok ? 'Copied' : 'Share not supported');
      });
    } catch (err) {
      console.error(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateInvite);
  } else {
    populateInvite();
  }
})();
