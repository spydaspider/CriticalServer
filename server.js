const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const users = require('./routes/users.js');
/* const transactions = require('./routes/transactions.js')
 */const bankAccounts = require('./routes/bankAccount.js');
const app = express();
app.use(express.json());
app.use((req,res, next)=>{
    console.log(req.path, req.body);
    next();
})
app.get('/', (req, res) => {
    res.send('Knackers Bank Backend is running!');
  });
const PORT = process.env.PORT || 5000
 app.use('/api/users',users);
 app.use('/api/accounts',bankAccounts);
/*  app.use('/api/transactions', transactions);
 */ mongoose.connect(process.env.MONGO_URI).then(()=>{
    app.listen(PORT,()=>{    
        console.log("connected to the mongoose server on ", PORT);
    })
}).catch((error)=>{
    console.error(error.message);
})