import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { messages, animal } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not set" }, { status: 500 });
  }

  // Add the full animal object as a JSON string in the system prompt
  const animalInfo = animal ? `\nAnimal details (JSON):\n${JSON.stringify(animal, null, 2)}` : '';
  const systemPrompt = `You are a helpful farm assistant AI. The user is interested in the following animal. Answer their questions conversationally and informatively, always considering the animal context. If the user asks about something else, gently redirect to the animal topic.${animalInfo}`;

  const openaiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role,
      content: m.text,
    })),
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: openaiMessages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "OpenAI API error" }, { status: 500 });
  }

  const data = await response.json();
  const aiMessage = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

  return NextResponse.json({ aiMessage });
} 