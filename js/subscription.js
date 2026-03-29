// ================================================================
// Subscription Plans & Feature Gates
// ================================================================

export const PLANS = {
  FREE: {
    name: 'مجاني',
    nameEn: 'FREE',
    price: 0,
    period: '',
    icon: '🆓',
    color: '#6c757d',
    badgeClass: 'plan-badge-FREE',
    maxQuestionsPerExam: 10,
    aiChatEnabled: false,
    aiChatDailyLimit: 0,
    answerReviewEnabled: false,
    studyPlanEnabled: false,
    features: [
      { text: '10 أسئلة لكل امتحان', ok: true },
      { text: 'مادة التربية الإسلامية', ok: true },
      { text: 'نتيجة بسيطة', ok: true },
      { text: 'الذكاء الاصطناعي صلاح', ok: false },
      { text: 'مراجعة الإجابات', ok: false },
      { text: 'الخطة الدراسية', ok: false },
      { text: 'جميع المواد', ok: false },
    ],
  },

  VIP: {
    name: 'VIP',
    nameEn: 'VIP',
    price: 5,
    period: '/شهر',
    icon: '⭐',
    color: '#ffd700',
    badgeClass: 'plan-badge-VIP',
    maxQuestionsPerExam: 60,
    aiChatEnabled: true,
    aiChatDailyLimit: 20,
    answerReviewEnabled: true,
    studyPlanEnabled: true,
    features: [
      { text: 'جميع الأسئلة (60 سؤال)', ok: true },
      { text: 'جميع المواد المتاحة', ok: true },
      { text: 'نتيجة كاملة', ok: true },
      { text: 'الذكاء الاصطناعي صلاح (20 رسالة/يوم)', ok: true },
      { text: 'مراجعة الإجابات التفصيلية', ok: true },
      { text: 'الخطة الدراسية الذكية', ok: true },
      { text: 'دعم عادي', ok: true },
    ],
  },

  VVIP: {
    name: 'VVIP',
    nameEn: 'VVIP',
    price: 10,
    period: '/شهر',
    icon: '💎',
    color: '#64c8ff',
    badgeClass: 'plan-badge-VVIP',
    maxQuestionsPerExam: 60,
    aiChatEnabled: true,
    aiChatDailyLimit: Infinity,
    answerReviewEnabled: true,
    studyPlanEnabled: true,
    features: [
      { text: 'كل مميزات VIP', ok: true },
      { text: 'ذكاء اصطناعي بلا حدود', ok: true },
      { text: 'وصول للمواد الجديدة أولاً', ok: true },
      { text: 'شارة VVIP حصرية', ok: true },
      { text: 'دعم أولوية على واتساب', ok: true },
      { text: 'اختبارات تجريبية حصرية', ok: true },
    ],
  },
};

/**
 * Check if a plan can use a specific feature.
 * @param {string} planName - 'FREE' | 'VIP' | 'VVIP'
 * @param {string} feature  - key from PLANS config
 */
export function canUse(planName, feature) {
  const plan = PLANS[planName] ?? PLANS.FREE;
  return !!plan[feature];
}

/**
 * Get numeric limit for a feature.
 */
export function getLimit(planName, feature) {
  const plan = PLANS[planName] ?? PLANS.FREE;
  return plan[feature] ?? 0;
}

/**
 * Check if user can access AI chat today (daily limit tracking).
 */
export function checkAiChatLimit(planName) {
  if (!canUse(planName, 'aiChatEnabled')) return false;
  const limit = getLimit(planName, 'aiChatDailyLimit');
  if (limit === Infinity) return true;

  const today = new Date().toDateString();
  const stored = JSON.parse(localStorage.getItem('aiChatUsage') || '{}');
  const used = stored[today] || 0;
  return used < limit;
}

export function incrementAiChatUsage() {
  const today = new Date().toDateString();
  const stored = JSON.parse(localStorage.getItem('aiChatUsage') || '{}');
  stored[today] = (stored[today] || 0) + 1;
  localStorage.setItem('aiChatUsage', JSON.stringify(stored));
}
