// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const chatbot = require('../controllers/ChatbotController');
//const { optionalAuth } = require('../middleware/auth');

router.post('/chat', chatbot.chat);
router.post('/clear', chatbot.clearHistory);

module.exports = router;