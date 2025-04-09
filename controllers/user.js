const User = require('../models/user.js');
const jwt = require('jsonwebtoken');
const sendBrevoEmail = require('../utilities/emailSender.js'); // adjust the path accordingly


const createToken = (_id) =>{
    return jwt.sign({_id}, process.env.SECRET, {expiresIn: '2d'});

}
const verifyEmail = async (req, res) => {
    const { token } = req.query;
  
    try {
      const decoded = jwt.verify(token, process.env.SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      user.verified = true;
      await user.save();
  
      res.status(200).send(`<h2>Email verified successfully! 🎉</h2>`);
    } catch (error) {
      res.status(400).send(`<h2>Invalid or expired token.</h2>`);
    }
  };

const signup = async(req, res) =>{
    const { username, email, password, emailVerified} = req.body;
    try{
          const user = await User.signup(username, email, password, emailVerified);
          const token = createToken(user.id);
          const userId = user.id;

          const verificationToken = jwt.sign({ userId: user._id }, process.env.SECRET, { expiresIn: '1d' });

          const verificationLink = `http://localhost:4000/api/users/verify-email?token=${verificationToken}`;
          
          const emailTemplate = `
            <h1>Welcome ${username}!</h1>
            <p>Thank you for signing up for Knackers Bank.</p>
            <p>Please verify your email by clicking the link below:</p>
            <a href="${verificationLink}">Verify Email</a>
          `;
// Call the Brevo email function
await sendBrevoEmail({
subject: 'Welcome to Knackers Bank!',
to: [{ email: email, name: username }],
emailTemplate,
});
          res.status(200).json({email, token, userId});
    


    }
    catch(error){
         res.status(400).json({error:error.message});
    }
}
const login = async(req, res) =>{
    const { email, password } = req.body;
    try{
        const user = await User.login(email, password);
        const token = createToken(user.id);
        const userId = user.id;
        res.status(200).json({email, token, userId});
    }
    catch(error){
        res.status(400).json({error: error.message});
    }
}
module.exports = { signup, login, verifyEmail}