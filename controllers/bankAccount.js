const Account = require('../models/bankAccount.js');
const mongoose = require('mongoose');
const generateAccountNumber = require('../helpers/generateAccountNumber.js');
const sendBrevoEmail = require('../utilities/emailSender.js'); // adjust the path accordingly

const bcrypt = require('bcrypt');

const createAccount = async(req,res)=>{
    
     const user = req.user._id;
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
         const account = await Account.create({accountName,idNumber, address, user,pin:hash, accountNumber: 'ACC'+accountNumber });
         const emailTemplate = `
         <h1>Thank you ${user.username}!</h1>
         <p>You have successfully created a new bank account with Knackers Bank.</p>
         <p>This is your account number ${'ACC'+accountNumber}</p>
       `;
// Call the Brevo email function
await sendBrevoEmail({
subject: 'New Bank Account',
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
    const { id } = req.params;
    if(!mongoose.Types.ObjectId.isValid(id))
    {
        return res.status(400).json({error:'Invalid account ID'});
    }
    try{
          const account = await Account.findOneAndUpdate({_id:id},{
            ...req.body
             
          })
          res.status(200).json(account);
    }
    catch(error){
        res.status(400).json({error: error.message});
    }
    


}
const deleteAccount = async(req, res)=>{
    const { id } = req.params;
    if(!mongoose.Types.ObjectId.isValid(id))
    {
        return res.status(400).json({error: 'Invalid account identification'});
    }
    try{
            const account = await Account.findOneAndDelete({_id: id});
            res.status(200).json(account);
    }
    catch(error)
    {
        res.status(400).json({error:error.message});
    }

}


module.exports = {
    createAccount,getAccount, getAllAccounts, updateAccount, deleteAccount
}




