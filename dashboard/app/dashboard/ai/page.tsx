"use client";

import Topbar from "@/components/dashboard/Topbar";
import { useState } from "react";

export default function AiPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function askAI() {
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setAnswer("");

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "AI request failed");

      setAnswer(data.answer);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Topbar
        title="AI Scripture Console"
        subtitle="Bible-grounded answers · KJV only"
      />

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={4}
          className="w-full rounded-2xl border px-4 py-3"
          placeholder="Ask a Scripture question…"
        />

        <button
          onClick={askAI}
          disabled={loading}
          className="mt-4 rounded-xl bg-black px-5 py-2 text-white"
        >
          {loading ? "Asking…" : "Ask AI"}
        </button>

        {error && <div className="mt-4 text-red-600">{error}</div>}
      </div>

      {answer && (
        <div className="rounded-3xl border bg-white p-6">
          <pre className="whitespace-pre-wrap">{answer}</pre>
        </div>
      )}
    </div>
  );
}