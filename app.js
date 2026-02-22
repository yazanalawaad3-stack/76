(() => {
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => [...el.querySelectorAll(s)];

  const toastEl = qs('#luxToast');
  const toastText = qs('#toastText');
  let toastTimer = null;

  function toast(msg){
    toastText.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1400);
  }

  async function safeCopy(text){
    try{
      await navigator.clipboard.writeText(String(text));
      return true;
    }catch{
      try{
        const ta = document.createElement('textarea');
        ta.value = String(text);
        ta.setAttribute('readonly','');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return !!ok;
      }catch{
        return false;
      }
    }
  }

  // Bottom dock active state + indicator
  const navItems = qsa('.dock-item');
  const indicator = qs('.dock-indicator');

  function activateDock(screen){
    const btn = navItems.find(b => b.getAttribute('data-screen') === screen);
    if(!btn) return;
    navItems.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateIndicator();
    const labelEl = btn.querySelector('.dock-tx');
    const label = (labelEl ? labelEl.textContent : (btn.getAttribute('aria-label') || screen));
    toast(String(label).trim() || 'Ready');
  }
  function updateIndicator(){
    const activeIndex = Math.max(0, navItems.findIndex(b => b.classList.contains('active')));
    const step = (indicator.parentElement.clientWidth - 20) / 5; // inner width minus padding
    indicator.style.transform = `translateX(${activeIndex * step}px)`;
  }

  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.getAttribute('data-screen');
      activateDock(screen);
      // Navigate to dedicated pages when tapping bottom nav items
      if(screen && typeof screen === 'string'){
        const s = screen.toLowerCase();
        if(s === 'power'){
          window.location.href = './power.html';
        }else if(s.includes('ai')){
          window.location.href = './ai-assets.html';
        }else if(s === 'market'){
          window.location.href = './index000.html';
        }
      }
    });
  });

  window.addEventListener('resize', updateIndicator);
  updateIndicator();

  // Optional demo actions (guarded)
  const addBtn = qs('#addFundsBtn');
  if(addBtn){
    addBtn.addEventListener('click', () => {
      const el = qs('#demoBalance');
      const raw = el.textContent.replace(/,/g,'');
      const v = Number(raw);
      const next = v + 250;
      // Format using en-US to avoid locale-specific separators like middots
      el.textContent = next.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      toast('Demo balance updated');
    });
  }

  // Invite friends / referral
  const inviteBtn = qs('#inviteFriendsBtn');
  if(inviteBtn){
    // Navigate to dedicated invite page instead of copying directly.
    inviteBtn.addEventListener('click', () => {
      window.location.href = './invite.html';
    });
  }

  // User ID chip
  const userIdEl = qs('#userIdValue');
  const copyUserIdBtn = qs('#copyUserIdBtn');
  if(userIdEl){
    const raw = (
      window.LUX_USER_ID ||
      window.USER_ID ||
      localStorage.getItem('lux_user_id') ||
      localStorage.getItem('user_id') ||
      userIdEl.textContent
    );
    const uid = String(raw || '').trim() || '750899';
    userIdEl.textContent = uid;

    if(copyUserIdBtn){
      copyUserIdBtn.addEventListener('click', async () => {
        const ok = await safeCopy(uid);
        toast(ok ? 'ID copied ✅' : 'Copy failed');
      });
    }
  }

  // Top actions
  const settingsBtn = qs('#settingsBtn');
  const settingsMenu = qs('#settingsMenu');

  function positionSettingsMenu(){
    if(!settingsBtn || !settingsMenu) return;
    const r = settingsBtn.getBoundingClientRect();
    const top = Math.round(r.bottom + 10);
    const left = Math.max(10, Math.round(r.right - settingsMenu.offsetWidth));
    settingsMenu.style.top = `${top}px`;
    settingsMenu.style.left = `${left}px`;
    settingsMenu.style.right = 'auto';
  }

  function openSettingsMenu(){
    if(!settingsMenu) return;
    positionSettingsMenu();
    settingsMenu.classList.add('show');
    settingsMenu.setAttribute('aria-hidden','false');
  }

  function closeSettingsMenu(){
    if(!settingsMenu) return;
    settingsMenu.classList.remove('show');
    settingsMenu.setAttribute('aria-hidden','true');
  }

  function toggleSettingsMenu(){
    if(!settingsMenu) return;
    const isOpen = settingsMenu.classList.contains('show');
    isOpen ? closeSettingsMenu() : openSettingsMenu();
  }

  if(settingsBtn){
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSettingsMenu();
    });
  }

  if(settingsMenu){
    settingsMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = e.target.closest('.lux-menu-item');
      if(!item) return;
const actionRaw = String(item.getAttribute('data-action') || '').trim();
if(!actionRaw) return;

const action = ({
  levels: 'member',
  bonus: 'rewards',
  email: 'security',
  how: 'guide',
  download: 'getapp'
}[actionRaw] || actionRaw);

const txEl = qs('.lux-menu-tx', item);
const label = String(txEl ? txEl.textContent : (action || 'Done')).trim();

const evMap = {
  member: ['lux:settings:member', 'lux:settings:levels'],
  rewards: ['lux:settings:rewards', 'lux:settings:bonus'],
  security: ['lux:settings:security', 'lux:settings:email'],
  language: ['lux:settings:language'],
  about: ['lux:settings:about'],
  guide: ['lux:settings:guide', 'lux:settings:how'],
  getapp: ['lux:settings:getapp', 'lux:settings:download']
};

const events = evMap[action] || [`lux:settings:${action}`];
events.forEach(ev => window.dispatchEvent(new CustomEvent(ev)));
toast(label);

      // Simple page navigation for menu items that have pages.
      if(action === 'about'){
        window.location.href = './about.html';
      }
      if(action === 'guide'){
        window.location.href = './guide.html';
      }
      if(action === 'language'){
        window.location.href = './language.html';
      }
      // Added navigation to new pages
      if(action === 'member'){
        window.location.href = './member.html';
      }
      if(action === 'rewards'){
        window.location.href = './rewards.html';
      }
      if(action === 'security'){
        window.location.href = './security.html';
      }
      closeSettingsMenu();
    });
  }

  document.addEventListener('click', () => closeSettingsMenu());
  window.addEventListener('resize', () => {
    if(settingsMenu && settingsMenu.classList.contains('show')) positionSettingsMenu();
  });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeSettingsMenu();
  });

  const notifyBtn = qs('#notifyBtn');
  if(notifyBtn){
    notifyBtn.addEventListener('click', () => {
      closeSettingsMenu();
      window.dispatchEvent(new CustomEvent('lux:notifications:open'));
      toast('Notifications');
    });
  }

