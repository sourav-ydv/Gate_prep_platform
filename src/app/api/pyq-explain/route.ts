import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { pyqId } = await request.json();

  if (!pyqId) {
    return NextResponse.json({ error: "Missing pyqId" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: pyq } = await supabase
    .from("pyqs")
    .select("question, options, correct_option, correct_value, explanation")
    .eq("id", pyqId)
    .single();

  if (!pyq) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  if (pyq.explanation) {
    return NextResponse.json({ explanation: pyq.explanation });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY is not set on the server" }, { status: 500 });
  }

  const answerDescription = pyq.options
    ? `The correct option is: ${
        (pyq.options as { id: string; text: string }[]).find(
          (o) => o.id === pyq.correct_option
        )?.text ?? pyq.correct_option
      }`
    : `The correct numerical answer is: ${pyq.correct_value}`;

  const prompt = `You are explaining a GATE exam question to a student. Give a clear, step-by-step explanation of why the correct answer is right (150 words max). No preamble, just the explanation.

Question: ${pyq.question}
${pyq.options ? `Options: ${(pyq.options as { id: string; text: string }[]).map((o) => `${o.id}) ${o.text}`).join(", ")}` : ""}
${answerDescription}`;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
      reasoning_effort: "low",
    }),
  });

  const groqData = await groqRes.json();

  if (!groqRes.ok) {
    return NextResponse.json(
      { error: groqData.error?.message ?? "Groq request failed" },
      { status: 502 }
    );
  }

  const explanation = groqData.choices?.[0]?.message?.content?.trim() ?? "";

  await supabase.from("pyqs").update({ explanation }).eq("id", pyqId);

  return NextResponse.json({ explanation });
}