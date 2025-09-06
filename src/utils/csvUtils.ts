// Escapes CSV fields correctly for Google Sheets, Excel, etc.
export const escapeCsvField = (field: any): string => {
  if (field === null || field === undefined) return '';
  if (typeof field === 'number') return String(field);
  const str = String(field);
  // Check if the field contains a comma, a double quote, or a newline
  if (/[",\n]/.test(str)) {
    // Wrap in double quotes and escape any existing double quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};