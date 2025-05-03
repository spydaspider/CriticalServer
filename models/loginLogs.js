const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  email: String,
  ip: String,
  timestamp: { type: Date, default: Date.now },
  success: Boolean
});

module.exports = mongoose.model('LoginLog', loginLogSchema);