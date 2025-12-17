const express =require( "express");
const aiController = require("../controllers/AiController.js");


const router = express.Router();

router.post("/ask", aiController.aiAssistant);
router.post("/suggestions", aiController.suggestions);

module.exports = router;