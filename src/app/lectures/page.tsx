import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LectureRow from "@/components/lecture-row";

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

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, order_index, subject_id")
    .in("subject_id", subjectIds.length ? subjectIds : ["00000000-0000-0000-0000-000000000000"])
    .order("order_index");

  const topicIds = (topics ?? []).map((t) => t.id);

  const { data: lectures } = await supabase
    .from("lectures")
    .select("id, title, topic_id, source_type")
    .in("topic_id", topicIds.length ? topicIds : ["00000000-0000-0000-0000-000000000000"]);

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

        <div className="space-y-8">
          {(subjects ?? []).map((subject) => {
            const subjectTopics = (topics ?? []).filter(
              (t) => t.subject_id === subject.id
            );
            if (subjectTopics.length === 0) return null;

            return (
              <div key={subject.id}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  {subject.name}
                </h2>
                <div className="space-y-3">
                  {subjectTopics.map((topic) => {
                    const topicLectures = (lectures ?? []).filter(
                      (l) => l.topic_id === topic.id
                    );
                    const doneCount = topicLectures.filter((l) =>
                      completedSet.has(l.id)
                    ).length;

                    return (
                      <div
                        key={topic.id}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-slate-800">
                            {topic.name}
                          </h3>
                          {topicLectures.length > 0 && (
                            <span className="text-xs text-slate-400">
                              {doneCount}/{topicLectures.length} watched
                            </span>
                          )}
                        </div>

                        {topicLectures.length === 0 ? (
                          <Link
                            href={`/lectures/add?topic=${topic.id}`}
                            className="text-sm text-slate-400 hover:text-slate-700"
                          >
                            No lectures yet — add one
                          </Link>
                        ) : (
                          <ul className="divide-y divide-slate-100">
                            {topicLectures.map((lecture) => (
                              <LectureRow
                                key={lecture.id}
                                id={lecture.id}
                                title={lecture.title}
                                sourceType={lecture.source_type}
                                completed={completedSet.has(lecture.id)}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
