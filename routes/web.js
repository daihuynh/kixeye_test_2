var express = require('express');
var router = express.Router();

var config = require('../config');

/* GET home page. */
router.get('/', isLoggedIn, function (req, res) {
	const user = req.user;
	
	console.log(`${user.userName} arrive home page`);
	
	res.render('index.html', {
        user: req.user
    });
});

router.get('/login', function (req, res) {
	console.log('WEB === Login page');
	
	res.render('login.html', {
        title: 'Login'
    });
});


router.get('/changename', isLoggedIn, function (req, res) {
	console.log('WEB === Login page');
	
	res.render('update_profile.html', {
        title: 'Change name'
    });
});

router.get('/dashboard', isAdmin, function (req, res) { 
	res.render('admin.html', {
        user: req.user
    });
});

function isLoggedIn(req, res, next) {
    if (req.user)
        return next();
	
	res.redirect('/login');
}

function isAdmin(req, res, next) {
	if (req.user) {
		const user = req.user;
		
		if (!user.isAdmin) {
			res.redirect(404, '/');
		} else {
			next();
		}
	} else {
		res.redirect('/');
	}
}

module.exports = router;