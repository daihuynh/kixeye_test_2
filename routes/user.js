const express = require('express');
const passport = require('passport');
const router = express.Router();

const createRedisClient = require('../global/redis.js');
const redis = createRedisClient();

const config = require('../config');

var User = require('../models/user');

// POST: /user/login - login
router.post('/login', (req, res, next) => {
	const { userName, password } = req.body;
	
	console.log(`${userName} login with ${password}`);
	
	passport.authenticate('local', { session: false }, (err, user, info) => {
	    if (err) { return next(err); }
	    if (!user) { 
			return res.status(500).json({
				error : info
			}); 
		}
	
		console.log(`Cache ${userName}`);
		
		// Cache this user
		User.cache(user);

	
		console.log(`Login ${userName}`);

		// Process login
	    req.logIn(user, function(err) {
	      if (err) { return next(err); }

	      return res.status(200).send();
	    });

	})(req, res, next);
});


// PUT: /user - update user props
// Require Login Success
router.put('/', isLoggedIn, (req, res) => {
	const authUser = req.user;
	
	const { userName } = req.body;
	
	if (userName && userName != authUser.userName) {
		User.findOne({userName : userName}).then((foundUser) => {
			if (foundUser) {
				res.status(500).json({
					error : `${userName} is exists`
				});
			} else {
				// No one has this user name
				User.findByIdAndUpdate(authUser.id, {
					$set: {
						userName : userName
					}
				}).then(() => {
					res.status(200).send();
				}).catch((err) => {
					res.status(500).json({
						error : err.message
					});
				});
			}
		}).catch((err) => {
			res.status(500).json({
				error : err.message
			});
		});
	} else {
		res.status(500).json({
			error : 'userName is not valid'
		});
	}
});

// POST : /user/score - submit score
// Require Login Success
router.post('/score', isLoggedIn, (req, res) => {
	const { score } = req.body;
	const authUser = req.user;
	
	User.findByIdAndUpdate(authUser.id, {
			$set: {
				score : score
			},
			$inc: {
				scoreUpdateCount : 1
			}
	}).then((user) => {
		console.log(`Find ${user.userName} with score ${user.score}`);

		// Re-cache
		User.cache(user);
		
		// Timeline for tracking
		const timelineData = [config.RedisScoreTimelineStoreKey, new Date().getTime(), JSON.stringify({ 
			id : user.id, 
			userName: user.userName, 
			score : score})];
		redis.zadd(timelineData, (err, response) => {
			if (err) {
				console.log(`Update timeline error ${err}`);
			}
		});
		
		// Ranking
		console.log(`Storing score to ${config.RedisScoreStoreKey}`);
		const scoreData = [config.RedisScoreStoreKey, score, user.id];
		redis.zadd(scoreData, (err, response) => {
			if (err) res.status(500).json({ error : err.message});
			
			console.log(`Store ${user.userName} score success`);
			
			redis.publish("score", JSON.stringify({
				userName : user.userName,
				score : score
			}));
			
			res.status(200).send();
		});
	}).catch((err) => {
		res.status(500).json({error : err.message});
	});
});

function isLoggedIn(req, res, next) {
    if (req.user)
        return next();

    res.status(400).json({
    	error : "Require login"
    });
}

module.exports = router;