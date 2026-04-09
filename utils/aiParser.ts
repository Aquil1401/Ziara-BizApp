import { GoogleGenAI } from '@google/genai';

export interface ParsedBillItem {
  description: string;
  quantity: number;
  rate: number;
  taxRate?: number;
  taxAmount?: number;
  hsnCode?: string;
  total: number;
}

export interface ParsedBill {
  invoiceNumber?: string;
  date?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  supplier?: string;
  items: ParsedBillItem[];
  subtotal?: number;
  taxAmount?: number;
  grandTotal?: number;
  notes?: string;
}

const getGenAI = () => {
  const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

/**
 * Parses a bill file (image, PDF, or Word) using Gemini.
 * Accepts a base64 data URL.
 */
export const parseBillFileWithAI = async (fileDataUrl: string): Promise<ParsedBill | null> => {
  const ai = getGenAI();

  if (!ai) {
    console.warn('Gemini API key not configured. Cannot parse file without AI.');
    return null;
  }

  // Extract mime type and base64 data from data URL
  const matches = fileDataUrl.match(/^data:([a-zA-Z0-9+/.-]+\/[a-zA-Z0-9+/.-]+);base64,(.+)$/);
  if (!matches) {
    console.error('Invalid file data URL format');
    return null;
  }
  const mimeType = matches[1];
  const base64Data = matches[2];

  const prompt = `You are an expert at reading invoices, sales bills, and receipts (images, PDFs, or Word documents) with a focus on Indian Taxation (GST).
  
Look carefully at this document and extract ALL information visible. If it is a PDF or Word document, read all pages if applicable.

Return ONLY a valid JSON object (no markdown, no code fences, no explanation) with this EXACT structure:
{
  "invoiceNumber": "string or null",
  "date": "YYYY-MM-DD format or null",
  "customerName": "customer or buyer name or null",
  "customerAddress": "customer address or location or null",
  "customerPhone": "customer phone number or null",
  "supplier": "supplier or seller name or null",
  "items": [
    {
      "description": "product name exactly as written",
      "hsnCode": "HSN/SAC code if visible or null",
      "quantity": number,
      "rate": number,
      "taxRate": number (e.g. 18 for 18% GST),
      "taxAmount": number,
      "total": number (including tax)
    }
  ],
  "subtotal": number (before tax),
  "taxAmount": number (total tax amount),
  "grandTotal": number or null,
  "notes": "any additional remarks ONLY"
}

IMPORTANT rules for GST extraction:
- Look for "HSN", "SAC", "GST%", "IGST", "CGST", "SGST".
- taxRate should be the total GST percentage (e.g., if CGST 9% and SGST 9%, taxRate is 18).
- Extract HSN code for each item if mentioned.
- If individual tax is not mentioned but a total GST is shown, divide it proportionally among items or use the total fields.

IMPORTANT layout rules for Indian handwritten bills:
- The FIRST line often has a bill/invoice number (e.g. "173") and a date.
- The SECOND line is the CUSTOMER NAME — extract this exactly.
- The THIRD line is the CUSTOMER ADDRESS.
- nouns should ONLY contain genuine extra remarks.
- Extract ALL line items visible in the bill.
- For Indian bills, "110/-" means 110 rupees.
- If quantity is not written, default to 1.
- Today's date if none found: ${new Date().toISOString().split('T')[0]}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    let resText = response.text || '{}';
    resText = resText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    const parsed = JSON.parse(resText) as ParsedBill;

    if (!parsed.items || !Array.isArray(parsed.items)) {
      parsed.items = [];
    }

    // Normalise and recalculate each item
    parsed.items = parsed.items.map((item) => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.rate) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const taxAmount = Number(item.taxAmount) || (qty * rate * taxRate) / 100;
      const total = Number(item.total) || qty * rate + taxAmount;
      return {
        description: item.description || 'Unknown Item',
        hsnCode: item.hsnCode || undefined,
        quantity: qty,
        rate: rate,
        taxRate: taxRate,
        taxAmount: taxAmount,
        total: total,
      };
    });

    // Recalculate grand total if missing
    if (!parsed.grandTotal && parsed.items.length > 0) {
      parsed.grandTotal = parsed.items.reduce((sum, item) => sum + item.total, 0);
    }

    return parsed;
  } catch (error) {
    console.error('Gemini Vision Parse Error:', error);
    return null;
  }
};

/**
 * Legacy text-based parser — used as a fallback when no image is available.
 */
export const parseBillTextWithAI = async (text: string): Promise<ParsedBill | null> => {
  const ai = getGenAI();

  if (!ai) {
    console.warn('Gemini API key not configured. Falling back to regex.');
    return fallbackParse(text);
  }

  try {
    const prompt = `You are an expert at reading handwritten invoices, sales bills, and receipts from small businesses — especially Indian wholesale/FMCG businesses.

Extract all details from the following bill/invoice text. The bill may be handwritten and OCR-scanned, so text may be imperfect.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "invoiceNumber": "string or null",
  "date": "YYYY-MM-DD format or null",
  "customerName": "customer or buyer name or null",
  "supplier": "supplier or seller name or null",
  "items": [
    {
      "description": "product name",
      "quantity": number,
      "rate": number,
      "total": number
    }
  ],
  "grandTotal": number or null,
  "notes": "any additional notes or null"
}

Rules:
- Extract ALL line items, not just the first one
- If quantity is missing, default to 1
- If rate is missing but total is present, set rate = total / quantity
- If total is missing but rate and quantity are present, set total = rate * quantity
- For Indian bills, amounts like "110/-" or "110-" mean 110 rupees
- If a number appears twice side by side (like "110/- 110/-"), that's rate and total
- "DD Sale", "Sale", "Purchase" in the header indicates the bill type
- Ignore stamps, watermarks, decorative elements
- Today's date if none found: ${new Date().toISOString().split('T')[0]}

Bill text:
${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let resText = response.text || '{}';
    resText = resText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    const parsed = JSON.parse(resText) as ParsedBill;

    if (!parsed.items || !Array.isArray(parsed.items)) {
      parsed.items = [];
    }

    parsed.items = parsed.items.map((item) => ({
      description: item.description || 'Unknown Item',
      quantity: Number(item.quantity) || 1,
      rate: Number(item.rate) || 0,
      total: Number(item.total) || (Number(item.quantity) || 1) * (Number(item.rate) || 0),
    }));

    if (!parsed.grandTotal && parsed.items.length > 0) {
      parsed.grandTotal = parsed.items.reduce((sum, item) => sum + item.total, 0);
    }

    return parsed;
  } catch (error) {
    console.error('AI Parse Error:', error);
    return fallbackParse(text);
  }
};

// Basic regex fallback when no Gemini key is configured
function fallbackParse(text: string): ParsedBill {
  const result: ParsedBill = { items: [] };

  const dateMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dateMatch) {
    const [, d, m, y] = dateMatch;
    const year = y.length === 2 ? `20${y}` : y;
    result.date = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const totalMatch = text.match(/(?:total|grand total|amount)[\s:]*[₹\$]?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (totalMatch) {
    result.grandTotal = parseFloat(totalMatch[1].replace(',', ''));
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  lines.forEach((line) => {
    const numMatches = line.match(/(\d+(?:\.\d+)?)/g);
    if (numMatches && numMatches.length >= 1) {
      const words = line.replace(/\d+[\/\-]?\s*/g, '').trim();
      if (words.length > 2) {
        const amount = parseFloat(numMatches[numMatches.length - 1]);
        result.items.push({
          description: words,
          quantity: 1,
          rate: amount,
          total: amount,
        });
      }
    }
  });

  return result;
}
