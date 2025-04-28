 const mongoose = require('mongoose');
const User = require('../models/user.js');
const Transactions = require('../models/transactions.js');
const Account = require('../models/bankAccount.js');
const sendBrevoEmail = require('../utilities/emailSender.js'); // adjust the path accordingly
const bcrypt = require('bcrypt');


//getTransaction
const getTransactions = async(req,res)=>{
    const user_id = req.user._id;
    try{
    const transaction = await Transactions.findOne({user_id});
    res.status(200).json(transaction);
    }
    catch(error)
    {
        res.status(400).json({error: error.message});
    }
}
//getTransactions
const getTransaction = async(req,res)=>{
      const { id } = req.params;
      if(!mongoose.Types.ObjectId.isValid(id))
      {
        res.status(400).json({error: 'No such transaction'});
      }
      try{
         const transaction = await Transactions.findById(id);
         res.status(200).json(transaction);
      }
      catch(error)
      {
        res.status(400).json({error: 'No such transaction'});
      }
}

 const createTransaction = async(req, res)=>{



    
    try{
        const { amount, type, user_id,accountNumber, transactionDate } = req.body;
        const transaction = new Transactions({amount, type, user_id,accountNumber, transactionDate});
        await transaction.save();
        res.status(200).json({message: 'Transaction successful', transaction});

    }
    catch(error){
        return res.status(400).json({error: "Failed to create a balance"});
    }
} 
const updateTransaction = async(req, res) =>{
    const { id } = req.params;
    if(!mongoose.Types.ObjectId.isValid(id))
    {
        return res.status(400).json({error: 'No such transaction'})
    }
    try{
         const transaction = await Transactions.findOneAndUpdate({_id:id},{
            ...req.body 
         })
         res.status(200).json(transaction);
    }
    catch(error)
    {
        res.status(400).json({error: 'No such transaction'});
    }
}
const deleteTransaction = async(req,res)=>{
    const { id } = req.params;
    if(!mongoose.Types.ObjectId.isValid(id))
    {
        return res.status(400).json({error: 'No such transaction'});
    }
    try{
           const transaction = await Transactions.findOneAndDelete(id);
           res.status(200).json(transaction);
    }
    catch(error){
        res.status(400).json({error: 'No such transaction'});
    }
}
const deposit = async(req,res)=>{
    const { accountNumber, depositAmount } = req.body;
    
   
    //get the account and add to the balance already there
    try{
    const account = await Account.findOne({accountNumber});
    if(!account)
    {
        res.status(400).json({error: 'Account not found'});
        return;
    }
    const newAmount = parseFloat(account.balance.toString())+parseFloat(depositAmount);
    //save newAmount into the database
    account.balance = newAmount;
    await account.save();
    //get the pounds symbol
    const pounds = String.fromCharCode(163);  // 163 is the code for £
    const userId = await User.findOne({_id: account.user.toString()});
        
        // 1. Create a transaction record
        const transaction = new Transactions({
            amount: depositAmount,
            type: 'deposit',
            user: userId._id,
            accountNumber,
            transactionDate: new Date(), // Optional, since your schema will default to now
        });
        await transaction.save();

    //get the email of the user of this account.
    const user = await User.findOne({_id: account.user.toString()});
    const emailTemplate = `

    <p>Payment of ${pounds}${depositAmount} has been made to your KnackersBank account, your new balance is ${pounds}${newAmount}</p>
    
  `;
// Call the Brevo email function
await sendBrevoEmail({
subject: 'New Transaction',
to: [{ email: user.email, name: user.username }],
emailTemplate,
});
    
    
    res.status(200).json(account);
    }
    catch(error){
        res.status(400).json({error: error.message});
    }
    
}
const withdrawal = async(req,res)=>{
    const { accountNumber, withdrawalAmount, pin } = req.body;
   
    //get the account and add to the balance already there
    try{
    const account = await Account.findOne({accountNumber});
    const user = await User.findOne({_id: account.user.toString()});
    if(!user)
    {
        return res.status(400).json({error: "The user account not found"});
    }

    if(parseFloat(account.balance.toString()) < parseFloat(withdrawalAmount))
    {
        res.status(400).json({error:'You do not have insufficient funds.'});
        return;
    }
    //compare pin
        const isCorrectPin = await bcrypt.compare(pin, account.pin);
        
        if(!isCorrectPin)
        {
            account.failedWithdrawalAttempts += 1;
    
            await account.save();
            console.log("Withdrawal failed attempts", account.failedWithdrawalAttempts);
            if(account.failedWithdrawalAttempts >= 5){
                
                  account.withdrawalLockUntil = new Date(Date.now() + 15 * 60 * 1000);
                account.failedWithdrawalAttempts = 0;
                await account.save();
                const err = new Error('Pin is not correct. Your account is locked for 15 minutes.');
                err.withdrawalLockUntil = account.withdrawalLockUntil;

                //send email to notify user
                const emailTemplate = `

    <p>Multiple failed withdrawal attempts, we have locked the account for 15minutes, reset your pin</p>
    
    
  `;
// Call the Brevo email function
await sendBrevoEmail({
subject: 'Multiple Failed Withdrawal Attempts',
to: [{ email: user.email, name: user.username }],
emailTemplate,
});
    
throw err;            
 
        
            }
            
    
            
    
            return res.status(400).json({error: 'Incorrect pin, cannot proceed with the transaction'});
            
        }
    
    const newAmount = parseFloat(account.balance.toString())-parseFloat(withdrawalAmount);
    //save newAmount into the database
    account.balance = newAmount;
    await account.save();
    const pounds = String.fromCharCode(163);  // 163 is the code for £
    const userId = await User.findOne({_id: account.user.toString()});
    const transaction = new Transactions({
        amount: withdrawalAmount,
        type: 'withdrawal',
        user: userId._id,
        accountNumber,
        transactionDate: new Date(), // Optional, since your schema will default to now
    });
    await transaction.save();

    //get the email of the user of this account.
    const emailTemplate = `

    <p>An amount of ${pounds}${withdrawalAmount} has been debited from your KnackersBank account, your new balance is ${pounds}${newAmount}</p>
    <p>If you did not authorize this, call the bank</p>
    
  `;
// Call the Brevo email function
await sendBrevoEmail({
subject: 'New Transaction',
to: [{ email: user.email, name: user.username }],
emailTemplate,
});
    
    res.status(200).json(account);
    }
    catch(error){
        res.status(400).json({error: error.message});
    }
    
}

module.exports = {
    createTransaction,getTransactions,getTransaction,updateTransaction, deleteTransaction,deposit,withdrawal 
}

 