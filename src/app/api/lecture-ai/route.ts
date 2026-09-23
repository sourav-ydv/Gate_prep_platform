import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  const listRes = await fetch(
    `https://video.google.com/timedtext?type=list&v=${videoId}`
  );
  const listXml = await listRes.text();

  const trackMatch =
    listXml.match(/<track[^>]*lang_code="en"[^>]*>/) ??
    listXml.match(/<track[^>]*>/);

  if (!trackMatch) return null;

  const langMatch = trackMatch[0].match(/lang_code="([^"]+)"/);
  const kindMatch = trackMatch[0].match(/kind="([^"]+)"/);
  const lang = langMatch ? langMatch[1] : "en";
  const kind = kindMatch ? `&kind=${kindMatch[1]}` : "";

  const textRes = await fetch(
    `https://video.google.com/timedtext?lang=${lang}${kind}&v=${videoId}`
  );
  const textXml = await textRes.text();

  const lines = [...textXml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map(
    (m) => decodeEntities(m[1].replace(/<[^>]+>/g, ""))
  );

  const transcript = lines.join(" ").replace(/\s+/g, " ").trim();
  return transcript.length > 200 ? transcript : null;
}

export async function POST(request: NextRequest) {
  const { lectureId, videoId, manualTranscript } = await request.json();

  if (!lectureId || !videoId) {
    return NextResponse.json({ error: "Missing lectureId or videoId" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: cached } = await supabase
    .from("lecture_ai_content")
    .select("summary, quiz")
    .eq("lecture_id", lectureId)
    .maybeSingle();

  if (cached && !manualTranscript) {
    return NextResponse.json(cached);
  }

  let transcript: string | null = manualTranscript?.trim() || null;

  if (!transcript) {
    transcript = await fetchTranscript(videoId);
  }

  if (!transcript) {
    return NextResponse.json(
      { error: "This video doesn't have captions available, so a summary can't be generated." },
      { status: 422 }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY is not set on the server" }, { status: 500 });
  }

  const truncated = transcript.slice(0, 12000);

  const prompt = `You are helping a GATE exam student review a lecture. Below is the transcript of a lecture video.

1. Write a clear, well-organized summary (150-250 words) covering the key concepts taught.
2. Write exactly 5 multiple-choice questions testing understanding of the material, each with 4 options, one correct answer, and a short explanation.

Respond with ONLY valid JSON, no markdown fences, no extra text, in this exact shape:
{
  "summary": "...",
  "quiz": [
    { "question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "..." }
  ]
}

Transcript:
"""
${truncated}
"""`;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 2000,
    }),
  });

  const groqData = await groqRes.json();

  if (!groqRes.ok) {
    return NextResponse.json(
      { error: groqData.error?.message ?? "Groq request failed" },
      { status: 502 }
    );
  }

  const raw = groqData.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "AI response could not be parsed" }, { status: 502 });
  }

  await supabase.from("lecture_ai_content").upsert(
    {
      lecture_id: lectureId,
      summary: parsed.summary,
      quiz: parsed.quiz,
    },
    { onConflict: "lecture_id" }
  );

  return NextResponse.json({ summary: parsed.summary, quiz: parsed.quiz });
}
