// Server side API route used instead to protect API key

/**
 * Parses a bill file (image, PDF, or Word) using Gemini.
 * Accepts a base64 data URL.
 */
export const parseBillFileWithAI = async (fileDataUrl: string): Promise<ParsedBill | null> => {
  try {
    const response = await fetch('/api/parse-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileDataUrl, prompt })
    });

    const data = await response.json();
    if (!response.ok || !data.result) {
      console.error('API Parse Error:', data.error);
      return null;
    }

    let resText = data.result || '{}';
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
- Today's date if none found: ${new Date().toISOString().split('T')[0]}`;

    const response = await fetch('/api/parse-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textData: text, prompt })
    });

    const data = await response.json();
    if (!response.ok || !data.result) {
        return fallbackParse(text);
    }

    let resText = data.result || '{}';
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
    console.error('Fetch Parse Error:', error);
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
