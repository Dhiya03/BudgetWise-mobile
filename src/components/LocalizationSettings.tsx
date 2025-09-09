import { SupportedLanguage } from '../types';

interface LocalizationSettingsProps {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
}

const languageOptions: { code: SupportedLanguage; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
];

const LocalizationSettings = ({ currentLanguage, onLanguageChange }: LocalizationSettingsProps) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Language Settings</h2>
      <div>
        <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-2">
          App Language
        </label>
        <select id="language-select" value={currentLanguage} onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500">
          {languageOptions.map(opt => <option key={opt.code} value={opt.code}>{opt.name}</option>)}
        </select>
      </div>
    </div>
  );
};

export default LocalizationSettings;