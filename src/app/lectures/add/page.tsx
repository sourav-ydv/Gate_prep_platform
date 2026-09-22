import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddLectureForm from "./add-lecture-form";

export default async function AddLecturePage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;
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
    .select("id, name")
    .eq("branch", branch)
    .order("order_index");

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, subject_id")
    .in(
      "subject_id",
      (subjects ?? []).map((s) => s.id).length
        ? (subjects ?? []).map((s) => s.id)
        : ["00000000-0000-0000-0000-000000000000"]
    )
    .order("order_index");

  const options = (topics ?? []).map((t) => {
    const subject = (subjects ?? []).find((s) => s.id === t.subject_id);
    return {
      id: t.id,
      label: subject ? `${subject.name} — ${t.name}` : t.name,
    };
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">
          Add a lecture
        </h1>
        <AddLectureForm topics={options} defaultTopicId={topic ?? ""} />
      </div>
    </main>
  );
}
