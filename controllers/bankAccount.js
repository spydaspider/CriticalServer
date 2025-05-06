const Account = require('../models/bankAccount.js');
const generateAccountNumber = require('../helpers/generateAccountNumber.js');
const sendBrevoEmail = require('../utilities/emailSender.js'); // adjust the path accordingly
const User = require('../models/user.js');

const bcrypt = require('bcrypt');
const generatePinOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  };
  
  

const createAccount = async(req,res)=>{
    
     const user = req.user._id;
     const {username,email} = req.user;
     const {accountName, idNumber, address, pin } = req.body;

    
    
      try{
        const accountExists = await Account.findOne({user});
        if(accountExists)
        {
            return res.status(400).json({error: 'Account already exist'});
        }
        const accountNumber = generateAccountNumber();
        //hash the four digit pin
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(pin, salt);
         const account = await Account.create({accountName,idNumber,address, user,pin:hash, accountNumber: 'ACC'+accountNumber, email });
         const emailTemplate = `
         <h1>Thank you ${username}!</h1>
         <p>You have successfully created a new bank account with Knackers Bank.</p>
         <p>Below is your account Details</p>
         <p>Account name:           ${accountName}</p>
         <p>Account Number:         ${'ACC'+accountNumber}</p>
       `;
// Call the Brevo email function
await sendBrevoEmail({
subject: 'New Bank Details',
to: [{ email: email, name: username }],
emailTemplate,
});
         res.status(200).json(account); 

     }
     catch(error)
     {
        res.status(400).json({error: error.message});
     }
}
const getAccount = async(req, res) =>{
    const user = req.user._id;
    try{
          const account = await Account.find({user});
          res.status(200).json(account);
    }
    catch(error)
    {
        return res.status(400).json({error: error.message});
    }
}
const getAllAccounts = async(req,res) =>{
     try{
           const accounts = await Account.find();
           res.status(200).json(accounts);

     }
     catch(error)
     {
        res.status(400).json({error: error.message});
     }
}
const updateAccount = async(req, res)=>{
    const { accountNumber } = req.body;
    
    try{
          const account = await Account.findOneAndUpdate({accountNumber},{
            ...req.body
             
          })
          res.status(200).json(account);
    }
    catch(error){
        res.status(400).json({error: error.message});
    }
    


}
const deleteAccount = async(req, res)=>{
    const { accountNumber } = req.body;
   
    try{
            const account = await Account.findOneAndDelete({accountNumber});
            res.status(200).json(account);
    }
    catch(error)
    {
        res.status(400).json({error:error.message});
    }

}
const forgotPin = async (req, res) => {
  const { email } = req.body;

  try {
    const account = await Account.findOne({ email });
    if (!account) {
      return res.status(404).json({ error: 'Account not found with that email' });
    }

    const pinOTP = generatePinOTP();
    const pinOTPExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    // Save OTP and expiry to Account
    account.resetPinOTP = pinOTP;
    account.pinOTPExpiresAt = pinOTPExpiresAt;
    await account.save();

    const emailTemplate = `
      <h1>Password Reset OTP</h1>
      <p>Hello ${account.accountName},</p>
      <p>Use the following One-Time Password (OTP) to reset your Knackers Bank account pin:</p>
      <h2>${pinOTP}</h2>
      <p>This OTP will expire in 15 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    await sendBrevoEmail({
      subject: 'Knackers Bank Account Pin Reset OTP',
      to: [{ email: email, name: account.accountName }],
      emailTemplate,
    });

    res.status(200).json({ message: 'OTP sent to your email', email: account.email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const verifyOTPAndResetPin = async (req, res) => {
  const { email, pinOTP, newPin } = req.body;

  try {
    // Find account by email
    const account = await Account.findOne({ email });
    if (!account) {
      return res.status(404).json({ error: 'Account' });
    }

    // Check if OTP matches
    if (account.resetPinOTP !== pinOTP) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Check if OTP has expired
    if (account.pinOTPExpiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(newPin, salt);

    // Update password and clear OTP fields
    account.pin = hashedPin;
    account.resetPinOTP = null;
    account.pinOTPExpiresAt = null;
    await account.save();

    res.status(200).json({ message: 'Pin was reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



module.exports = {
    createAccount,getAccount, getAllAccounts, updateAccount, deleteAccount,forgotPin,verifyOTPAndResetPin
}




