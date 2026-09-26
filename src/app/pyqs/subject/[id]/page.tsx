import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SubjectPyqsPage({
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

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!subject) notFound();

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name")
    .eq("subject_id", id)
    .order("order_index");

  const topicIds = (topics ?? []).map((t) => t.id);

  const { data: pyqs } = await supabase
    .from("pyqs")
    .select("id, question, year, topic_id, marks")
    .in("topic_id", topicIds.length ? topicIds : ["00000000-0000-0000-0000-000000000000"])
    .order("year", { ascending: false });

  const pyqIds = (pyqs ?? []).map((p) => p.id);

  const { data: attempts } = await supabase
    .from("pyq_attempts")
    .select("pyq_id, is_correct")
    .eq("user_id", user.id)
    .in("pyq_id", pyqIds.length ? pyqIds : ["00000000-0000-0000-0000-000000000000"]);

  const attemptMap = new Map(
    (attempts ?? []).map((a) => [a.pyq_id, a.is_correct])
  );
  const topicMap = new Map((topics ?? []).map((t) => [t.id, t.name]));

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/pyqs" className="text-sm text-slate-400 hover:text-slate-600">
          ← PYQ Bank
        </Link>
        <div className="mb-6 mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">
            {subject.name}
          </h1>
          <Link
            href={`/pyqs/add?subject=${id}`}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            + Add questions
          </Link>
        </div>

        {(pyqs ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No questions yet for this subject.{" "}
            <Link href={`/pyqs/add?subject=${id}`} className="underline">
              Add some
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-2">
            {(pyqs ?? []).map((pyq, i) => {
              const status = attemptMap.get(pyq.id);
              return (
                <Link
                  key={pyq.id}
                  href={`/pyqs/question/${pyq.id}`}
                  className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-400">
                      {pyq.year ? `GATE ${pyq.year}` : "Practice"}
                      {topicMap.get(pyq.topic_id)
                        ? ` · ${topicMap.get(pyq.topic_id)}`
                        : ""}
                      {" · "}
                      {pyq.marks} mark{pyq.marks !== 1 ? "s" : ""}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-800">
                      {i + 1}. {pyq.question}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      status === true
                        ? "bg-emerald-100 text-emerald-700"
                        : status === false
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {status === true
                      ? "Correct"
                      : status === false
                      ? "Incorrect"
                      : "Unattempted"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
