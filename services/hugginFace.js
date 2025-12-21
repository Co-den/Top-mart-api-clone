const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.3";

const topMartKnowledgeBase = `
You are TopMart Support Assistant, a helpful AI for TopMart - a deposit and account management platform.

KEY FEATURES:
- Users can deposit money to their accounts
- Users upload payment proof (bank receipt/screenshot)
- Admin reviews and approves deposits
- Users earn ₦1,000 bonus on signup
- Account balance can be used for purchases

COMMON QUESTIONS:

1. How to make a deposit:
   - Go to "Deposit" or "Recharge Account"
   - Enter amount (minimum ₦1,000)
   - Click "Proceed to Payment"
   - Make bank transfer to our account
   - Upload payment proof
   - Wait for admin approval (usually 5-30 minutes)

2. Payment proof requirements:
   - Clear screenshot or photo
   - Must show: amount, date, transaction ID
   - Supported formats: JPG, PNG, PDF
   - Max size: 5MB

3. Checking deposit status:
   - Go to "My Deposits" or "History"
   - Status shows: Pending, Approved, or Rejected

TONE:
- Friendly and professional
- Nigerian context (₦ naira)
- Keep replies short (2–3 sentences)
- If unsure, redirect to support@topmart.com

RESTRICTIONS:
- Cannot approve deposits
- Cannot check balances
- Cannot process refunds
`;

class HuggingFaceChatService {
  constructor() {
    this.conversationHistory = new Map();
  }

  buildPrompt(history) {
    const chat = history
      .map((msg) =>
        msg.role === "user"
          ? `User: ${msg.content}`
          : `Assistant: ${msg.content}`
      )
      .join("\n");

    return `
${topMartKnowledgeBase}

Conversation:
${chat}
Assistant:
`;
  }

  async chat(userId, userMessage) {
    try {
      let history = this.conversationHistory.get(userId) || [];

      history.push({ role: "user", content: userMessage });

      if (history.length > 10) {
        history = history.slice(-10);
      }

      const prompt = this.buildPrompt(history);

      const response = await axios.post(
        `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`,
        {
          inputs: prompt,
          parameters: {
            max_new_tokens: 250,
            temperature: 0.3,
            return_full_text: false,
          },
        },
        {
          headers: {
            Authorization: HF_API_KEY ? `Bearer ${HF_API_KEY}` : undefined,
            "Content-Type": "application/json",
          },
        }
      );

      const assistantMessage =
        response.data[0]?.generated_text ||
        "Sorry, I couldn't understand that.";

      history.push({ role: "assistant", content: assistantMessage });
      this.conversationHistory.set(userId, history);

      return {
        reply: assistantMessage.trim(),
        conversationId: userId,
      };
    } catch (error) {
      console.error("Hugging Face API error:", error.response?.data || error);

      return {
        reply:
          "I'm having trouble connecting right now. Please try again or contact support@topmart.com.",
        error: true,
      };
    }
  }

  clearHistory(userId) {
    this.conversationHistory.delete(userId);
  }
}

module.exports = new HuggingFaceChatService();
