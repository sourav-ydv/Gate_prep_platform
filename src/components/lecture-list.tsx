"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Lecture = {
  id: string;
  title: string;
  source_type: string;
};

export default function LectureList({
  lectures,
  completedIds,
}: {
  lectures: Lecture[];
  completedIds: string[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const completed = new Set(completedIds);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === lectures.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(lectures.map((l) => l.id)));
    }
  }

  async function deleteOne(id: string, title: string) {
    if (!confirm(`Remove "${title}" from this topic?`)) return;
    setBusy(true);
    const { error } = await supabase.from("lectures").delete().eq("id", id);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Delete ${selected.size} lecture${selected.size > 1 ? "s" : ""}? This can't be undone.`
      )
    )
      return;

    setBusy(true);
    const { error } = await supabase
      .from("lectures")
      .delete()
      .in("id", Array.from(selected));
    setBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSelected(new Set());
    setSelectMode(false);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => {
            setSelectMode(!selectMode);
            setSelected(new Set());
          }}
          className="text-xs text-slate-400 hover:text-slate-700"
        >
          {selectMode ? "Cancel" : "Select"}
        </button>

        {selectMode && (
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAll}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              {selected.size === lectures.length ? "Deselect all" : "Select all"}
            </button>
            <button
              onClick={deleteSelected}
              disabled={selected.size === 0 || busy}
              className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40"
            >
              Delete {selected.size > 0 ? selected.size : ""} selected
            </button>
          </div>
        )}
      </div>

      <ul className="divide-y divide-slate-100">
        {lectures.map((lecture) => (
          <li
            key={lecture.id}
            className="flex items-center justify-between py-2 text-sm text-slate-700"
          >
            {selectMode && (
              <input
                type="checkbox"
                checked={selected.has(lecture.id)}
                onChange={() => toggle(lecture.id)}
                className="mr-3 h-4 w-4 shrink-0"
              />
            )}
            <Link
              href={`/lectures/${lecture.id}`}
              className="flex-1 truncate hover:text-slate-900"
            >
              {completed.has(lecture.id) ? "✓ " : ""}
              {lecture.title}
            </Link>
            <span className="mx-3 shrink-0 text-xs text-slate-400">
              {lecture.source_type}
            </span>
            {!selectMode && (
              <button
                onClick={() => deleteOne(lecture.id, lecture.title)}
                disabled={busy}
                className="shrink-0 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
              >
                delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
