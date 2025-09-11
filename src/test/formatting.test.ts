import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate } from '../utils/formatting';
import { SupportedLanguage } from '../types';

describe('formatCurrency', () => {
  it('should format currency with international separators for English', () => {
    const language: SupportedLanguage = 'en';
    expect(formatCurrency(1000, language)).toBe('₹1,000');
    expect(formatCurrency(100000, language)).toBe('₹100,000');
    expect(formatCurrency(1234567.89, language)).toBe('₹1,234,567.89');
    expect(formatCurrency(-5000, language)).toBe('₹-5,000');
  });

  it('should format currency with Indian numbering system for Hindi', () => {
    const language: SupportedLanguage = 'hi';
    expect(formatCurrency(1000, language)).toBe('₹1,000');
    expect(formatCurrency(100000, language)).toBe('₹1,00,000'); // Lakh
    expect(formatCurrency(1234567.89, language)).toBe('₹12,34,567.89');
    expect(formatCurrency(10000000, language)).toBe('₹1,00,00,000'); // Crore
    expect(formatCurrency(-50000, language)).toBe('₹-50,000');
  });

  it('should format currency with Indian numbering system for Tamil', () => {
    const language: SupportedLanguage = 'ta';
    expect(formatCurrency(100000, language)).toBe('₹1,00,000');
  });

  it('should format currency with Indian numbering system for Telugu', () => {
    const language: SupportedLanguage = 'te';
    expect(formatCurrency(100000, language)).toBe('₹1,00,000');
  });

  it('should handle zero and small numbers correctly', () => {
    expect(formatCurrency(0, 'en')).toBe('₹0');
    expect(formatCurrency(50, 'en')).toBe('₹50');
    expect(formatCurrency(0, 'hi')).toBe('₹0');
    expect(formatCurrency(50, 'hi')).toBe('₹50');
  });
});

describe('formatDate', () => {
  it('should format a YYYY-MM-DD string to DD/MM/YYYY for English', () => {
    const language: SupportedLanguage = 'en';
    expect(formatDate('2024-07-17', language)).toBe('17/07/2024');
  });

  it('should format an ISO string to DD/MM/YYYY for English', () => {
    const language: SupportedLanguage = 'en';
    expect(formatDate('2024-07-17T10:20:30Z', language)).toBe('17/07/2024');
  });

  it('should format a YYYY-MM-DD string to a localized format for Hindi', () => {
    const language: SupportedLanguage = 'hi';
    // Note: The exact output can vary based on the Node.js Intl implementation.
    // This test assumes a common format.
    expect(formatDate('2024-07-17', language)).toBe('17/07/2024');
  });
});