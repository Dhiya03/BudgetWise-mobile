import { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import { SupportedLanguage } from './types';
import FinancialTipsService from './components/FinancialTipsService';

// Define the shape of the context
interface LocalizationContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
  isLoaded: boolean;
}

// Create the context with a default value
const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

// Define the provider component
export const LocalizationProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(FinancialTipsService.getUserLanguage());
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchTranslations = useCallback(async (lang: SupportedLanguage) => {
    setIsLoaded(false);
    try {
      const response = await fetch(`/i18n/${lang}.json`);
      if (!response.ok) throw new Error('Failed to load translations');
      const data = await response.json();
      setTranslations(data);
    } catch (error) {
      console.error(`Could not load translations for ${lang}, falling back to English.`, error);
      // Fallback to English if the selected language fails
      if (lang !== 'en') {
        const response = await fetch(`/i18n/en.json`);
        const data = await response.json();
        setTranslations(data);
      }
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchTranslations(language);
  }, [language, fetchTranslations]);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('budgetwise_user_language', lang);
  };

  const t = useCallback((key: string, fallback?: string): string => {
    return translations[key] || fallback || key;
  }, [translations]);

  const value = { language, setLanguage, t, isLoaded };
  console.log("LocalizationProvider mounted with language:", language);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

// Custom hook to use the localization context
export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};