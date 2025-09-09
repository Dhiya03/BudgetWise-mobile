import { Lightbulb, X } from 'lucide-react';
import { FinancialTip, SupportedLanguage } from '../types';

interface InAppTipWidgetProps {
  tip: FinancialTip;
  language: SupportedLanguage;
  onClose: () => void;
}

const InAppTipWidget = ({ tip, language, onClose }: InAppTipWidgetProps) => {
  const localizedTip = tip.translations[language];

  return (
    <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto bg-purple-600 text-white p-4 rounded-2xl shadow-2xl z-50 animate-slide-up">
      <div className="flex items-start">
        <div className="flex-shrink-0 bg-purple-500 p-2 rounded-full">
          <Lightbulb size={20} />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-semibold">Quick Tip!</p>
          <p className="text-sm mt-1">{localizedTip.tip}</p>
        </div>
        <button onClick={onClose} className="ml-2 p-1 rounded-full hover:bg-purple-500">
          <X size={18} />
        </button>
      </div>
      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default InAppTipWidget;