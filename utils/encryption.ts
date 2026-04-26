import CryptoJS from "crypto-js";

// A secure key derived from environment or a fallback for offline-first protection
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "BizApp_Secure_Local_Key_2026!";

/**
 * Encrypts a JSON-serializable object into an AES ciphertext string.
 */
export const encryptData = (data: any): string => {
  const jsonStr = JSON.stringify(data);
  return CryptoJS.AES.encrypt(jsonStr, ENCRYPTION_KEY).toString();
};

/**
 * Decrypts an AES ciphertext string back into an object.
 * Seamlessly handles plain-text strings for backwards compatibility/migration.
 */
export const decryptData = (cipherText: string): any => {
  // Migration fallback: if data is already in plain text
  if (cipherText.startsWith('[') || cipherText.startsWith('{')) {
    return JSON.parse(cipherText);
  }
  
  const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
  const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
  
  if (!decryptedData) {
    throw new Error("Decryption returned empty string (wrong key or corrupted data)");
  }
  
  return JSON.parse(decryptedData);
};
