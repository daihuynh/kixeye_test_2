const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const bcrypt = require('bcrypt');
const SALT_WORK_FACTOR = 10;

const config = require('../config');

const createRedisClient = require('../global/redis.js');
const redis = createRedisClient();

const UserSchema = new Schema({
    userName: { type: String, required: true, unique: true },
    password: { type: String, required: true },
	salt : String,
    isAdmin: Boolean,
	score: { type: Number, default: 0 },
	scoreUpdateCount: { type: Number, default: 0 },
    modifyDate: Date, // Auto generate
    createDate: Date // Auto generate
});

UserSchema.plugin(passportLocalMongoose, {
	usernameField : 'userName'
});

UserSchema.virtual('uid').get(() => {
    return this._id.toString();
});

UserSchema.pre('save', function (next) {
    let user = this;
	
	// Auto fill create_date
    user.createDate = new Date();
	
	// generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, (err, salt) => {
        if (err) return next(err);
		
        // hash the password using our new salt
        bcrypt.hash(user.password, salt, (err, hash) => {
            if (err) return next(err);

            // override the cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

UserSchema.pre('update', function(next) {
    let user = this;
    
	user.scoreUpdateCount++;
	
    user.modifyDate = new Date();
    
    next();
});

UserSchema.statics.comparePassword = (candidatePassword, hashPassword) => {
	return new Promise((resolve, reject) => {
	    bcrypt.compare(candidatePassword, hashPassword, (err, isMatch) => {
	        if (err) {
				reject(err);
			} else {
				resolve(isMatch);
			}
	    });
	});
};

UserSchema.statics.getUserByIdFromCache = (uid) => {
	return new Promise((resolve, reject) => {
		redis.getAsync(uid).then((stringData) => {
			try {
				let data = JSON.parse(stringData);
				resolve(data);
			} catch(err) {
				reject(new Error('data not found'));
			}
		}).catch((err) => {
			reject(err);
		});
	}).then((user) => {
		resolve(user);
	}).catch((err) => {
		User.findById(uid, (err, user) => {
			if (err) {
				reject(err);
			} else {
				cacheUser(user);
			
				resolve(user);
			}
		});
	});
};

UserSchema.statics.cache = (user) => {
	redis.set(`${config.RedisUserCacheStoreKey}::${user.id}`, JSON.stringify(user));
}


module.exports = mongoose.model('User', UserSchema, 'Users');