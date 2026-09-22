import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import YouTubePlayer from "@/components/youtube-player";
import ManualProgress from "@/components/manual-progress";
import DeleteLectureButton from "@/components/delete-lecture-button";
import { extractYouTubeId, toDriveEmbedUrl } from "@/lib/youtube";

export default async function LecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: lecture } = await supabase
    .from("lectures")
    .select("id, title, url, source_type")
    .eq("id", id)
    .single();

  if (!lecture) notFound();

  const { data: progress } = await supabase
    .from("lecture_progress")
    .select("watched_seconds, completed")
    .eq("user_id", user.id)
    .eq("lecture_id", id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/lectures" className="text-sm text-slate-400 hover:text-slate-600">
          ← Lectures
        </Link>
        <div className="mb-6 mt-1 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">
            {lecture.title}
          </h1>
          <DeleteLectureButton id={lecture.id} title={lecture.title} />
        </div>

        {lecture.source_type === "youtube" && extractYouTubeId(lecture.url) && (
          <YouTubePlayer
            lectureId={lecture.id}
            videoId={extractYouTubeId(lecture.url)!}
            initialWatchedSeconds={progress?.watched_seconds ?? 0}
          />
        )}

        {lecture.source_type === "drive" && (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              src={toDriveEmbedUrl(lecture.url)}
              className="h-full w-full"
              allow="autoplay"
            />
          </div>
        )}

        {lecture.source_type === "other" && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="mb-4 text-sm text-slate-500">
              This link opens outside the platform.
            </p>
            <a
              href={lecture.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-900 underline"
            >
              Open lecture ↗
            </a>
          </div>
        )}

        <div className="mt-4">
          {lecture.source_type === "youtube" ? (
            <p className="text-xs text-slate-400">
              Progress saves automatically as you watch.
            </p>
          ) : (
            <ManualProgress
              lectureId={lecture.id}
              initialCompleted={progress?.completed ?? false}
            />
          )}
        </div>
      </div>
    </main>
  );
}
