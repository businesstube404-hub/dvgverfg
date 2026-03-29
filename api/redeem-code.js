import { admin, getAdminAuth, getAdminDb } from './_lib/firebaseAdmin.js';

const OWNER_ACCESS_CODE = 'OWNER-ACCESS';

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed');
  }

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return sendError(res, 401, 'Missing authentication token');
    }

    const { code } = req.body || {};
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode) {
      return sendError(res, 400, 'Code is required');
    }

    const decoded = await getAdminAuth().verifyIdToken(token);
    const uid = decoded.uid;
    const db = getAdminDb();
    const userRef = db.collection('users').doc(uid);
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (normalizedCode === OWNER_ACCESS_CODE) {
      await userRef.set({
        uid,
        email: decoded.email || null,
        displayName: decoded.name || null,
        photoURL: decoded.picture || null,
        plan: 'premium',
        role: 'admin',
        subscriptionType: 'VVIP',
        adminAccess: true,
        adminCode: OWNER_ACCESS_CODE,
        activatedAt: now,
        updatedAt: now,
      }, { merge: true });

      return res.status(200).json({
        success: true,
        message: 'Owner access granted successfully.',
        plan: 'premium',
        role: 'admin',
      });
    }

    const codeRef = db.collection('redeemCodes').doc(normalizedCode);

    const result = await db.runTransaction(async (tx) => {
      const [codeSnap, userSnap] = await Promise.all([
        tx.get(codeRef),
        tx.get(userRef),
      ]);

      const existingUser = userSnap.data() || {};
      if (existingUser.role === 'admin' || existingUser.adminAccess === true) {
        return { plan: 'premium', role: 'admin', alreadyAdmin: true };
      }

      if (!codeSnap.exists) {
        throw Object.assign(new Error('Invalid redeem code'), { status: 404 });
      }

      const codeData = codeSnap.data() || {};
      if (codeData.used) {
        throw Object.assign(new Error('This code has already been used'), { status: 409 });
      }

      if (!['free', 'premium'].includes(codeData.plan)) {
        throw Object.assign(new Error('Invalid code plan'), { status: 400 });
      }

      tx.update(codeRef, {
        used: true,
        usedBy: uid,
        usedAt: now,
      });

      tx.set(userRef, {
        uid,
        email: decoded.email || existingUser.email || null,
        displayName: decoded.name || existingUser.displayName || null,
        photoURL: decoded.picture || existingUser.photoURL || null,
        plan: codeData.plan,
        role: existingUser.role || 'user',
        subscriptionType: codeData.plan === 'premium' ? 'VIP' : 'FREE',
        redeemedCode: normalizedCode,
        redeemedAt: now,
        updatedAt: now,
      }, { merge: true });

      return {
        plan: codeData.plan,
        role: existingUser.role || 'user',
      };
    });

    return res.status(200).json({
      success: true,
      message: result.alreadyAdmin ? 'Owner access already active.' : (result.plan === 'premium' ? 'Premium subscription activated.' : 'Code activated.'),
      plan: result.plan,
      role: result.role,
      alreadyAdmin: !!result.alreadyAdmin,
    });
  } catch (err) {
    console.error('Redeem code error:', err);
    const status = err.status || 500;
    const message =
      status === 401 ? 'Unauthorized' :
      status === 404 ? 'Invalid code' :
      status === 409 ? 'Code already used' :
      status === 400 ? 'Invalid code' :
      'Failed to redeem code';
    return sendError(res, status, message);
  }
}
