"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Subject = { id: string; name: string };
type Topic = { id: string; name: string; subject_id: string };

type ReviewOption = { id: string; text: string };
type ReviewQuestion = {
  question: string;
  options: ReviewOption[] | null;
  correctOption: string | null;
  correctValue: number | null;
  year: number | null;
  marks: number;
  include: boolean;
};

const BULK_EXAMPLE = `[
  {
    "question": "What is the time complexity of binary search?",
    "options": [
      { "id": "a", "text": "O(n)" },
      { "id": "b", "text": "O(log n)" },
      { "id": "c", "text": "O(n log n)" },
      { "id": "d", "text": "O(1)" }
    ],
    "correctOption": "b",
    "year": 2022,
    "marks": 1,
    "negativeMarks": 0.33
  }
]`;

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500";

export default function AddPyqForm({
  subjects,
  topics,
  defaultSubjectId,
  branch,
}: {
  subjects: Subject[];
  topics: Topic[];
  defaultSubjectId: string;
  branch: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"single" | "pdf" | "bulk">("pdf");
  const [subjectId, setSubjectId] = useState(defaultSubjectId);
  const [topicId, setTopicId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [questionType, setQuestionType] = useState<"mcq" | "nat">("mcq");
  const [question, setQuestion] = useState("");
  const [optionTexts, setOptionTexts] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [correctValue, setCorrectValue] = useState("");
  const [year, setYear] = useState("");
  const [marks, setMarks] = useState("1");
  const [negativeMarks, setNegativeMarks] = useState("0");

  const [bulkJson, setBulkJson] = useState("");

  const [reviewItems, setReviewItems] = useState<ReviewQuestion[] | null>(null);

  const topicOptions = useMemo(
    () => topics.filter((t) => t.subject_id === subjectId),
    [topics, subjectId]
  );

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!subjectId) {
      setError("Pick a subject.");
      return;
    }
    if (!question.trim()) {
      setError("Enter the question text.");
      return;
    }

    let row: any = {
      branch,
      topic_id: topicId || null,
      question: question.trim(),
      year: year ? parseInt(year) : null,
      marks: parseFloat(marks) || 1,
      negative_marks: parseFloat(negativeMarks) || 0,
    };

    if (questionType === "mcq") {
      const ids = ["a", "b", "c", "d"];
      const filled = optionTexts.filter((t) => t.trim() !== "");
      if (filled.length < 2) {
        setError("Enter at least 2 options.");
        return;
      }
      row.options = optionTexts
        .map((text, i) => ({ id: ids[i], text: text.trim() }))
        .filter((o) => o.text !== "");
      row.correct_option = ids[correctIndex];
    } else {
      if (correctValue.trim() === "") {
        setError("Enter the correct numerical value.");
        return;
      }
      row.correct_value = parseFloat(correctValue);
    }

    setLoading(true);
    const { error: insertError } = await supabase.from("pyqs").insert(row);
    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(subjectId ? `/pyqs/subject/${subjectId}` : "/pyqs");
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!subjectId) {
      setError("Pick a subject.");
      return;
    }

    let parsed: any[];
    try {
      parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error();
    } catch {
      setError("That's not valid JSON — check the format against the example.");
      return;
    }

    if (parsed.length === 0) {
      setError("The array is empty.");
      return;
    }

    setLoading(true);
    setStatus(`Importing ${parsed.length} questions…`);

    const rows = parsed.map((q) => ({
      branch,
      topic_id: topicId || null,
      question: q.question,
      options: q.options ?? null,
      correct_option: q.correctOption ?? null,
      correct_value: q.correctValue ?? null,
      year: q.year ?? null,
      marks: q.marks ?? 1,
      negative_marks: q.negativeMarks ?? 0,
      explanation: q.explanation ?? null,
    }));

    const { error: insertError } = await supabase.from("pyqs").insert(rows);

    setLoading(false);
    setStatus(null);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/pyqs/subject/${subjectId}`);
  }

  async function handlePdfSelected(file: File) {
    setError(null);
    setReviewItems(null);

    if (!subjectId) {
      setError("Pick a subject first.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("That PDF is over 8MB — try a smaller one (a single paper/subject section works best).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setLoading(true);
    setStatus("Reading PDF and extracting questions… this processes the whole document in chunks and can take up to a minute or two for longer papers.");

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = () => reject(new Error("Could not read the file."));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/parse-pyq-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64: base64 }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned status ${res.status}.`);
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Could not extract questions from that PDF.");
      }

      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions could be identified in that PDF.");
      }

      setReviewItems(
        data.questions.map((q: any) => ({
          question: q.question ?? "",
          options: q.options ?? null,
          correctOption: q.correctOption ?? null,
          correctValue: q.correctValue ?? null,
          year: q.year ?? null,
          marks: q.marks ?? 1,
          include: true,
        }))
      );

      if (data.truncated) {
        setStatus(
          "Note: this PDF was long, so only the first portion was scanned. Upload the rest separately if needed."
        );
      } else {
        setStatus(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  function updateReviewItem(index: number, patch: Partial<ReviewQuestion>) {
    if (!reviewItems) return;
    const next = [...reviewItems];
    next[index] = { ...next[index], ...patch };
    setReviewItems(next);
  }

  async function confirmReviewImport() {
    if (!reviewItems) return;
    const toImport = reviewItems.filter((q) => q.include);

    if (toImport.length === 0) {
      setError("Select at least one question to add.");
      return;
    }

    setLoading(true);
    setError(null);

    const rows = toImport.map((q) => ({
      branch,
      topic_id: topicId || null,
      question: q.question,
      options: q.options,
      correct_option: q.correctOption,
      correct_value: q.correctValue,
      year: q.year,
      marks: q.marks,
    }));

    const { error: insertError } = await supabase.from("pyqs").insert(rows);
    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/pyqs/subject/${subjectId}`);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("pdf");
            setReviewItems(null);
          }}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === "pdf"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Upload PDF
        </button>
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === "single"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Single question
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === "bulk"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          JSON import
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Subject
          </label>
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setTopicId("");
            }}
            className={`${inputClass} bg-white`}
          >
            <option value="">Select a subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Topic (optional)
          </label>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className={`${inputClass} bg-white`}
            disabled={!subjectId}
          >
            <option value="">No specific topic</option>
            {topicOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mode === "pdf" && (
        <div>
          {!reviewItems ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <p className="mb-3 text-sm text-slate-500">
                Upload a GATE previous-year paper (or any PDF with practice
                questions). AI will pull out the questions for you to review
                before adding.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfSelected(file);
                }}
                disabled={loading}
                className="mx-auto block text-sm text-slate-600"
              />
              {status && <p className="mt-3 text-sm text-slate-500">{status}</p>}
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Found {reviewItems.length} questions — review, edit, and
                  uncheck any you don't want.
                </p>
                <button
                  onClick={() => setReviewItems(null)}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  Start over
                </button>
              </div>

              <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {reviewItems.map((q, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 ${
                      q.include ? "border-slate-200" : "border-slate-100 opacity-50"
                    }`}
                  >
                    <div className="mb-2 flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={q.include}
                        onChange={(e) =>
                          updateReviewItem(i, { include: e.target.checked })
                        }
                        className="mt-1 h-4 w-4 shrink-0"
                      />
                      <textarea
                        value={q.question}
                        onChange={(e) =>
                          updateReviewItem(i, { question: e.target.value })
                        }
                        rows={2}
                        className={`${inputClass} text-xs`}
                      />
                    </div>

                    {q.options ? (
                      <div className="ml-6 space-y-1">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input
                              type="radio"
                              checked={q.correctOption === opt.id}
                              onChange={() =>
                                updateReviewItem(i, { correctOption: opt.id })
                              }
                            />
                            <input
                              value={opt.text}
                              onChange={(e) => {
                                const nextOptions = [...q.options!];
                                nextOptions[oi] = {
                                  ...opt,
                                  text: e.target.value,
                                };
                                updateReviewItem(i, { options: nextOptions });
                              }}
                              className={`${inputClass} text-xs`}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="ml-6">
                        <input
                          type="number"
                          step="any"
                          value={q.correctValue ?? ""}
                          onChange={(e) =>
                            updateReviewItem(i, {
                              correctValue: parseFloat(e.target.value),
                            })
                          }
                          placeholder="Correct numerical value"
                          className={`${inputClass} text-xs`}
                        />
                      </div>
                    )}

                    <div className="ml-6 mt-2 flex gap-2">
                      <input
                        type="number"
                        value={q.year ?? ""}
                        onChange={(e) =>
                          updateReviewItem(i, {
                            year: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        placeholder="Year"
                        className={`${inputClass} w-24 text-xs`}
                      />
                      <input
                        type="number"
                        value={q.marks}
                        onChange={(e) =>
                          updateReviewItem(i, {
                            marks: parseFloat(e.target.value) || 1,
                          })
                        }
                        placeholder="Marks"
                        className={`${inputClass} w-20 text-xs`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <button
                onClick={confirmReviewImport}
                disabled={loading}
                className="mt-4 w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {loading
                  ? "Adding…"
                  : `Add ${reviewItems.filter((q) => q.include).length} questions`}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "single" && (
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setQuestionType("mcq")}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${
                questionType === "mcq"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Multiple choice
            </button>
            <button
              type="button"
              onClick={() => setQuestionType("nat")}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${
                questionType === "nat"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Numerical answer
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Enter the question text"
            />
          </div>

          {questionType === "mcq" ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Options (mark the correct one)
              </label>
              {optionTexts.map((text, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={correctIndex === i}
                    onChange={() => setCorrectIndex(i)}
                  />
                  <input
                    value={text}
                    onChange={(e) => {
                      const next = [...optionTexts];
                      next[i] = e.target.value;
                      setOptionTexts(next);
                    }}
                    placeholder={`Option ${String.fromCharCode(97 + i)}`}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Correct numerical answer
              </label>
              <input
                type="number"
                step="any"
                value={correctValue}
                onChange={(e) => setCorrectValue(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Year
              </label>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2023"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Marks
              </label>
              <input
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Negative
              </label>
              <input
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Adding…" : "Add question"}
          </button>
        </form>
      )}

      {mode === "bulk" && (
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Paste a JSON array of questions
            </label>
            <textarea
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              rows={10}
              placeholder={BULK_EXAMPLE}
              className={`${inputClass} font-mono text-xs`}
            />
          </div>

          {status && <p className="text-sm text-slate-500">{status}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Importing…" : "Import questions"}
          </button>
        </form>
      )}
    </div>
  );
}
