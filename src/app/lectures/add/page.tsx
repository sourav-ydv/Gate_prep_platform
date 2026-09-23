import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddLectureForm from "./add-lecture-form";

export default async function AddLecturePage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject } = await searchParams;
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

  const options = (subjects ?? []).map((s) => ({ id: s.id, label: s.name }));

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">
          Add a lecture
        </h1>
        <AddLectureForm subjects={options} defaultSubjectId={subject ?? ""} branch={branch} />
      </div>
    </main>
  );
}
