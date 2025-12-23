require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const port = 3333;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

app.post("/exegesis", async (req, res) => {
  try {
    const { book, chapter, verse, verseText } = req.body;

    if (!book || !chapter || !verse || !verseText) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const prompt = `
Provide concise but rich biblical exegesis for ${book} ${chapter}:${verse}.

Verse:
"${verseText}"

Return:
- Summary
- Historical / literary context
- Key theological ideas
- Cross references (short list)

Do NOT preach. Do NOT add application. Scholarly tone.
`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: "You are a biblical scholar." },
        { role: "user", content: prompt }
      ],
      temperature: 0.4,
    });

    const text = response.output_text;

    res.json({
      summary: text,
      source: {
        kind: "ai",
        name: "OpenAI GPT-4.1-mini",
        generatedAt: Date.now(),
      },
    });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

app.listen(port, () => {
  console.log(`✅ AI Exegesis server running on http://localhost:${port}`);
});