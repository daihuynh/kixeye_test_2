const express = require('express');
const router = express.Router();

const User = require('../models/user');

router.put('/users', (req, res) => {
	console.log('Create data...');
    const admin = new User({
      userName: 'admin',
      password: '123',
      isAdmin: true
    });
	const p1 = admin.save();
	
    const user1 = new User({
      userName: 'user1',
      password: '123',
      isAdmin: false,
    });
	const p2 = user1.save();
	
    const user2 = new User({
      userName: 'user2',
      password: '123',
      isAdmin: false,
    });
	const p3 = user2.save();
	
    const user3 = new User({
      userName: 'user3',
      password: '123',
      isAdmin: false,
    });
	const p4 = user3.save();
	
    const user4 = new User({
      userName: 'user4',
      password: '123',
      isAdmin: false,
    });
	const p5 = user4.save();
	
	Promise.all([p1, p2, p3, p4, p5])
		.then(() => {
		  res.status(200).send();
      },
      (err) => {
		  res.status(500).json({error : err.message});
      });
});
/**
 * Delete all users in DB
 */
router.delete('/users', (req, res) => {
	User.remove({}, function (err) {
		res.status(200);
	});
});


module.exports = router;