import { requireAdmin } from "@/lib/requireAdmin"; // ✅ ADD THIS
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const SYSTEM_PROMPT = `
You are a Bible-focused Christian assistant.

STRICT RULES:
- All answers must be grounded in Scripture.
- Quote ONLY the King James Version (KJV) of the Bible.
- Always cite book, chapter, and verse (e.g., John 3:16).
- Do NOT speculate beyond what Scripture explicitly states.
- If Scripture does not clearly answer a question, say:
  "Scripture does not explicitly say."

ALLOWED:
- Direct KJV Scripture quotations
- Cross-references within the Bible
- Explanation strictly derived from Scripture

FORBIDDEN:
- Personal opinions
- Modern theology speculation
- Psychological or secular advice
- Adding ideas not found in Scripture
`;

export async function POST(req: Request) {
  try {
    // ✅ THIS LINE PROTECTS THE AI
    await requireAdmin();

    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
      temperature: 0.2,
    });

    return NextResponse.json({
      answer: completion.choices[0]?.message?.content ?? "",
    });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    console.error("AI error:", err);
    return NextResponse.json(
      { error: "AI request failed" },
      { status: 500 }
    );
  }
}