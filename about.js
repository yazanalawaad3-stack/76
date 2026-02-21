(() => {
  // Minimal script kept for consistency with other pages.
  const toastEl = document.querySelector('#luxToast');
  const toastText = document.querySelector('#toastText');
  let t = null;

  function toast(msg){
    if(!toastEl || !toastText) return;
    toastText.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(t);
    t = setTimeout(() => toastEl.classList.remove('show'), 1200);
  }

  window.addEventListener('load', () => {
    document.body.classList.add('lux-loaded');
    // Quick feedback so you know the page is wired.
    toast('About Platform');
  });
})();
