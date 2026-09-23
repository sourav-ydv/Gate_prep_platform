import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LectureList from "@/components/lecture-list";

export default async function LecturesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from("profiles")
    .select("branch")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const { data: created } = await supabase
      .from("profiles")
      .insert({ id: user.id, branch: "CS" })
      .select("branch")
      .single();
    profile = created;
  }

  const branch = profile?.branch ?? "CS";

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, order_index")
    .eq("branch", branch)
    .order("order_index");

  const subjectIds = (subjects ?? []).map((s) => s.id);

  const { data: lectures } = await supabase
    .from("lectures")
    .select("id, title, subject_id, source_type, created_at")
    .in("subject_id", subjectIds.length ? subjectIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at");

  const lectureIds = (lectures ?? []).map((l) => l.id);

  const { data: progress } = await supabase
    .from("lecture_progress")
    .select("lecture_id, completed")
    .eq("user_id", user.id)
    .in("lecture_id", lectureIds.length ? lectureIds : ["00000000-0000-0000-0000-000000000000"]);

  const completedSet = new Set(
    (progress ?? []).filter((p) => p.completed).map((p) => p.lecture_id)
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
              Lectures
            </h1>
          </div>
          <Link
            href="/lectures/add"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Add lecture
          </Link>
        </div>

        <div className="space-y-4">
          {(subjects ?? []).map((subject) => {
            const subjectLectures = (lectures ?? []).filter(
              (l) => l.subject_id === subject.id
            );
            const doneCount = subjectLectures.filter((l) =>
              completedSet.has(l.id)
            ).length;

            return (
              <div
                key={subject.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">
                    {subject.name}
                  </h2>
                  {subjectLectures.length > 0 && (
                    <span className="text-xs text-slate-400">
                      {doneCount}/{subjectLectures.length} watched
                    </span>
                  )}
                </div>

                {subjectLectures.length === 0 ? (
                  <Link
                    href={`/lectures/add?subject=${subject.id}`}
                    className="text-sm text-slate-400 hover:text-slate-700"
                  >
                    No lectures yet — add one
                  </Link>
                ) : (
                  <LectureList
                    lectures={subjectLectures}
                    completedIds={subjectLectures
                      .filter((l) => completedSet.has(l.id))
                      .map((l) => l.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
