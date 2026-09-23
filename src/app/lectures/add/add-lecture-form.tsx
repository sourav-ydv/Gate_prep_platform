"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  detectSourceType,
  extractYouTubeId,
  extractPlaylistId,
} from "@/lib/youtube";

export default function AddLectureForm({
  subjects,
  defaultSubjectId,
  branch,
}: {
  subjects: { id: string; label: string }[];
  defaultSubjectId: string;
  branch: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"single" | "playlist">("single");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [subjectId, setSubjectId] = useState(defaultSubjectId);
  const [subjectOptions, setSubjectOptions] = useState(subjects);
  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500";

  async function handleAddSubject() {
    if (!newSubjectName.trim()) return;

    const maxOrder = subjectOptions.length;
    const { data, error: insertError } = await supabase
      .from("subjects")
      .insert({ branch, name: newSubjectName.trim(), order_index: maxOrder + 1 })
      .select("id, name")
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSubjectOptions([...subjectOptions, { id: data.id, label: data.name }]);
    setSubjectId(data.id);
    setNewSubjectName("");
    setAddingSubject(false);
  }

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!subjectId) {
      setError("Pick a subject for this lecture.");
      return;
    }

    const sourceType = detectSourceType(url);
    if (sourceType === "youtube" && !extractYouTubeId(url)) {
      setError("That doesn't look like a valid YouTube video URL.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be signed in.");
      setLoading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("lectures")
      .insert({
        subject_id: subjectId,
        title: title || "Untitled lecture",
        url,
        source_type: sourceType,
        added_by: user.id,
      })
      .select("id")
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/lectures/${data.id}`);
  }

  async function handlePlaylistSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!subjectId) {
      setError("Pick a subject for these lectures.");
      return;
    }

    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      setError("That doesn't look like a valid YouTube playlist URL — it should contain '?list='.");
      return;
    }

    setLoading(true);
    setStatus("Fetching playlist from YouTube…");

    try {
      const res = await fetch("/api/import-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(
          `Server returned an unexpected response (status ${res.status}). Check that src/app/api/import-playlist/route.ts exists.`
        );
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Could not fetch that playlist.");
      }

      if (!data.videos || data.videos.length === 0) {
        throw new Error("No videos found in that playlist.");
      }

      setStatus(`Found ${data.videos.length} videos. Adding them…`);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You need to be signed in.");
      }

      const rows = data.videos.map((v: { videoId: string; title: string }) => ({
        subject_id: subjectId,
        title: v.title,
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        source_type: "youtube",
        added_by: user.id,
      }));

      const { error: insertError } = await supabase.from("lectures").insert(rows);

      if (insertError) {
        throw new Error(insertError.message);
      }

      router.push("/lectures");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setStatus(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === "single"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Single video
        </button>
        <button
          type="button"
          onClick={() => setMode("playlist")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            mode === "playlist"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Import playlist
        </button>
      </div>

      {mode === "single" ? (
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Process Scheduling — Lecture 4"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              URL (YouTube, Google Drive, or any link)
            </label>
            <input
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Subject
            </label>
            <select
              required
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select a subject</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {addingSubject ? (
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Software Engineering"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleAddSubject}
                  className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setAddingSubject(false)}
                  className="shrink-0 rounded-lg px-2 text-sm text-slate-400 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingSubject(true)}
                className="mt-2 text-xs text-slate-500 hover:text-slate-800"
              >
                + Add a subject of your own
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Adding…" : "Add lecture"}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePlaylistSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Playlist URL
            </label>
            <input
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=..."
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-400">
              Every video in the playlist gets added under the subject below,
              titled using its actual YouTube title.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Subject
            </label>
            <select
              required
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select a subject</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {addingSubject ? (
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Software Engineering"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={handleAddSubject}
                  className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setAddingSubject(false)}
                  className="shrink-0 rounded-lg px-2 text-sm text-slate-400 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingSubject(true)}
                className="mt-2 text-xs text-slate-500 hover:text-slate-800"
              >
                + Add a subject of your own
              </button>
            )}
          </div>

          {status && <p className="text-sm text-slate-500">{status}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Importing…" : "Import playlist"}
          </button>
        </form>
      )}
    </div>
  );
}
