const OpenAI = require("openai");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
   - Upload payment proof (screenshot/receipt)
   - Wait for admin approval (usually 5-30 minutes)

2. Payment proof requirements:
   - Clear screenshot or photo
   - Must show: amount, date, transaction ID
   - Supported formats: JPG, PNG, PDF
   - Max size: 5MB

3. Checking deposit status:
   - Go to "My Deposits" or "History"
   - Status shows: Pending, Approved, or Rejected
   - You'll get email notification when approved

4. Why deposit rejected:
   - Unclear payment proof
   - Amount mismatch
   - Duplicate submission
   - Invalid bank details

5. Account balance:
   - Check "My Account" or dashboard
   - Balance updates after approval
   - Can be used for platform purchases

TONE:
- Friendly and professional
- Use Nigerian context (₦ naira)
- Keep responses concise (2-3 sentences)
- If unsure, suggest contacting support at support@topmart.com

RESTRICTIONS:
- Cannot approve deposits (admin only)
- Cannot check specific transaction status
- Cannot access account balances
- Cannot process refunds
`;

class OpenAIChatService {
  constructor() {
    this.conversationHistory = new Map();
  }

  async chat(userId, userMessage) {
    try {
      let history = this.conversationHistory.get(userId) || [];

      history.push({
        role: "user",
        content: userMessage,
      });

      // Keep last 10 messages
      if (history.length > 10) {
        history = history.slice(-10);
      }

      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: topMartKnowledgeBase,
          },
          ...history.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        ],
      });

      const assistantMessage = response.choices[0].message.content;

      history.push({
        role: "assistant",
        content: assistantMessage,
      });

      this.conversationHistory.set(userId, history);

      return {
        reply: assistantMessage,
        conversationId: userId,
      };
    } catch (error) {
      console.error("OpenAI API error:", error);

      return {
        reply:
          "I'm having trouble connecting right now. Please try again or contact support@topmart.com for immediate assistance.",
        error: true,
      };
    }
  }

  clearHistory(userId) {
    this.conversationHistory.delete(userId);
  }
}

module.exports = new OpenAIChatService();
