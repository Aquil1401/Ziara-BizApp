import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'edge'; // Optional, but makes standard Fetch APIs faster if no node integrations needed. 

// A server-side API route to securely talk to Gemini without leaking the API key to the browser
export async function POST(req: Request) {
  try {
    const { fileDataUrl, textData, prompt } = await req.json();
    
    // Notice how we use process.env.GEMINI_API_KEY instead of NEXT_PUBLIC_GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured on the server.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    let response;

    if (fileDataUrl) {
      const matches = fileDataUrl.match(/^data:([a-zA-Z0-9+/.-]+\/[a-zA-Z0-9+/.-]+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json({ error: 'Invalid file data URL format' }, { status: 400 });
      }
      
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: matches[1], data: matches[2] } },
              { text: prompt },
            ],
          },
        ],
      });
    } else if (textData) {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt + '\n\n' + textData,
      });
    } else {
      return NextResponse.json({ error: 'No data provided to parse' }, { status: 400 });
    }

    let resText = response.text || '{}';
    resText = resText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    
    return NextResponse.json({ result: resText });
  } catch (error: any) {
    console.error('Server API Parse Error:', error);
    return NextResponse.json({ error: error.message || 'Error processing request' }, { status: 500 });
  }
}
