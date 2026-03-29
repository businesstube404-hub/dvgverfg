// ================================================================
// Exam Engine
// ================================================================

import { PLANS, canUse, getLimit } from './subscription.js';
import { getCurrentPlan } from './auth.js';

// ── Questions Data (loaded from questions.json) ───────────────
export let ALL_QUESTIONS = [];

export async function loadQuestions() {
  try {
    const res   = await fetch('questions.json');
    ALL_QUESTIONS = await res.json();
  } catch (e) {
    console.error('Failed to load questions.json', e);
  }
}

export function getSubjectQuestions(subjectName) {
  return ALL_QUESTIONS.filter(q => q.subject === subjectName);
}

// ── Exam State ────────────────────────────────────────────────
export const examState = {
  subject:       null,
  questions:     [],
  currentIdx:    0,
  userAnswers:   [],
  timerSec:      0,
  timerInterval: null,
};

// ── Helpers ───────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Start Exam ────────────────────────────────────────────────
export function startExam(subject, onStarted) {
  const plan      = getCurrentPlan();
  const maxQ      = getLimit(plan, 'maxQuestionsPerExam');
  let questions   = getSubjectQuestions(subject.name);

  if (!questions.length) {
    alert('لا توجد أسئلة لهذه المادة بعد.');
    return;
  }

  // FREE plan: shuffle and limit
  if (questions.length > maxQ) {
    questions = shuffle(questions).slice(0, maxQ);
  }

  // Reset state
  clearInterval(examState.timerInterval);
  Object.assign(examState, {
    subject,
    questions,
    currentIdx:    0,
    userAnswers:   new Array(questions.length).fill(null),
    timerSec:      0,
    timerInterval: null,
  });

  // Start timer
  examState.timerInterval = setInterval(() => {
    examState.timerSec++;
    const m   = Math.floor(examState.timerSec / 60).toString().padStart(2, '0');
    const s   = (examState.timerSec % 60).toString().padStart(2, '0');
    const el  = document.getElementById('examTimerDisplay');
    if (el) el.innerText = `${m}:${s}`;
  }, 1000);

  if (onStarted) onStarted();
  renderQuestion();
}

// ── Render Question ───────────────────────────────────────────
export function renderQuestion() {
  const { questions, currentIdx, userAnswers } = examState;
  const q     = questions[currentIdx];
  const total = questions.length;

  document.getElementById('currentQIndex').innerText = currentIdx + 1;
  document.getElementById('totalQCount').innerText   = total;
  document.getElementById('questionText').innerText  = q.question;
  document.getElementById('progressBar').style.width = ((currentIdx + 1) / total * 100) + '%';

  const prevBtn  = document.getElementById('prevBtn');
  const nxtBtn   = document.getElementById('nextOrFinishBtn');
  prevBtn.style.visibility = currentIdx === 0 ? 'hidden' : 'visible';
  nxtBtn.innerHTML = currentIdx === total - 1
    ? 'إنهاء الامتحان <i class="fa fa-flag-checkered"></i>'
    : 'التالي <i class="fa fa-arrow-left"></i>';

  const letters   = ['أ', 'ب', 'ج', 'د'];
  const container = document.getElementById('optionsContainer');
  container.innerHTML = '';

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';

    const isSelected = userAnswers[currentIdx] === i;
    if (isSelected) {
      btn.classList.add('selected');
      btn.innerHTML = `<span>${opt}</span><span class="option-letter">${letters[i]}</span>`;
    } else {
      btn.innerHTML = `<span>${opt}</span><span class="option-letter-plain">${letters[i]}</span>`;
    }

    btn.onclick = () => selectOption(i);
    container.appendChild(btn);
  });
}

// ── Select Option ─────────────────────────────────────────────
function selectOption(optionIdx) {
  examState.userAnswers[examState.currentIdx] = optionIdx;
  const letters = ['أ', 'ب', 'ج', 'د'];
  document.querySelectorAll('.option-btn').forEach((btn, i) => {
    btn.classList.remove('selected');
    const span = btn.querySelector('span:last-child');
    if (i === optionIdx) {
      btn.classList.add('selected');
      span.className = 'option-letter';
    } else {
      span.className = 'option-letter-plain';
    }
  });
}

// ── Navigate ──────────────────────────────────────────────────
export function prevQuestion() {
  if (examState.currentIdx > 0) {
    examState.currentIdx--;
    renderQuestion();
  }
}

