const OpenAI = require("../services/openAI");

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?.id || req.sessionID;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await OpenAI.chat(userId, message);

    res.json(response);
  } catch (error) {
    console.error("Chat controller error:", error);
    res.status(500).json({
      reply: "Sorry, something went wrong. Please try again.",
      error: true,
    });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    const userId = req.user?.id || req.sessionID;
    OpenAI.clearHistory(userId);
    res.json({ message: "Chat history cleared" });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear history" });
  }
};
