export const openWhatsApp = (phone?: string) => {
  if (!phone) {
    alert("WhatsApp cannot be opened because this lead does not have a valid phone number.");
    return;
  }
  
  let normalized = phone.replace(/[^0-9]/g, '');
  if (!normalized) {
    alert("Invalid WhatsApp number.");
    return;
  }
  
  // Normalize 10-digit Indian numbers by prepending 91
  if (normalized.length === 10) {
    normalized = `91${normalized}`;
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    const url = `https://wa.me/${normalized}`;
    window.location.href = url;
  } else {
    const url = `https://web.whatsapp.com/send?phone=${normalized}`;
    const newWin = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      alert("Please allow pop-ups for Techzon CRM to open WhatsApp Web.");
    }
  }
};
