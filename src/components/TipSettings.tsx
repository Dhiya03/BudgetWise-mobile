import { Bell, BellOff, Clock } from 'lucide-react';

interface TipSettingsProps {
  notificationsEnabled: boolean;
  onToggleNotifications: (enabled: boolean) => void;
  notificationTime: string;
  onTimeChange: (time: string) => void;
  t: (key: string, fallback?: string) => string;
}

const TipSettings = ({
  notificationsEnabled,
  onToggleNotifications,
  notificationTime,
  onTimeChange,
  t,
}: TipSettingsProps) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{t('settings.tipNotifications', 'Tip Notifications')}</h2>
      <div className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {notificationsEnabled ? (
              <Bell size={20} className="mr-3 text-purple-600" />
            ) : (
              <BellOff size={20} className="mr-3 text-gray-400" />
            )}
            <label htmlFor="notif-toggle" className="font-medium text-gray-700">
              {t('settings.dailyTipNotifications', 'Daily Tip Notifications')}
            </label>
          </div>
          <button
            id="notif-toggle"
            onClick={() => onToggleNotifications(!notificationsEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              notificationsEnabled ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Time Picker */}
        {notificationsEnabled && (
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <div className="flex items-center">
              <Clock size={20} className="mr-3 text-purple-600" />
              <label htmlFor="notif-time" className="font-medium text-gray-700">
                {t('settings.notificationTime', 'Notification Time')}
              </label>
            </div>
            <input
              id="notif-time"
              type="time"
              value={notificationTime}
              onChange={(e) => onTimeChange(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TipSettings;