// ================================================================
// UI Helpers (Theme, Countdown, Streak, Study Plan, Timer)
// ================================================================

// ── Theme ─────────────────────────────────────────────────────
export function initTheme() {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

export function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// ── Countdown to Tawjihi ──────────────────────────────────────
export function startMinistryCountdown() {
  const examDate = new Date('July 1, 2027 00:00:00').getTime();
  const el       = document.getElementById('cd-text');
  if (!el) return;

  const tick = () => {
    const dist = examDate - Date.now();
    if (dist < 0) { el.innerText = 'انتهت المدة'; return; }
    const d = Math.floor(dist / 86400000);
    const h = Math.floor((dist % 86400000) / 3600000);
    const m = Math.floor((dist % 3600000) / 60000);
    const s = Math.floor((dist % 60000) / 1000);
    el.innerText = `${d} يوم و ${h} ساعة و ${m} دقيقة و ${s} ثانية`;
  };
  tick();
  setInterval(tick, 1000);
}

// ── Streak ────────────────────────────────────────────────────
export function updateStreak() {
  let lastV  = localStorage.getItem('lastV');
  let streak = parseInt(localStorage.getItem('streak')) || 1;
  const now  = Date.now();

  if (lastV) {
    const hrs = (now - parseInt(lastV)) / 3600000;
    if (hrs >= 24 && hrs < 48) streak++;
    else if (hrs >= 48)        streak = 1;
  }
  localStorage.setItem('lastV',   now);
  localStorage.setItem('streak',  streak);

  const el = document.getElementById('streakCount');
  if (el) el.innerText = streak;
  return streak;
}

// ── Profile ───────────────────────────────────────────────────
export function initProfile(userData) {
  const name = userData?.displayName || localStorage.getItem('studentName');

  if (name) {
    document.getElementById('profile-setup')?.classList.add('hidden');
    document.getElementById('profile-dashboard')?.classList.remove('hidden');
    const nameEl = document.getElementById('display-student-name');
    if (nameEl) nameEl.innerText = name;

    let firstVisit = localStorage.getItem('firstVisitDate');
    if (!firstVisit) { firstVisit = Date.now(); localStorage.setItem('firstVisitDate', firstVisit); }
    const daysEl = document.getElementById('profile-days');
    if (daysEl) daysEl.innerText = Math.floor((Date.now() - parseInt(firstVisit)) / 86400000) + 1;

    const streak   = parseInt(localStorage.getItem('streak')) || 1;
    const exams    = parseInt(localStorage.getItem('totalExams'))   || 0;
    const correct  = parseInt(localStorage.getItem('totalCorrect')) || 0;
    const wrong    = parseInt(localStorage.getItem('totalWrong'))   || 0;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('profile-streak', streak);
    set('profile-exams',  exams);
    set('profile-correct', correct);
    set('profile-wrong',   wrong);

    const total = correct + wrong;
    const prog  = total > 0 ? Math.round((correct / total) * 100) : 0;
    set('profile-progress-text', prog + '%');
    const bar = document.getElementById('profile-progress-bar');
    if (bar) bar.style.width = prog + '%';

    const quotes = [
      'عاش يا وحش! كمل ولا توقف 🔥',
      'كل يوم بتدرس فيه بيقربك لحلمك 🎓',
      'أنت أقوى من أي امتحان 💪',
      'الاستمرارية هي سر النجاح 🚀',
    ];
    set('motivational-quote', quotes[Math.floor(Math.random() * quotes.length)]);

    const wp       = JSON.parse(localStorage.getItem('weakPoints') || '{}');
    const weakList = document.getElementById('weak-points-list');
    if (weakList) {
      weakList.innerHTML = '';
      const arr = Object.entries(wp).sort((a, b) => b[1] - a[1]);
      if (arr.length && arr[0][1] > 0) {
        arr.slice(0, 3).forEach(([sub, w]) => {
          const li = document.createElement('li');
          li.innerHTML = `عندك <span style="color:#dc3545;">${w} أخطاء</span> في <strong>${sub}</strong>`;
          weakList.appendChild(li);
        });
      } else {
        weakList.innerHTML = '<li style="color:#28a745;">ما شاء الله! ما عندك أخطاء بعد.</li>';
      }
    }
  } else {
    document.getElementById('profile-setup')?.classList.remove('hidden');
    document.getElementById('profile-dashboard')?.classList.add('hidden');
  }
}

export function saveStudentName() {
  const input = document.getElementById('student-name-input');
  const name  = input?.value.trim();
  if (name) { localStorage.setItem('studentName', name); }
  else      { alert('اكتب اسمك يا بطل!'); }
}

// ── Study Timer ───────────────────────────────────────────────
let _timerInterval;

export function startStudyTimer() {
  clearInterval(_timerInterval);
  const mins = parseInt(document.getElementById('study-minutes-input')?.value);
  if (isNaN(mins) || mins <= 0) { alert('أدخل مدة صحيحة'); return; }

  let secs = mins * 60;
  _timerInterval = setInterval(() => {
    const m = Math.floor(secs / 60), s = secs % 60;
    const el = document.getElementById('study-timer-display');
    if (el) el.innerText = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    if (secs <= 0) { clearInterval(_timerInterval); alert('انتهى وقت الدراسة! خذ استراحة.'); }
    secs--;
  }, 1000);
}

// ── Study Plan Generator ──────────────────────────────────────
export function generatePlan() {
  const subject   = document.getElementById('sp-subject')?.value;
  const total     = parseInt(document.getElementById('sp-total')?.value);
  const completed = parseInt(document.getElementById('sp-completed')?.value) || 0;
  const level     = document.getElementById('sp-level')?.value;
  const resDiv    = document.getElementById('sp-result');
  if (!resDiv) return;

  if (isNaN(total) || total <= 0) { alert('يا بطل، دخل عدد الدروس الكلي أولاً!'); return; }
  const remaining = total - completed;
  if (remaining <= 0) { alert('ما شاء الله، أنت مخلص المادة! روح حل امتحانات.'); return; }

  resDiv.style.display = 'block';
  const density = (subject === 'الرياضيات' || subject === 'اللغة العربية') ? 1.5 : 1.0;
  let lessonsPerDay, hoursPerDay, statusNote;

  if      (level === 'weak')   { lessonsPerDay = 0.6/density; hoursPerDay = 1.5; statusNote = 'بدنا نبدأ حبة حبة. الاستمرارية هي سرك.'; }
  else if (level === 'medium') { lessonsPerDay = 1.0/density; hoursPerDay = 2.5; statusNote = 'خطة متوازنة تماماً.'; }
  else                         { lessonsPerDay = 1.8/density; hoursPerDay = 3.5; statusNote = 'خطة الأبطال! إنجاز عالي بتركيز حديدي.'; }

  const daysNeeded = Math.ceil(remaining / lessonsPerDay);
  const totalDays  = daysNeeded + Math.floor(daysNeeded / 6);

  let rows = '';
  for (let i = 1; i <= 10; i++) {
    const isRest  = i % 7 === 0;
    const dayType = isRest ? 'الجمعة (راحة ومراجعة)' : `اليوم ${i}`;
    const task    = isRest ? 'تثبيت معلومات الأسبوع' : 'دراسة المحتوى المقرر';
    const rs      = isRest ? 'background:#f9f9f9;font-weight:bold;' : '';
    rows += `<tr style="${rs}"><td style="padding:8px;border:1px solid #ddd;text-align:center;">${dayType}</td><td style="padding:8px;border:1px solid #ddd;">${task}</td><td style="padding:8px;border:1px solid #ddd;text-align:center;color:#ccc;">[ ]</td></tr>`;
  }

  resDiv.innerHTML = `
    <div style="background:rgba(10,61,98,0.05);border-right:5px solid var(--navy);padding:15px;border-radius:10px;margin-bottom:20px;">
      <h4 style="color:var(--navy);margin-bottom:5px;">تحليل الخطة 🧠</h4><p style="font-size:14px;">${statusNote}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
      <div style="background:var(--bg);padding:10px;border-radius:10px;text-align:center;border:1px solid #ddd;"><small>الدراسة اليومية</small><br><strong>${hoursPerDay} ساعة</strong></div>
      <div style="background:var(--bg);padding:10px;border-radius:10px;text-align:center;border:1px solid #ddd;"><small>إنجاز يومي</small><br><strong>${lessonsPerDay.toFixed(1)} درس</strong></div>
      <div style="background:var(--bg);padding:10px;border-radius:10px;text-align:center;border:1px solid #ddd;"><small>فترة الختم</small><br><strong>${totalDays} يوم</strong></div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;background:#fff;">
      <thead><tr style="background:var(--navy);color:#fff;"><th style="padding:10px;border:1px solid #ddd;">اليوم</th><th style="padding:10px;border:1px solid #ddd;">المهمة</th><th style="padding:10px;border:1px solid #ddd;">الحالة</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:12px;margin-top:10px;color:#666;text-align:center;">خطة مولدة بواسطة ToQuiz ✨</p>`;
}
