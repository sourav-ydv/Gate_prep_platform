import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const CHUNK_SIZE = 6000;
const MAX_CHUNKS = 12;

const PYQ_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: {
            type: ["array", "null"],
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
              },
              required: ["id", "text"],
              additionalProperties: false,
            },
          },
          correctOption: { type: ["string", "null"] },
          correctValue: { type: ["number", "null"] },
          year: { type: ["number", "null"] },
          marks: { type: "number" },
        },
        required: ["question", "options", "correctOption", "correctValue", "year", "marks"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

function buildPrompt(chunkText: string) {
  return `You are extracting exam questions from a GATE previous-year question paper (raw PDF text below — formatting may be messy, and this is a partial excerpt of a longer paper).

Extract every distinct question you can confidently identify in this excerpt, along with its options and correct answer if determinable (from an answer key elsewhere in the text, or clearly marked). If the correct answer isn't determinable, still include the question but set correctOption/correctValue to null. If this excerpt contains no complete questions, return an empty array.

Respond with ONLY valid JSON, no markdown fences, no extra text, in this exact shape:
{
  "questions": [
    {
      "question": "...",
      "options": [{"id":"a","text":"..."}, {"id":"b","text":"..."}, {"id":"c","text":"..."}, {"id":"d","text":"..."}],
      "correctOption": "b",
      "correctValue": null,
      "year": 2023,
      "marks": 1
    }
  ]
}

For numerical-answer questions (no options), omit "options" and "correctOption", and set "correctValue" to the number instead.

PDF text excerpt:
"""
${chunkText}
"""`;
}

async function callGroqOnce(chunkText: string, apiKey: string) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: buildPrompt(chunkText) }],
      temperature: 0.2,
      max_tokens: 1800,
      reasoning_effort: "medium",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "pyq_extraction",
          strict: true,
          schema: PYQ_SCHEMA,
        },
      },
    }),
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    return { status: res.status, data: null, headers: res.headers };
  }
  return { status: res.status, data, headers: res.headers };
}

async function extractFromChunk(chunkText: string, apiKey: string) {
  let attempt = 0;

  while (attempt < 2) {
    const { status, data, headers } = await callGroqOnce(chunkText, apiKey);

    if (status === 429) {
      const retryAfterHeader = headers?.get?.("retry-after");
      let waitMs = retryAfterHeader ? parseFloat(retryAfterHeader) * 1000 : null;

      if (!waitMs) {
        const match = data?.error?.message?.match(/try again in ([\d.]+)(m?s)/i);
        if (match) {
          waitMs = parseFloat(match[1]) * (match[2] === "ms" ? 1 : 1000);
        }
      }

      waitMs = Math.min(waitMs ?? 12000, 30000) + 500;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      attempt++;
      continue;
    }

    if (status !== 200) {
      return { questions: [], error: data?.error?.message ?? `status ${status}` };
    }

    const raw = data.choices?.[0]?.message?.content ?? "";
    let cleaned = raw.replace(/```json|```/g, "").trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    try {
      const parsed = JSON.parse(cleaned);
      const questions = parsed.questions ?? [];
      if (questions.length === 0) {
        const snippet = raw.slice(0, 150).replace(/\s+/g, " ");
        return { questions: [], error: `0 questions found in this part (model said: "${snippet}...")` };
      }
      return { questions, error: null };
    } catch {
      const snippet = raw.slice(0, 150).replace(/\s+/g, " ");
      return { questions: [], error: `could not parse AI response (got: "${snippet}...")` };
    }
  }

  return { questions: [], error: "rate limited after 2 attempts" };
}

export async function POST(request: NextRequest) {
  const { pdfBase64, chunkIndex = 0 } = await request.json();

  if (!pdfBase64) {
    return NextResponse.json({ error: "Missing pdfBase64" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY is not set on the server" }, { status: 500 });
  }

  let text: string;
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const buffer = Buffer.from(pdfBase64, "base64");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    text = result.text;
  } catch {
    return NextResponse.json(
      { error: "Couldn't read that PDF. Make sure it's a text-based PDF, not a scanned image." },
      { status: 422 }
    );
  }

  if (!text || text.trim().length < 100) {
    return NextResponse.json(
      { error: "No readable text found in that PDF. Scanned/image-only PDFs aren't supported yet." },
      { status: 422 }
    );
  }

  const totalChunks = Math.min(Math.ceil(text.length / CHUNK_SIZE), MAX_CHUNKS);

  if (chunkIndex >= totalChunks) {
    return NextResponse.json({ questions: [], chunkIndex, totalChunks, done: true });
  }

  const chunkText = text.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
  const { questions, error } = await extractFromChunk(chunkText, apiKey);

  return NextResponse.json({
    questions,
    error,
    chunkIndex,
    totalChunks,
    done: chunkIndex + 1 >= totalChunks,
  });
}