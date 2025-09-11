import { SupportedLanguage } from '../types';

/**
 * Formats a number as a currency string using Indian Rupees (₹).
 * Uses 'en-IN' for Indian languages to get Lakh/Crore separators,
 * and 'en-US' for English for international comma separators.
 *
 * @param amount The number to format.
 * @param language The current language code.
 * @returns A formatted currency string, e.g., "₹1,00,000".
 */
export const formatCurrency = (amount: number, language: SupportedLanguage): string => {
  const locale = language === 'en' ? 'en-US' : 'en-IN';
  const formatter = new Intl.NumberFormat(locale, {
    style: 'decimal',
    maximumFractionDigits: 2,
  });
  return `₹${formatter.format(amount)}`;
};

/**
 * Formats a date string into a localized, readable format (e.g., DD/MM/YYYY).
 *
 * @param dateString The date string to format (accepts "YYYY-MM-DD" or full ISO string).
 * @param language The current language code.
 * @returns A formatted date string.
 */
export const formatDate = (dateString: string, language: SupportedLanguage): string => {
  // If it's just a date string (YYYY-MM-DD), add time to avoid timezone issues.
  // If it's a full ISO string, new Date() handles it correctly.
  const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
  // Use 'en-GB' for English to get DD/MM/YYYY, and the language code for others.
  const locale = language === 'en' ? 'en-GB' : language;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};