export const openWhatsApp = (phone?: string) => {
  if (!phone) {
    alert("WhatsApp cannot be opened because this lead does not have a valid phone number.");
    return;
  }
  const normalized = phone.replace(/[^0-9]/g, '');
  if (!normalized) {
    alert("Invalid WhatsApp number.");
    return;
  }
  const url = `https://web.whatsapp.com/send?phone=${normalized}`;
  const newWin = window.open(url, '_blank', 'noopener,noreferrer');
  if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
    alert("Please allow pop-ups for Techzon CRM to open WhatsApp Web.");
  }
};