export function nextOrFinish(onFinish) {
  if (examState.currentIdx < examState.questions.length - 1) {
    examState.currentIdx++;
    renderQuestion();
  } else {
    finishExam(onFinish);
  }
}

export function confirmExitExam(onExit) {
  if (confirm('هل تريد الخروج من الامتحان؟ ستُفقد إجاباتك.')) {
    clearInterval(examState.timerInterval);
    if (onExit) onExit();
  }
}

// ── Finish Exam ───────────────────────────────────────────────
export function finishExam(onDone) {
  clearInterval(examState.timerInterval);
  const { questions, userAnswers } = examState;

  let correct = 0, wrong = 0, unanswered = 0;
  questions.forEach((q, i) => {
    const a = userAnswers[i];
    if (a === null)       unanswered++;
    else if (a === q.correct) correct++;
    else                      wrong++;
  });

  const total   = questions.length;
  const percent = Math.round((correct / total) * 100);

  // Save stats
  recordExamStats(correct, wrong + unanswered, examState.subject?.name ?? '');

  // Result messages
  let msg, sub;
  if      (percent >= 90) { msg = '🏆 ممتاز! أداء رائع جداً!';           sub = 'أنت على المسار الصحيح للنجاح بتفوق.'; }
  else if (percent >= 75) { msg = '🌟 جيد جداً! استمر على هذا المستوى'; sub = 'مراجعة بسيطة ستجعلك في القمة.'; }
  else if (percent >= 60) { msg = '👍 جيد، لكن تحتاج مراجعة';           sub = 'ركز على الأسئلة التي أخطأت فيها.'; }
  else if (percent >= 40) { msg = '📚 تحتاج مزيداً من الدراسة';          sub = 'راجع المادة مرة أخرى وأعد الامتحان.'; }
  else                    { msg = '💪 لا تيأس! البداية صعبة';            sub = 'درّس المادة من الأساس وأعد المحاولة.'; }

  document.getElementById('result-percent').innerText = percent + '%';
  document.getElementById('result-correct').innerText = correct;
  document.getElementById('result-wrong').innerText   = wrong + unanswered;
  document.getElementById('result-total').innerText   = total;
  document.getElementById('result-msg').innerText     = msg;
  document.getElementById('result-sub').innerText     = sub;

  // Build answer review list
  buildAnswerReview(questions, userAnswers);

  if (onDone) onDone(percent, correct, wrong + unanswered, total);
}

function buildAnswerReview(questions, userAnswers) {
  const reviewList = document.getElementById('review-list');
  if (!reviewList) return;
  reviewList.innerHTML = '';
  const letters = ['أ', 'ب', 'ج', 'د'];

  questions.forEach((q, i) => {
    const userAns   = userAnswers[i];
    const isCorrect = userAns === q.correct;
    const div       = document.createElement('div');
    div.className   = `review-item ${isCorrect ? 'r-correct' : 'r-wrong'}`;

    let answerInfo = '';
    if (userAns === null) {
      answerInfo = `<div class="review-your" style="color:#f39c12;">⚠️ لم تجب على هذا السؤال</div>`;
    } else if (!isCorrect) {
      answerInfo = `
        <div class="review-your">❌ إجابتك: ${letters[userAns]}. ${q.options[userAns]}</div>
        <div class="review-correct-ans">✅ الصحيحة: ${letters[q.correct]}. ${q.options[q.correct]}</div>`;
    } else {
      answerInfo = `<div class="review-correct-ans">✅ إجابتك صحيحة: ${letters[q.correct]}. ${q.options[q.correct]}</div>`;
    }

    div.innerHTML = `<div class="review-q">${i + 1}. ${q.question}</div><div class="review-answers">${answerInfo}</div>`;
    reviewList.appendChild(div);
  });
}

// ── Stats ─────────────────────────────────────────────────────
function recordExamStats(correctCount, wrongCount, subjectName) {
  localStorage.setItem('totalExams',   (parseInt(localStorage.getItem('totalExams')   || 0) + 1));
  localStorage.setItem('totalCorrect', (parseInt(localStorage.getItem('totalCorrect') || 0) + correctCount));
  localStorage.setItem('totalWrong',   (parseInt(localStorage.getItem('totalWrong')   || 0) + wrongCount));
  const wp = JSON.parse(localStorage.getItem('weakPoints') || '{}');
  wp[subjectName] = (wp[subjectName] || 0) + wrongCount;
  localStorage.setItem('weakPoints', JSON.stringify(wp));
}
