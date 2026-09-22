"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LectureRow({
  id,
  title,
  sourceType,
  completed,
}: {
  id: string;
  title: string;
  sourceType: string;
  completed: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remove "${title}" from this topic?`)) return;

    setDeleting(true);
    const { error } = await supabase.from("lectures").delete().eq("id", id);
    setDeleting(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <li className="flex items-center justify-between py-2 text-sm text-slate-700">
      <Link
        href={`/lectures/${id}`}
        className="flex-1 truncate hover:text-slate-900"
      >
        {completed ? "✓ " : ""}
        {title}
      </Link>
      <span className="mx-3 shrink-0 text-xs text-slate-400">{sourceType}</span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
        aria-label={`Delete ${title}`}
      >
        {deleting ? "removing…" : "delete"}
      </button>
    </li>
  );
}
