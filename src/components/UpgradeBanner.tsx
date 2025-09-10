import { useEffect } from 'react';
import { Star } from 'lucide-react';
import { trackEvent } from '../utils/analytics';

interface UpgradeBannerProps {
  title: string;
  description: string;
  buttonText: string;
  onButtonClick: () => void;
  eventName?: string;
  eventProperties?: Record<string, any>;
}

const UpgradeBanner = ({ title, description, buttonText, onButtonClick, eventName, eventProperties }: UpgradeBannerProps) => {
  // Track when the banner is viewed
  useEffect(() => {
    if (eventName) {
      trackEvent(eventName, eventProperties);
    }
  }, [eventName, eventProperties]);

  const handleBannerClick = () => {
    if (eventName) {
      trackEvent('upgrade_prompt_clicked', eventProperties);
    }
    onButtonClick();
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
          <Star className="text-yellow-500" size={24} />
        </div>
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      <button
        onClick={handleBannerClick}
        className="p-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors w-full sm:w-auto sm:px-6"
      >
        {buttonText}
      </button>
    </div>
  );
};

export default UpgradeBanner;
