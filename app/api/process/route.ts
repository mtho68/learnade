import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  title: z.string().min(1).max(180),
  text: z.string().min(100).max(120_000),
});

export async function POST(request: NextRequest) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "The study material is missing or too large." }, { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI processing is not configured yet." }, { status: 503 });

  const prompt = `Create a concise, accurate learning package from the supplied source. Do not invent facts. Return JSON with: overview (string), objectives (string[]), keyTerms ({term,definition}[]), flashcards ({front,back}[]), quiz ({prompt,options,answer,explanation}[] where answer is the zero-based correct option), and narration (string).\n\nTITLE: ${parsed.data.title}\n\nSOURCE:\n${parsed.data.text}`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-5.6", input: prompt, text: { format: { type: "json_object" } } }),
  });
  if (!response.ok) return NextResponse.json({ error: "The learning package could not be generated." }, { status: 502 });
  const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  try { return NextResponse.json(JSON.parse(outputText || "{}")); }
  catch { return NextResponse.json({ error: "The learning package response was incomplete." }, { status: 502 }); }
}
