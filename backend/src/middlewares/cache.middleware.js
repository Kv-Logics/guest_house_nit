const cache = new Map();

exports.memoryCache = (durationInSeconds) => {
    return (req, res, next) => {
        if (req.method !== 'GET') return next();
        
        const key = req.originalUrl;
        const cachedResponse = cache.get(key);
        
        if (cachedResponse && cachedResponse.expires > Date.now()) {
            return res.json(cachedResponse.data);
        }
        
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(key, { data: body, expires: Date.now() + durationInSeconds * 1000 });
            }
            originalJson(body);
        };
        
        next();
    };
};