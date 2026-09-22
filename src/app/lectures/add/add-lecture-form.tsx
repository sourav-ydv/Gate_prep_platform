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
  topics,
  defaultTopicId,
}: {
  topics: { id: string; label: string }[];
  defaultTopicId: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"single" | "playlist">("single");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [topicId, setTopicId] = useState(defaultTopicId);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500";

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!topicId) {
      setError("Pick a topic for this lecture.");
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
        topic_id: topicId,
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

    if (!topicId) {
      setError("Pick a topic for these lectures.");
      return;
    }

    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      setError("That doesn't look like a valid YouTube playlist URL — it should contain '?list='.");
      return;
    }

    setLoading(true);
    setStatus("Fetching playlist from YouTube…");

    const res = await fetch("/api/import-playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Could not fetch that playlist.");
      setLoading(false);
      setStatus(null);
      return;
    }

    if (!data.videos || data.videos.length === 0) {
      setError("No videos found in that playlist.");
      setLoading(false);
      setStatus(null);
      return;
    }

    setStatus(`Found ${data.videos.length} videos. Adding them…`);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be signed in.");
      setLoading(false);
      setStatus(null);
      return;
    }

    const rows = data.videos.map((v: { videoId: string; title: string }) => ({
      topic_id: topicId,
      title: v.title,
      url: `https://www.youtube.com/watch?v=${v.videoId}`,
      source_type: "youtube",
      added_by: user.id,
    }));

    const { error: insertError } = await supabase.from("lectures").insert(rows);

    setLoading(false);
    setStatus(null);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/lectures");
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
              Topic
            </label>
            <select
              required
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select a topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
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
              Every video in the playlist gets added under the topic below,
              titled using its actual YouTube title.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Topic
            </label>
            <select
              required
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="">Select a topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
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
