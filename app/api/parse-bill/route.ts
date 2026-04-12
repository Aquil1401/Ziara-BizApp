import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Node.js runtime (NOT edge) to handle large base64 image payloads without truncation
export const maxDuration = 60;

// A server-side API route to securely talk to Gemini without leaking the API key to the browser
export async function POST(req: Request) {
  try {
    const { fileDataUrl, textData, prompt } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured on the server.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    let response;

    if (fileDataUrl) {
      // Extract mimeType and raw base64 from the data URL
      const matches = fileDataUrl.match(/^data:([a-zA-Z0-9+/.\-]+\/[a-zA-Z0-9+/.\-]+);base64,([\s\S]+)$/);
      if (!matches) {
        return NextResponse.json({ error: 'Invalid file data URL format' }, { status: 400 });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      console.log(`[parse-bill] Image received: mimeType=${mimeType}, base64Length=${base64Data.length}`);

      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: prompt },
            ],
          },
        ],
      });
    } else if (textData) {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt + '\n\nBill text:\n' + textData,
      });
    } else {
      return NextResponse.json({ error: 'No data provided to parse' }, { status: 400 });
    }

    let resText = response.text || '{}';
    console.log('[parse-bill] Raw Gemini response:', resText.slice(0, 500));

    resText = resText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    // Validate it parses correctly before sending back
    let parsedResult;
    try {
      parsedResult = JSON.parse(resText);
    } catch (e) {
      console.error('[parse-bill] Failed to parse Gemini output as JSON:', resText);
      return NextResponse.json({ error: 'Invalid JSON returned from AI' }, { status: 500 });
    }

    return NextResponse.json({ result: JSON.stringify(parsedResult) });
  } catch (error: any) {
    console.error('[parse-bill] Server Error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Error processing request' }, { status: 500 });
  }
}
