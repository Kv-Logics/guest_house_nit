const Redis = require('ioredis');
const logger = require('../utils/logger');

const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
};

// Use REDIS_URL if provided, else use options
const redis = process.env.REDIS_URL 
    ? new Redis(process.env.REDIS_URL) 
    : new Redis(redisOptions);

redis.on('connect', () => {
    logger.info('Connected to Redis successfully');
});

redis.on('error', (err) => {
    logger.error('Redis error:', err);
});

module.exports = redis;
