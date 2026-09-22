export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace("www.", "");

    if (host === "youtu.be") {
      return u.pathname.slice(1) || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        return u.searchParams.get("v");
      }
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/embed/")[1] || null;
      }
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/shorts/")[1] || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function extractPlaylistId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    return u.searchParams.get("list");
  } catch {
    return null;
  }
}

export function detectSourceType(url: string): "youtube" | "drive" | "other" {
  try {
    const host = new URL(url.trim()).hostname.replace("www.", "");
    if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") {
      return "youtube";
    }
    if (host === "drive.google.com") {
      return "drive";
    }
    return "other";
  } catch {
    return "other";
  }
}

export function toDriveEmbedUrl(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return url;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}