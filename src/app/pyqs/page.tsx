import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PyqsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("branch")
    .eq("id", user.id)
    .single();

  const branch = profile?.branch ?? "CS";

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, order_index")
    .eq("branch", branch)
    .order("order_index");

  const subjectIds = (subjects ?? []).map((s) => s.id);

  const { data: topics } = await supabase
    .from("topics")
    .select("id, subject_id")
    .in("subject_id", subjectIds.length ? subjectIds : ["00000000-0000-0000-0000-000000000000"]);

  const topicIds = (topics ?? []).map((t) => t.id);

  const { data: pyqs } = await supabase
    .from("pyqs")
    .select("id, topic_id")
    .in("topic_id", topicIds.length ? topicIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: attempts } = await supabase
    .from("pyq_attempts")
    .select("pyq_id, is_correct")
    .eq("user_id", user.id);

  const attemptedIds = new Set((attempts ?? []).map((a) => a.pyq_id));
  const correctIds = new Set(
    (attempts ?? []).filter((a) => a.is_correct).map((a) => a.pyq_id)
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600">
              ← Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              PYQ Bank
            </h1>
          </div>
          <Link
            href="/pyqs/add"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Add questions
          </Link>
        </div>

        <div className="space-y-3">
          {(subjects ?? []).map((subject) => {
            const subjectTopicIds = (topics ?? [])
              .filter((t) => t.subject_id === subject.id)
              .map((t) => t.id);
            const subjectPyqs = (pyqs ?? []).filter((p) =>
              subjectTopicIds.includes(p.topic_id)
            );
            const attempted = subjectPyqs.filter((p) =>
              attemptedIds.has(p.id)
            ).length;
            const correct = subjectPyqs.filter((p) =>
              correctIds.has(p.id)
            ).length;

            return (
              <Link
                key={subject.id}
                href={`/pyqs/subject/${subject.id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    {subject.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {subjectPyqs.length} question
                    {subjectPyqs.length !== 1 ? "s" : ""}
                    {attempted > 0 &&
                      ` · ${attempted} attempted · ${correct}/${attempted} correct`}
                  </p>
                </div>
                <span className="text-slate-300">→</span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
