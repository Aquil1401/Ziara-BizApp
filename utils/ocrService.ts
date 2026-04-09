import Tesseract from 'tesseract.js';

export const extractTextFromImage = async (imageSrc: string): Promise<string> => {
  try {
    const { data: { text } } = await Tesseract.recognize(imageSrc, 'eng', {
      logger: m => console.log(m)
    });
    return text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
};
