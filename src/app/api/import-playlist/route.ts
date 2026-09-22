import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { playlistId } = await request.json();

  if (!playlistId) {
    return NextResponse.json({ error: "Missing playlistId" }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY is not set on the server" },
      { status: 500 }
    );
  }

  const videos: { videoId: string; title: string }[] = [];
  let pageToken = "";

  try {
    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("maxResults", "50");
      url.searchParams.set("playlistId", playlistId);
      url.searchParams.set("key", apiKey);
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok) {
        return NextResponse.json(
          { error: data.error?.message ?? "YouTube API request failed" },
          { status: 502 }
        );
      }

      for (const item of data.items ?? []) {
        const videoId = item.snippet?.resourceId?.videoId;
        const title = item.snippet?.title;
        if (videoId && title && title !== "Private video" && title !== "Deleted video") {
          videos.push({ videoId, title });
        }
      }

      pageToken = data.nextPageToken ?? "";
    } while (pageToken);

    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json({ error: "Failed to fetch playlist" }, { status: 500 });
  }
}
