const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;
const validator = require('validator');
const LoginLog = require('./loginLogs.js');
const geoip = require('geoip-lite');
const sendBrevoEmail = require('../utilities/emailSender.js'); // adjust the path accordingly

const UserSchema = new Schema({
    username: {
        type: String, 
        required: true 
    },
    email: {
        type: String,
        required: true 
       },
    password: {
        type:String,
        required: true
    },
    emailVerified: {
        type: Boolean,
        default: false
      },
      role:{
        type:String,
        required: true
      },
      resetOTP: {
        type: String,
      },
      otpExpiresAt: {
        type: Date,
      },
      failedLoginAttempts: {
        type: Number,
        default: 0
      },
      loginLockUntil: {
        type: Date,
        default: null
      },
       lastLogin: {
        ip: String,
        location: {
          type: { type: String, default: 'Point' },
          coordinates: [Number]  // [longitude, latitude]
        },
        city: String,
       region: String,
       country: String
    }


},{timeStamps: true})
UserSchema.statics.signup = async function(username, email, password, role){
    if(!username || !email || !password)
    {
        throw Error("Fill in all fields");
    }
    const usernameTaken = await this.findOne({username});
    const emailTaken = await this.findOne({email});

    if(usernameTaken)
    {
        throw Error('Username already taken');
    }
    if(emailTaken) 
    {
        throw Error('Email already taken');
    }
    if(!validator.isEmail(email))
    {
        throw Error('Enter a valid email address');
    }
    if(!validator.isStrongPassword(password))
    {
        throw Error('Password is weak');
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = await this.create({username, email, password: hash, role});
    return user;

    

}
UserSchema.statics.login = async function(email, password,req){
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const realIp = ip === '::1' ? '5.151.196.229' : ip; // fallback for testing
  
     const loginLogs = new LoginLog({email,ip});
    if(!email || !password)
    {
        throw Error('Enter email and password');
    }
    const isCorrectEmail = await this.findOne({email});
    
    if(!isCorrectEmail)
    {
        throw Error('Email is not found');
    }
    //check to see if system is locked

    if(isCorrectEmail.loginLockUntil && isCorrectEmail.loginLockUntil > new Date())
    {
        const minutes = Math.ceil((isCorrectEmail.loginLockUntil - new Date())/(60 * 1000));
        const err = new Error(`Account is locked. Try again in ${minutes} minutes(s).`);
        err.loginLockUntil = isCorrectEmail.loginLockUntil;
        throw err;

    }

    
    const isCorrectPassword = await bcrypt.compare(password, isCorrectEmail.password);
    if(!isCorrectPassword)
    {
        isCorrectEmail.failedLoginAttempts += 1;
        loginLogs.success = false;
        await loginLogs.save();
    
        await isCorrectEmail.save();
        console.log("Failed");
        console.log("login failed attemptps", isCorrectEmail.failedLoginAttempts);
        if(isCorrectEmail.failedLoginAttempts >= 5){
            console.log("greater than 5");
              isCorrectEmail.loginLockUntil = new Date(Date.now() + 15 * 60 * 1000);
            isCorrectEmail.failedLoginAttempts = 0;
            await isCorrectEmail.save();
            const err = new Error('Password is not correct. Your account is locked for 15 minutes.');
            err.loginLockUntil = isCorrectEmail.loginLockUntil;
        
            const emailTemplate = `
            
                <p>Failed multiple login attempts, we have locked the account for 15minutes, reset your pin</p>
                
                
              `;
            // Call the Brevo email function
            await sendBrevoEmail({
            subject: 'Failed login Attempts',
            to: [{ email, name: isCorrectEmail.username }],
            emailTemplate,
            });  
        
           

            throw err;        

            
    
        }
        

        throw Error('Password is not correct');

    }
    
    //get the location

   
    const geo = geoip.lookup(realIp);
    if (geo) {
      isCorrectEmail.lastLogin = {
        ip: realIp,
        location: {
          type: 'Point',
          coordinates: [geo.ll[1], geo.ll[0]] // [longitude, latitude]
        },
        city: geo.city,
        region: geo.region,
        country: geo.country
      };
    } else {
      isCorrectEmail.lastLogin = { ip: realIp };
    }
    //if login is successful this time, reset the attemptssa
    if(isCorrectPassword)
    {
    isCorrectEmail.failedLoginAttempts = 0;
    isCorrectEmail.loginLockUntil = null;
    loginLogs.success = true;
    await loginLogs.save();
    await isCorrectEmail.save();
    }
    return isCorrectEmail;
    
}
UserSchema.index({ 'lastLogin.location': '2dsphere' });

module.exports = mongoose.model('User', UserSchema);
