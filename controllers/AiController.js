const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const callGemini = async (prompt) => {
  try {
    // Use correct model name
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);

    if (!result || !result.response) {
      console.error("Gemini API returned no response:", result);
      throw new Error("No response from Gemini API");
    }

    const text = result.response.text
      ? result.response.text()
      : result.response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No text found in Gemini response");
    }

    return text;
  } catch (err) {
    console.error("Gemini API call failed:", err);
    throw err;
  }
};

exports.aiAssistant = async (req, res) => {
  const { question, planData } = req.body;

  if (!question || !planData) {
    return res.status(400).json({ error: "question and planData required" });
  }

  // Fixed: Use planData instead of productData
  const prompt = `You are a concise, friendly investment assistant. 
Answer the user's question using only the information from the plan below when possible. 
If the information is not present, say you don't know and suggest what the user can check.

Plan Details:
${JSON.stringify(planData, null, 2)}

User question:
${question}

Keep the answer short (1-6 sentences).`;

  try {
    const text = await callGemini(prompt);
    res.json({ answer: text.trim() });
  } catch (err) {
    console.error("Gemini ask error:", err);
    res.status(500).json({ answer: "AI request failed. Please try again." });
  }
};

exports.suggestions = async (req, res) => {
  const { plan } = req.body;

  if (!plan) {
    return res.status(400).json({ error: "plan required" });
  }

  const prompt = `You are an investment assistant. Given the plan below, produce an array of 3 short, user-facing questions a customer might ask about this investment plan.
Return only a JSON array, e.g. ["What is the...", "How long...", "Is there..."].

Plan:
${JSON.stringify(plan, null, 2)}`;

  try {
    const raw = await callGemini(prompt);

    let suggestions;
    try {
      suggestions = JSON.parse(raw);
      if (!Array.isArray(suggestions)) throw new Error("not array");
    } catch {
      // Fallback parsing
      suggestions = raw
        .split(/\r?\n/)
        .map((line) => line.replace(/^[\-\d\.\)\s"]+/, "").trim())
        .filter(Boolean)
        .slice(0, 3);
    }

    res.json({ suggestions });
  } catch (err) {
    console.error("Gemini suggestions error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
};
