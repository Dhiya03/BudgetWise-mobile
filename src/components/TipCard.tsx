import { Share } from '@capacitor/share';
import { FinancialTip, SupportedLanguage } from '../types';
import { useLocalization } from '../components/LocalizationContext';

interface TipCardProps {
  tip: FinancialTip;
  language: SupportedLanguage;
}

const TipCard = ({ tip, language }: TipCardProps) => {
  const { t } = useLocalization();
  const localizedTip = tip.translations[language] || tip.translations.en;

  const handleShare = async () => {
    await Share.share({
      title: 'BudgetWise Tip',
      text: localizedTip.shareText,
      dialogTitle: 'Share this tip with friends',
    });
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
      <div className="flex items-start">
        <span className="text-3xl mr-4">{tip.emoji}</span>
        <div className="flex-1">
          <p className="text-gray-700">{localizedTip.tip}</p>
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs font-medium bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              {tip.category.replace('-', ' ')}
            </span>
            <button onClick={handleShare} className="text-sm font-semibold text-purple-600 hover:text-purple-800">{t('general.share', 'Share')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TipCard;