(() => {
  const qs = (s, el=document) => el.querySelector(s);

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

  const addrEl = qs('#walletAddressText');
  const canvas = qs('#qrCanvas');
  const copyBtn = qs('#copyAddressBtn');
  const refreshBtn = qs('#walletRefreshBtn');

  function renderQR(){
    const address = String(addrEl.textContent || '').trim();
    if(!address) return;

    // Render QR (black on white for best scan reliability)
    if(window.QRCode && window.QRCode.toCanvas){
      window.QRCode.toCanvas(canvas, address, { width: 220, margin: 1 }, (err) => {
        if(err){
          console.error(err);
        }
      });
    }
  }

  if(copyBtn){
    copyBtn.addEventListener('click', async () => {
      const address = String(addrEl.textContent || '').trim();
      if(!address) return toast('No address');
      const ok = await safeCopy(address);
      toast(ok ? 'Address copied' : 'Copy failed');
    });
  }

  if(refreshBtn){
    refreshBtn.addEventListener('click', () => {
      // Future: fetch a fresh address from API.
      // For now, just re-render QR and give feedback.
      renderQR();
      toast('Updated');
    });
  }

  // Also allow tapping the QR to copy
  if(canvas){
    canvas.addEventListener('click', async () => {
      const address = String(addrEl.textContent || '').trim();
      if(!address) return;
      const ok = await safeCopy(address);
      toast(ok ? 'Copied from QR' : 'Copy failed');
    });
  }

  window.addEventListener('load', renderQR);
})();
