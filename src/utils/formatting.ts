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