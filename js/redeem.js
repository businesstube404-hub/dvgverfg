// ================================================================
// Redeem Code Subscription System
// ================================================================

import { auth } from './firebase-config.js';
import { refreshCurrentUserData } from './auth.js';

export async function redeemCode() {
  const input = document.getElementById('redeem-code-input');
  const status = document.getElementById('redeem-code-status');
  const code = input?.value.trim();

  if (!code) {
    if (status) status.innerText = 'أدخل كود صالح أولاً.';
    return;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    if (status) status.innerText = 'سجّل الدخول أولاً ثم أعد المحاولة.';
    return;
  }

  try {
    if (status) status.innerText = 'جاري التفعيل...';
    const token = await currentUser.getIdToken();

    const response = await fetch('/api/redeem-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (status) status.innerText = data.error || 'فشل تفعيل الكود.';
      return;
    }

    await refreshCurrentUserData();
    input.value = '';
    if (status) status.innerText = data.message || 'تم تفعيل الاشتراك بنجاح.';
    window.dispatchEvent(new CustomEvent('redeem:success', { detail: data }));
  } catch (err) {
    console.error('Redeem code failed:', err);
    if (status) status.innerText = 'صار خطأ، حاول مرة ثانية.';
  }
}
