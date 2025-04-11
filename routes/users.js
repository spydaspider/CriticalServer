const express = require('express');
const router = express.Router();
const { signup, login, verifyEmail,getAllUsers } = require('../controllers/user.js');
router.post('/signup', signup);
router.post('/login', login);
router.get('/verifyEmail', verifyEmail);
router.get('/allUsers', getAllUsers);
module.exports = router;