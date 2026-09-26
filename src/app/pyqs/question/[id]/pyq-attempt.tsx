"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Option = { id: string; text: string };

export default function PyqAttempt({
  pyqId,
  topicId,
  question,
  options,
  correctOption,
  correctValue,
  storedExplanation,
  lastAttempt,
}: {
  pyqId: string;
  topicId: string | null;
  question: string;
  options: Option[] | null;
  correctOption: string | null;
  correctValue: number | null;
  storedExplanation: string | null;
  lastAttempt: { user_answer: string; is_correct: boolean } | null;
}) {
  const supabase = createClient();

  const [answered, setAnswered] = useState(!!lastAttempt);
  const [isCorrect, setIsCorrect] = useState(lastAttempt?.is_correct ?? null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [numericAnswer, setNumericAnswer] = useState("");
  const [explanation, setExplanation] = useState(storedExplanation);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function updateMastery(correct: boolean) {
    if (!topicId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from("topic_mastery")
      .select("attempts, correct")
      .eq("user_id", user.id)
      .eq("topic_id", topicId)
      .maybeSingle();

    await supabase.from("topic_mastery").upsert(
      {
        user_id: user.id,
        topic_id: topicId,
        attempts: (existing?.attempts ?? 0) + 1,
        correct: (existing?.correct ?? 0) + (correct ? 1 : 0),
        last_updated: new Date().toISOString(),
      },
      { onConflict: "user_id,topic_id" }
    );
  }

  async function loadExplanation() {
    if (explanation) return;
    setLoadingExplanation(true);
    try {
      const res = await fetch("/api/pyq-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pyqId }),
      });
      const data = await res.json();
      if (res.ok) setExplanation(data.explanation);
    } finally {
      setLoadingExplanation(false);
    }
  }

  async function handleSubmit() {
    const isNat = !options;
    if (isNat && numericAnswer.trim() === "") return;
    if (!isNat && !selectedOption) return;

    setSubmitting(true);

    let correct = false;
    let userAnswer = "";

    if (isNat) {
      userAnswer = numericAnswer;
      const num = parseFloat(numericAnswer);
      correct =
        correctValue !== null && Math.abs(num - correctValue) < 0.01;
    } else {
      userAnswer = selectedOption;
      correct = selectedOption === correctOption;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("pyq_attempts").insert({
        user_id: user.id,
        pyq_id: pyqId,
        user_answer: userAnswer,
        is_correct: correct,
      });
      await updateMastery(correct);
    }

    setIsCorrect(correct);
    setAnswered(true);
    setSubmitting(false);
    loadExplanation();
  }

  function tryAgain() {
    setAnswered(false);
    setIsCorrect(null);
    setSelectedOption("");
    setNumericAnswer("");
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <p className="mb-5 text-sm font-medium leading-relaxed text-slate-900">
        {question}
      </p>

      {options ? (
        <div className="space-y-2">
          {options.map((opt) => {
            let style = "border-slate-200 hover:border-slate-400";
            if (answered) {
              if (opt.id === correctOption) {
                style = "border-emerald-400 bg-emerald-50";
              } else if (opt.id === selectedOption) {
                style = "border-red-300 bg-red-50";
              }
            } else if (selectedOption === opt.id) {
              style = "border-slate-900";
            }

            return (
              <button
                key={opt.id}
                disabled={answered}
                onClick={() => setSelectedOption(opt.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm text-slate-700 transition ${style}`}
              >
                {opt.text}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          type="number"
          step="any"
          disabled={answered}
          value={numericAnswer}
          onChange={(e) => setNumericAnswer(e.target.value)}
          placeholder="Enter a numerical answer"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 disabled:bg-slate-50"
        />
      )}

      {!answered ? (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-5 w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? "Checking…" : "Submit answer"}
        </button>
      ) : (
        <div className="mt-5">
          <p
            className={`text-sm font-medium ${
              isCorrect ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {isCorrect ? "✓ Correct" : "✗ Not quite"}
            {!options && correctValue !== null && !isCorrect && (
              <span className="ml-1 font-normal text-slate-500">
                (correct answer: {correctValue})
              </span>
            )}
          </p>

          <div className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            {loadingExplanation ? (
              "Generating explanation…"
            ) : explanation ? (
              explanation
            ) : (
              <button
                onClick={loadExplanation}
                className="text-slate-500 underline hover:text-slate-800"
              >
                Show explanation
              </button>
            )}
          </div>

          <button
            onClick={tryAgain}
            className="mt-4 text-xs text-slate-400 hover:text-slate-700"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
