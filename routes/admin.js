const express = require('express');
const passport = require('passport');
const router = express.Router();

const config = require('../config');

const createRedisClient = require('../global/redis.js');
const redis = createRedisClient();

var User = require('../models/user');

function isLogginedAndAdmin(req, res, next) {
	if (req.user && req.user.isAdmin) {
		return next();
	} 

    res.status(404).send();
}

// Require login and isAdmin
router.use(isLogginedAndAdmin);


// GET : /admin/user/:uid/score - get score of an user
// Require Login Success
router.get('/:uid/score', (req, res) => {
	const { uid } = req.params;
	
	User.getUserByIdFromCache(uid).then(() => {
		res.status(200).json({
			score : user.score
		});
	}).catch((err) => {
		res.status(500).json({ error : err.message });
	});
});

router.get('/scores', (req, res) => {
	let { from, to } = req.query;
	
	if (!from) {
		from = new Date(2017, 0, 1);
	} else {
		from = new Date(from);
	}
	if (!to) {
		to = new Date();
	} else {
		to = new Date(to);
		to.setHours(24);
	}
	
	console.log(`get score from ${from.getTime()} to ${to.getTime()}`);
	
	redis.zrangebyscore(config.RedisScoreTimelineStoreKey, from.getTime(), to.getTime(), function(err, replies) {
		if (err) {
			res.status(500).json({
				error : err.message
			});
		} else {
			console.log("Return 1");
			res.status(200).json({
				count : replies.length,
				records : replies.map((it) => {
					return JSON.parse(it);
				})
			});
		}
	});
});

// DELETE: /admin/user/:uid - delete user by id
router.delete('/user', (req, res) => {
	const admin = req.user;
	
	const { uid } = req.body;
	
	if (uid) {
		User.findByIdAndRemove(uid).then(() => {
			res.status(200).send();
		}).catch((err) => {
			res.status(500).json({
				error : err.message
			});
		});
	} else {
		res.status(500).json({
			error : "uid not found"
		});
	}
});


module.exports = router;