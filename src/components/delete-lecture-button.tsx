"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeleteLectureButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;

    setDeleting(true);
    const { error } = await supabase.from("lectures").delete().eq("id", id);

    if (error) {
      alert(error.message);
      setDeleting(false);
      return;
    }

    router.push("/lectures");
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
    >
      {deleting ? "Deleting…" : "Delete this lecture"}
    </button>
  );
}
