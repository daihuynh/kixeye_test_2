const redis = require('redis');

module.exports = () => {
	let redisClient = {};

	if (process.env.REDIS_URL) {
		redisClient = redis.createClient(process.env.REDIS_URL);
	} else {
		redisClient = redis.createClient(6379, "127.0.0.1");
	}
	
	return redisClient;
};