import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY environment variable." },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const language = formData.get("language");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing audio file." }, { status: 400 });
    }

    const targetLanguage = language === "en" ? "en" : "sl";
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
      language: targetLanguage,
    });

    const text = transcription.text?.trim();
    const normalized = text?.toLowerCase() ?? "";
    if (
      normalized ===
      "prepiši slovenski govor natančno in naravno, z ustreznimi šumniki."
    ) {
      return NextResponse.json({ text: "" });
    }
    if (!text) {
      return NextResponse.json({ text: "" });
    }

    return NextResponse.json({ text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
