"use client";

import { useState } from "react";

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export default function LectureAiPanel({
  lectureId,
  videoId,
}: {
  lectureId: string;
  videoId: string;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pastedText, setPastedText] = useState("");

  async function generate(manualTranscript?: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/lecture-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lectureId,
          videoId,
          manualTranscript,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned status ${res.status}.`);
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Could not generate a summary.");
      }

      setSummary(data.summary);
      setQuiz(data.quiz);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function score() {
    if (!quiz) return 0;
    return quiz.filter((q, i) => answers[i] === q.correctIndex).length;
  }

  if (!summary) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="mb-3 text-sm text-slate-500">
          Get an AI-generated summary and a 5-question quiz based on this
          lecture's content.
        </p>
        <button
          onClick={() => generate()}
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate summary & quiz"}
        </button>
        {error && (
          <div className="mt-3">
            <p className="text-sm text-red-600">{error}</p>
            {!showPasteBox ? (
              <button
                onClick={() => setShowPasteBox(true)}
                className="mt-2 text-xs text-slate-500 underline hover:text-slate-800"
              >
                Paste your own notes or a transcript instead
              </button>
            ) : (
              <div className="mx-auto mt-3 max-w-md text-left">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={6}
                  placeholder="Paste lecture notes, a transcript, or a summary of what was covered…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500"
                />
                <button
                  onClick={() => generate(pastedText)}
                  disabled={loading || pastedText.trim().length < 50}
                  className="mt-2 w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? "Generating…" : "Generate from pasted text"}
                </button>
                {pastedText.trim().length > 0 && pastedText.trim().length < 50 && (
                  <p className="mt-1 text-xs text-slate-400">
                    A bit more detail helps — at least a few sentences.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Summary</h3>
        <p className="text-sm leading-relaxed text-slate-600">{summary}</p>
      </div>

      {quiz && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Quick quiz
            </h3>
            {submitted && (
              <span className="text-sm font-medium text-slate-500">
                {score()}/{quiz.length} correct
              </span>
            )}
          </div>

          <div className="space-y-5">
            {quiz.map((q, qi) => (
              <div key={qi}>
                <p className="mb-2 text-sm font-medium text-slate-800">
                  {qi + 1}. {q.question}
                </p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => {
                    const isSelected = answers[qi] === oi;
                    const isCorrect = oi === q.correctIndex;
                    let style = "border-slate-200 hover:border-slate-400";
                    if (submitted && isCorrect) {
                      style = "border-emerald-400 bg-emerald-50";
                    } else if (submitted && isSelected && !isCorrect) {
                      style = "border-red-300 bg-red-50";
                    } else if (isSelected) {
                      style = "border-slate-900";
                    }

                    return (
                      <button
                        key={oi}
                        disabled={submitted}
                        onClick={() =>
                          setAnswers({ ...answers, [qi]: oi })
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm text-slate-700 transition ${style}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <p className="mt-2 text-xs text-slate-500">
                    {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>

          {!submitted && (
            <button
              onClick={() => setSubmitted(true)}
              disabled={Object.keys(answers).length < quiz.length}
              className="mt-5 w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              Check answers
            </button>
          )}
        </div>
      )}
    </div>
  );
}
