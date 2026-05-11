const SENSITIVE_KEYS = [
  'password',
  'token',
  'otp',
  'identity_proof_number',
  'phone',
  'authorization', // For request headers
];

const MASK = '***REDACTED***';

function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const newObj = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.includes(lowerKey)) {
        newObj[key] = MASK;
      } else {
        newObj[key] = sanitizeObject(obj[key]);
      }
    }
  }
  return newObj;
}

const log = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = meta ? JSON.stringify(sanitizeObject(meta), null, 2) : '';
  console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`, sanitizedMeta);
};

const logger = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};

module.exports = logger;