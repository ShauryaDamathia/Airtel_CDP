const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

/**
 * Verify JWT and attach user info to req.user.
 * Use as: app.get('/route', requireAuth, handler)
 */
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;  // { id, email, role, full_name }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require one of the given roles. Admins always allowed.
 * Use as: app.post('/route', requireAuth, requireRole('marketer'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role === 'admin') return next();
    if (roles.includes(req.user.role)) return next();
    res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}` });
  };
}

module.exports = { requireAuth, requireRole, JWT_SECRET };
