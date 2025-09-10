/**
 * Formats a number as a currency string using Indian Rupees (₹)
 * with international numbering system (e.g., 100,000).
 *
 * @param amount The number to format.
 * @returns A formatted currency string, e.g., "₹100,000".
 */
export const formatCurrency = (amount: number): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 2,
  });
  return `₹${formatter.format(amount)}`;
};