const config = require('./config');

// Express + Socket.io
const express = require('express');
const session = require('express-session');
const app = express();
const bodyParser  = require('body-parser');
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.set('io', io);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Passport
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
app.use(session({ 
	secret: 'kixeyetest2',
	resave: false,
    saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Static
const path = require('path');
const ejs = require('ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', __dirname + '/public/views');
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');

// Router
const webRoute = require('./routes/web');
const devRoute = require('./routes/dev');
const adminRoute = require('./routes/admin');
const userRoute = require('./routes/user');

app.use(webRoute);
app.use('/dev', devRoute);
app.use('/api/admin', adminRoute);
app.use('/api/user', userRoute);

// Passport Strategy
const User = require('./models/user');
passport.use(new LocalStrategy({
		usernameField : 'userName',
		passwordField : 'password'
	},
	(userName, password, done) => {
		User.findOne({ userName : userName}, (err, user) => {
			if (err) return done(err);
			if (!user) return done(null, false);
			
			User.comparePassword(password, user.password).then((isMatch) => {
				if (isMatch) {
					return done (null, user);
				} else {
					return done (new Error('Password is not matched'));
				}
			}).catch((err) => {
				return done(err);
			});
		});
	}
));
passport.serializeUser(function(user, done) {
    console.log(`serializing user: ${user.userName}`);
    done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        console.log(`deserializing user: ${user.userName}`);
        done(err, user);
    });
});

// Mongo
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(config.MongoConnectionUrl, {
	useMongoClient : true
}).then(() => {
	console.log('Connected to MongoDB server');
});

// Redis
const createRedisClient = require('./global/redis.js');
const redisSubscriber = createRedisClient();

redisSubscriber.on('message', (channel, message) => {
	console.log(`Channel ${channel} broadcast: ${message}`);
	io.sockets.emit('updatescore', JSON.parse(message));
});
redisSubscriber.subscribe('score');

// Error handling
app.use((req, res, next) => {
  res.status(404).json({ error: 'Api not found'});
});

app.use(function (err, req, res, next) {
  res.status(500).json({ error: err.message });
});

// Log
const logger = require('morgan');
app.use(logger('dev'));

// Start server
server.listen(process.env.PORT || 5000);