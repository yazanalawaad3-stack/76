/* invite.js
   Prepared for future Supabase integration.
   Demo state uses localStorage only.
*/
(function () {
  "use strict";

  const KEYS = {
    INVITE_CODE: "invite_code_demo"
  };

  const qs = (s, el = document) => el.querySelector(s);

  const toastEl = qs("#luxToast");
  const toastText = qs("#toastText");
  let toastTimer = null;

  function toast(msg) {
    if (!toastEl || !toastText) return;
    toastText.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1600);
  }

  async function safeCopy(text) {
    const value = String(text ?? "");
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (_) {
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return !!ok;
      } catch (_) {
        return false;
      }
    }
  }

  function randomLetter() {
    const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return a[Math.floor(Math.random() * a.length)];
  }

  function gen7Upper() {
    let out = "";
    for (let i = 0; i < 7; i++) out += randomLetter();
    return out;
  }

  function ensureInviteCode() {
    let code = localStorage.getItem(KEYS.INVITE_CODE);
    if (!code || !/^[A-Z]{7}$/.test(code)) {
      code = gen7Upper();
      localStorage.setItem(KEYS.INVITE_CODE, code);
    }
    return code;
  }

  function buildInvite() {
    const code = ensureInviteCode();
    const origin = window.location.origin || "";
    const base = origin || "https://example.com";

    const url = new URL("register.html", base.endsWith("/") ? base : base + "/");
    url.searchParams.set("code", code);

    const link = url.toString();

    const linkEl = qs("#inviteLinkText");
    const codeEl = qs("#inviteCodeText");
    if (linkEl) linkEl.textContent = link;
    if (codeEl) codeEl.textContent = code;

    return { link, code };
  }

  async function shareInvite(invite) {
    const payload = {
      title: "Invitation",
      text: "Invite code: " + invite.code,
      url: invite.link
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        toast("Shared");
        return;
      }
    } catch (_) {}

    const ok = await safeCopy(invite.link + "\n" + invite.code);
    toast(ok ? "Copied" : "Share not supported");
  }

  function wire() {
    const invite = buildInvite();

    qs("#copyInviteLinkBtn")?.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = await safeCopy(invite.link);
      toast(ok ? "Link copied" : "Copy failed");
    });

    qs("#copyInviteCodeBtn")?.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = await safeCopy(invite.code);
      toast(ok ? "Code copied" : "Copy failed");
    });

    qs("#shareBtn")?.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await shareInvite(invite);
    });

    window.addEventListener("storage", (e) => {
      if (!e) return;
      if (e.key === KEYS.INVITE_CODE) buildInvite();
    });
  }

  document.addEventListener("DOMContentLoaded", wire);
})();