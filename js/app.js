// ================================================================
// Main App Entry Point
// ================================================================

import { signInWithGoogle, signOutUser, onAuthChange, getCurrentPlan, getCurrentUserData } from './auth.js';
import { PLANS, canUse, getLimit, checkAiChatLimit, incrementAiChatUsage } from './subscription.js';
import { loadQuestions, getSubjectQuestions, startExam, prevQuestion, nextOrFinish, confirmExitExam, finishExam, ALL_QUESTIONS } from './exam.js';
import { initTheme, toggleTheme, startMinistryCountdown, updateStreak, initProfile, saveStudentName, startStudyTimer, generatePlan } from './ui.js';

// ── SUBJECTS CONFIG ───────────────────────────────────────────
const SUBJECTS = [
  { id: 'deen',    name: 'التربية الإسلامية', icon: 'fa-mosque',     color: '#1a7a4a' },
  { id: 'math',    name: 'الرياضيات',         icon: 'fa-calculator', color: '#0a3d62' },
  { id: 'arabic',  name: 'اللغة العربية',      icon: 'fa-language',   color: '#7b2d8b' },
  { id: 'history', name: 'تاريخ الأردن',      icon: 'fa-landmark',   color: '#c0392b' },
];

// ── VIEW MANAGEMENT ───────────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById('view-' + id);
  if (el) el.classList.remove('hidden');
  window.scrollTo(0, 0);
  if (id === 'profile')      initProfile(getCurrentUserData());
  if (id === 'subjects-page') renderSubjectsGrid();
  if (id === 'study-plan')    renderStudyPlanAdmin();
}


function isStudyPlanAdmin() {
  return localStorage.getItem('toquizAdminMode') === '1';
}

