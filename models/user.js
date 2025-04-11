const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;
const validator = require('validator');
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
      resetOTP: {
        type: String,
      },
      otpExpiresAt: {
        type: Date,
      }

},{timeStamps: true})
UserSchema.statics.signup = async function(username, email, password){
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
    const user = await this.create({username, email, password: hash});
    return user;

    

}
UserSchema.statics.login = async function(email, password){
    if(!email || !password)
    {
        throw Error('Enter email and password');
    }
    const isCorrectEmail = await this.findOne({email});
    if(!isCorrectEmail)
    {
        throw Error('Email is not found');
    }
    const isCorrectPassword = await bcrypt.compare(password, isCorrectEmail.password);
    if(!isCorrectPassword)
    {
        throw Error('Password is not correct');
    }
    return isCorrectEmail;
}
module.exports = mongoose.model('User', UserSchema);
