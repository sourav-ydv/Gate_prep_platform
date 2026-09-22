"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  if (apiLoadPromise) {
    return apiLoadPromise;
  }
  apiLoadPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
  return apiLoadPromise;
}

export default function YouTubePlayer({
  lectureId,
  videoId,
  initialWatchedSeconds,
}: {
  lectureId: string;
  videoId: string;
  initialWatchedSeconds: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = createClient();

  async function saveProgress(currentTime: number, duration: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const completed = duration > 0 && currentTime / duration >= 0.9;

    await supabase.from("lecture_progress").upsert(
      {
        user_id: user.id,
        lecture_id: lectureId,
        watched_seconds: Math.floor(currentTime),
        completed,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lecture_id" }
    );
  }

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { start: Math.floor(initialWatchedSeconds) },
        events: {
          onStateChange: (event: any) => {
            const YT_PLAYING = 1;
            const YT_PAUSED = 2;
            const YT_ENDED = 0;

            if (event.data === YT_PLAYING) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                const p = playerRef.current;
                if (p && p.getCurrentTime && p.getDuration) {
                  saveProgress(p.getCurrentTime(), p.getDuration());
                }
              }, 8000);
            }

            if (event.data === YT_PAUSED || event.data === YT_ENDED) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              const p = playerRef.current;
              if (p && p.getCurrentTime && p.getDuration) {
                saveProgress(p.getCurrentTime(), p.getDuration());
              }
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