// Quick actions
const quickNetworkBtn = qs('#quickNetworkBtn');
if(quickNetworkBtn){
  quickNetworkBtn.addEventListener('click', () => {
    // Navigate to the new network page instead of emitting only events.
    window.location.href = './network.html';
  });
}

// Transfer quick action: detect button by its label and navigate
const quickButtons = qsa('.lux-quick');
quickButtons.forEach(btn => {
  const labelEl = qs('.lux-quick-label', btn);
  const label = String(labelEl ? labelEl.textContent : '').trim().toLowerCase();
  if(label === 'transfer'){
    btn.addEventListener('click', () => {
      window.location.href = './transfer.html';
    });
  }
});


  // Navigate to Wallet page
  const walletBtn = qs('#walletBtn');
  if(walletBtn){
    walletBtn.addEventListener('click', () => {
      window.location.href = './wallet.html';
    });
  }
// Navigate to Analytics page
  const analyticsBtn = qs('#analyticsBtn');
  if(analyticsBtn){
    analyticsBtn.addEventListener('click', () => {
      window.location.href = './analytics.html';
    });
  }

// Show a toast for other quick buttons too (Wallet / Transfer / Analytics)
qsa('.lux-quick').forEach(btn => {
  if(btn.id) return; // handled above
  btn.addEventListener('click', () => {
    const labelEl = qs('.lux-quick-label', btn);
    const label = String(labelEl ? labelEl.textContent : (btn.getAttribute('aria-label') || 'Done')).trim();
    toast(label);
  });
});

// Subtle entrance motion
  window.addEventListener('load', () => {
    document.body.classList.add('lux-loaded');
  });
})();
