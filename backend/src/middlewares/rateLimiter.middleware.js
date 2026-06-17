const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const redisClient = require('../db/redis');

exports.apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:api:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:auth:',
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000000, // Limit each IP to 10 failed/auth requests per `window`
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 1 hour.',
  },
});