function renderStudyPlanAdmin() {
  const panel = document.getElementById('admin-access-panel');
  const label = document.getElementById('admin-mode-label');
  if (label) label.innerText = isStudyPlanAdmin() ? 'إيقاف وضع المالك' : 'تفعيل وضع المالك';
  if (!panel) return;

  if (!isStudyPlanAdmin()) {
    panel.innerHTML = `
      <div style="padding:16px;border:1px dashed #cbd5e1;border-radius:16px;background:rgba(10,61,98,0.03);">
        <p style="margin-bottom:10px;color:var(--text-muted);">فعّل وضع المالك لعرض كل الخطط وكل الأسئلة.</p>
        <ul style="padding-right:18px;line-height:1.9;color:var(--text-muted);">
          <li>ترتيب الخطط</li>
          <li>عرض جميع الأسئلة</li>
          <li>عرض كل المواد</li>
        </ul>
      </div>`;
    return;
  }

  const planCards = Object.entries(PLANS).map(([key, plan]) => `
    <div style="border:1px solid #e2e8f0;border-radius:16px;padding:14px;background:var(--card-bg);">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <strong>${plan.icon} ${plan.name}</strong>
        <span class="${plan.badgeClass}" style="padding:4px 10px;border-radius:999px;font-size:12px;">${key}</span>
      </div>
      <ul style="margin-top:10px;padding-right:18px;line-height:1.8;">
        ${plan.features.map(f => `<li>${f.text} ${f.ok ? '✅' : '❌'}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  const grouped = {};
  ALL_QUESTIONS.forEach(q => {
    if (!grouped[q.subject]) grouped[q.subject] = [];
    grouped[q.subject].push(q);
  });

  const questionsHtml = Object.entries(grouped).map(([subject, qs]) => `
    <details style="border:1px solid #e2e8f0;border-radius:16px;padding:12px;background:var(--card-bg);margin-bottom:10px;">
      <summary style="font-weight:800;cursor:pointer;">${subject} — ${qs.length} سؤال</summary>
      <div style="margin-top:12px;display:grid;gap:10px;">
        ${qs.map((q, idx) => `
          <div style="padding:12px;border-radius:12px;background:rgba(10,61,98,0.03);border:1px solid #eef2f7;">
            <div style="font-weight:700;margin-bottom:6px;">${idx + 1}. ${q.question}</div>
            <div style="font-size:14px;line-height:1.7;color:var(--text-muted);">
              ${q.options.map((opt, i) => `<div>${['أ','ب','ج','د'][i]}) ${opt}</div>`).join('')}
            </div>
            <div style="margin-top:8px;font-weight:800;color:#16a34a;">الإجابة الصحيحة: ${['أ','ب','ج','د'][q.correct]}</div>
          </div>
        `).join('')}
      </div>
    </details>
  `).join('');

  panel.innerHTML = `
    <div style="display:grid;gap:14px;">
      <div>
        <h3 style="margin-bottom:10px;">الخطط المتاحة</h3>
        <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));">${planCards}</div>
      </div>
      <div>
        <h3 style="margin-bottom:10px;">كل الأسئلة (${ALL_QUESTIONS.length})</h3>
        <div style="display:grid;gap:12px;">${questionsHtml}</div>
      </div>
    </div>`;
}

function toggleStudyPlanAdmin() {
  const current = localStorage.getItem('toquizAdminMode') === '1';
  localStorage.setItem('toquizAdminMode', current ? '0' : '1');
  renderStudyPlanAdmin();
}

// ── AUTH UI UPDATE ────────────────────────────────────────────
function updateAuthUI(user, userData) {
  const loginBtn    = document.getElementById('btn-login');
  const userMenu    = document.getElementById('user-menu');
  const userAvatar  = document.getElementById('user-avatar');
  const userName    = document.getElementById('user-name-header');
  const planBadge   = document.getElementById('plan-badge-header');
  const upgradeBtn  = document.getElementById('btn-upgrade-header');

  if (user && userData) {
    loginBtn?.classList.add('hidden');
    userMenu?.classList.remove('hidden');
    if (userAvatar)  userAvatar.src = user.photoURL || '';
    if (userName)    userName.innerText = user.displayName?.split(' ')[0] || '';

    const plan = userData.subscriptionType || 'FREE';
    const cfg  = PLANS[plan];
    if (planBadge) {
      planBadge.innerText   = cfg.icon + ' ' + cfg.name;
      planBadge.className   = `plan-badge-header ${cfg.badgeClass}`;
    }
    // Show upgrade btn only for FREE users
    if (upgradeBtn) upgradeBtn.classList.toggle('hidden', plan !== 'FREE');
  } else {
    loginBtn?.classList.remove('hidden');
    userMenu?.classList.add('hidden');
    if (planBadge) { planBadge.innerText = '🆓 مجاني'; planBadge.className = 'plan-badge-header plan-badge-FREE'; }
    if (upgradeBtn) upgradeBtn?.classList.remove('hidden');
  }
  if (document.getElementById('view-study-plan') && !document.getElementById('view-study-plan').classList.contains('hidden')) {
    renderStudyPlanAdmin();
  }
}

// ── SUBJECTS GRID ─────────────────────────────────────────────
function renderSubjectsGrid() {
  const grid = document.getElementById('subjectsGrid');
  if (!grid) return;
  const plan = getCurrentPlan();
  grid.innerHTML = '';

  SUBJECTS.forEach(sub => {
    const qs      = getSubjectQuestions(sub.name);
    const qCount  = qs.length;
    const card    = document.createElement('div');
    card.className = 'subject-card';

    if (!qCount) {
      card.style.opacity = '0.7';
      card.style.cursor  = 'default';
      card.innerHTML = `
        <i class="fa ${sub.icon} subject-icon" style="color:${sub.color}"></i>
        <h3>${sub.name}</h3>
        <div class="q-count" style="color:#aaa;"><i class="fa fa-clock"></i> قريباً</div>`;
    } else {
      const maxQ     = getLimit(plan, 'maxQuestionsPerExam');
      const showQ    = Math.min(qCount, maxQ);
      const isLimited = plan === 'FREE' && qCount > maxQ;

      card.innerHTML = `
        <i class="fa ${sub.icon} subject-icon" style="color:${sub.color}"></i>
        <h3>${sub.name}</h3>
        <div class="q-count"><i class="fa fa-question-circle"></i> ${showQ} سؤال${isLimited ? ' <small>(FREE)</small>' : ''}</div>
        <button class="btn btn-sm" style="margin-top:12px;width:100%;background:${sub.color};">ابدأ الامتحان</button>`;

      card.querySelector('.btn').addEventListener('click', () => {
        startExam(sub, () => showView('exam'));
        updateFreeBanner();
      });
    }
    grid.appendChild(card);
  });
}

function updateFreeBanner() {
  const plan   = getCurrentPlan();
  const banner = document.getElementById('free-limit-banner');
  if (!banner) return;
  if (plan === 'FREE') {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

// ── AI CHAT (Salah) ───────────────────────────────────────────
function openSalah() {
  const plan = getCurrentPlan();
  if (!canUse(plan, 'aiChatEnabled')) {
    showUpgradeModal('الذكاء الاصطناعي صلاح متاح لمشتركي VIP و VVIP فقط 🤖', plan);
    return;
  }
  if (!checkAiChatLimit(plan)) {
    showUpgradeModal(`وصلت للحد اليومي (${getLimit(plan,'aiChatDailyLimit')} رسائل). ترقّ لـ VVIP لرسائل بلا حدود! 💎`, plan);
    return;
  }
  document.getElementById('salahModal')?.classList.remove('hidden');
}

function closeSalah() {
  document.getElementById('salahModal')?.classList.add('hidden');
}

async function sendSalah() {
  const inp       = document.getElementById('salahInput');
  const userText  = inp?.value.trim();
  if (!userText) return;

  const plan = getCurrentPlan();
  if (!checkAiChatLimit(plan)) {
    closeSalah();
    showUpgradeModal('وصلت للحد اليومي 💬 ترقّ لـ VVIP للحصول على رسائل غير محدودة!', plan);
    return;
  }

  const msgContainer = document.getElementById('salahMessages');
  const userMsg      = document.createElement('div');
  userMsg.className  = 'msg user-msg';
  userMsg.innerText  = userText;
  msgContainer.appendChild(userMsg);
  if (inp) inp.value = '';

  const botMsg      = document.createElement('div');
  botMsg.className  = 'msg salah-msg';
  botMsg.innerHTML  = '<i class="fa fa-spinner fa-spin" style="color:#ffd700"></i> صلاح بيفكر...';
  msgContainer.appendChild(botMsg);
  msgContainer.scrollTop = msgContainer.scrollHeight;

  const currentDate = new Date().toLocaleDateString('ar-JO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const messages = [
    { role: 'system', content: `أنت "صلاح"، مساعد دراسي ذكي لطلاب التوجيهي في الأردن وفلسطين. اللهجة أردنية/فلسطينية. أجب فقط على الأسئلة الدراسية. اليوم: ${currentDate}.` },
    { role: 'user',   content: userText },
  ];

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    const data = await response.json();
    if (data.choices?.[0]) {
      botMsg.innerHTML = data.choices[0].message.content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      incrementAiChatUsage();
    } else {
      botMsg.innerText = 'في مشكلة، جرب كمان شوي يا بطل.';
    }
  } catch {
    botMsg.innerText = 'تأكد من النت عندك يا غالي!';
  }
  msgContainer.scrollTop = msgContainer.scrollHeight;
}

// ── UPGRADE MODAL ─────────────────────────────────────────────
function showUpgradeModal(message, currentPlan) {
  const modal = document.getElementById('upgradeModal');
  const msg   = document.getElementById('upgrade-modal-msg');
  if (msg)   msg.innerText = message;
  if (modal) modal.classList.remove('hidden');
}

function closeUpgradeModal() {
  document.getElementById('upgradeModal')?.classList.add('hidden');
}

// ── ANSWER REVIEW (gated) ─────────────────────────────────────
function toggleReview() {
  const plan = getCurrentPlan();
  if (!canUse(plan, 'answerReviewEnabled')) {
    showUpgradeModal('مراجعة الإجابات التفصيلية متاحة لمشتركي VIP و VVIP فقط ⭐', plan);
    return;
  }
  const reviewDiv = document.getElementById('answers-review');
  if (reviewDiv) reviewDiv.style.display = reviewDiv.style.display === 'none' ? 'block' : 'none';
}

// ── INIT ──────────────────────────────────────────────────────
async function init() {
  initTheme();
  startMinistryCountdown();
  updateStreak();

  // Load questions from JSON
  await loadQuestions();
  renderSubjectsGrid();

  // Auth state listener
  onAuthChange((user, userData) => {
    updateAuthUI(user, userData);
    renderSubjectsGrid();
  });
}

// ── EXPOSE GLOBALS (for HTML onclick attrs) ───────────────────
window.showView          = showView;
window.toggleTheme       = toggleTheme;
window.signInWithGoogle  = signInWithGoogle;
window.signOutUser       = signOutUser;
window.openSalah         = openSalah;
window.closeSalah        = closeSalah;
window.sendSalah         = sendSalah;
window.showUpgradeModal  = showUpgradeModal;
window.closeUpgradeModal = closeUpgradeModal;
window.toggleReview      = toggleReview;
window.toggleStudyPlanAdmin = toggleStudyPlanAdmin;
window.saveStudentName   = saveStudentName;
window.startStudyTimer   = startStudyTimer;
window.generatePlan      = generatePlan;
window.prevQuestion      = () => prevQuestion();
window.nextOrFinish      = () => nextOrFinish(() => showView('result'));
window.confirmExitExam   = () => confirmExitExam(() => showView('subjects-page'));
window.retryExam         = () => { const { subject } = window._examState || {}; if (subject) startExam(subject, () => showView('exam')); };

// Store exam state ref for retry
import('./exam.js').then(mod => { window._examState = mod.examState; });

document.addEventListener('DOMContentLoaded', init);
