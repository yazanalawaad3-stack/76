(() => {
  const qs = (s, el = document) => el.querySelector(s);

  const toastEl = qs('#luxToast');
  const toastText = qs('#toastText');
  let toastTimer = null;
  function toast(msg) {
    toastText.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
  }

  async function safeCopy(text) {
    try {
      await navigator.clipboard.writeText(String(text));
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = String(text);
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return !!ok;
      } catch {
        return false;
      }
    }
  }

  function getUserId() {
    const raw =
      window.LUX_USER_ID ||
      window.USER_ID ||
      localStorage.getItem('lux_user_id') ||
      localStorage.getItem('user_id') ||
      '750899';
    return String(raw).trim() || '750899';
  }

  function buildInvite() {
    // Feel free to change the path below to your real register page when backend is ready.
    const code = getUserId();
    const origin = window.location.origin || '';
    const basePath = origin ? origin : 'https://example.com';
    const link = `${basePath}/?ref=${encodeURIComponent(code)}`;

    qs('#inviteLinkText').textContent = link;
    qs('#inviteCodeText').textContent = code;

    return { link, code };
  }

  // Modal
  const modal = qs('#inviteModal');
  const openBtn = qs('#openInviteModalBtn');
  const closeBtns = [qs('#closeInviteModalBtn'), qs('#closeInviteModalBtn2')].filter(Boolean);

  function openModal() {
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function wire() {
    const invite = buildInvite();

    openBtn?.addEventListener('click', openModal);
    closeBtns.forEach(b => b.addEventListener('click', closeModal));
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
    });

    qs('#copyInviteLinkBtn')?.addEventListener('click', async () => {
      const ok = await safeCopy(invite.link);
      toast(ok ? 'Link copied ✅' : 'Copy failed');
    });

    qs('#copyInviteCodeBtn')?.addEventListener('click', async () => {
      const ok = await safeCopy(invite.code);
      toast(ok ? 'Code copied ✅' : 'Copy failed');
    });

    qs('#copyBothBtn')?.addEventListener('click', async () => {
      const ok = await safeCopy(`${invite.link}\n${invite.code}`);
      toast(ok ? 'Copied ✅' : 'Copy failed');
    });

    // Optional share API
    qs('#shareBtn')?.addEventListener('click', async () => {
      const payload = { title: 'Invitation', text: `My invite code: ${invite.code}`, url: invite.link };
      try {
        if (navigator.share) {
          await navigator.share(payload);
          toast('Shared ✅');
        } else {
          const ok = await safeCopy(invite.link);
          toast(ok ? 'Link copied ✅' : 'Share not supported');
        }
      } catch {
        // user canceled share: ignore
      }
    });

    // Auto-open once when arriving from the dashboard
    const onceKey = 'lux_invite_modal_once';
    const seen = sessionStorage.getItem(onceKey);
    if (!seen) {
      sessionStorage.setItem(onceKey, '1');
      openModal();
    }
  }

  wire();
})();