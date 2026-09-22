"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ManualProgress({
  lectureId,
  initialCompleted,
}: {
  lectureId: string;
  initialCompleted: boolean;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function toggle() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const next = !completed;

    await supabase.from("lecture_progress").upsert(
      {
        user_id: user.id,
        lecture_id: lectureId,
        completed: next,
        watched_seconds: next ? 1 : 0,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lecture_id" }
    );

    setCompleted(next);
    setSaving(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
        completed
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          : "bg-slate-900 text-white hover:bg-slate-800"
      }`}
    >
      {completed ? "✓ Marked as watched" : "Mark as watched"}
    </button>
  );
}
