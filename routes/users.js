const express = require('express');
const router = express.Router();
const { signup, login, verifyEmail } = require('../controllers/user.js');
router.post('/signup', signup);
router.post('/login', login);
router.get('/verifyEmail', verifyEmail);
module.exports = router;