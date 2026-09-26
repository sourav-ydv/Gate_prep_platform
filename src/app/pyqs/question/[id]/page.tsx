import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PyqAttempt from "./pyq-attempt";

export default async function PyqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: pyq } = await supabase
    .from("pyqs")
    .select(
      "id, question, options, correct_option, correct_value, marks, negative_marks, explanation, year, topic_id"
    )
    .eq("id", id)
    .single();

  if (!pyq) notFound();

  const { data: lastAttempt } = await supabase
    .from("pyq_attempts")
    .select("user_answer, is_correct")
    .eq("user_id", user.id)
    .eq("pyq_id", id)
    .order("attempted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/pyqs" className="text-sm text-slate-400 hover:text-slate-600">
          ← PYQ Bank
        </Link>
        <p className="mt-1 mb-4 text-xs text-slate-400">
          {pyq.year ? `GATE ${pyq.year}` : "Practice question"} · {pyq.marks} mark
          {pyq.marks !== 1 ? "s" : ""}
          {pyq.negative_marks > 0 && ` · −${pyq.negative_marks} for wrong answer`}
        </p>

        <PyqAttempt
          pyqId={pyq.id}
          topicId={pyq.topic_id}
          question={pyq.question}
          options={pyq.options}
          correctOption={pyq.correct_option}
          correctValue={pyq.correct_value}
          storedExplanation={pyq.explanation}
          lastAttempt={lastAttempt}
        />
      </div>
    </main>
  );
}
