import React from 'react';
import { Plus, List, PieChart, BarChart3, Bell } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  t: (key: string, fallback?: string) => string;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange, t }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200">
      <div className="flex justify-around">
        <button
          onClick={() => onTabChange('add')}
          className="w-1/5 flex justify-center items-center py-2 group"
        >
          <div className={`flex flex-col items-center justify-center w-16 py-2 rounded-xl transition-colors ${
            activeTab === 'add' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 group-hover:bg-gray-100'
          }`}>
            <Plus size={24} />
            <span className="text-xs mt-1">{t('tabs.add', 'Add')}</span>
          </div>
        </button>

        <button
          onClick={() => onTabChange('history')}
          className="w-1/5 flex justify-center items-center py-2 group"
        >
          <div className={`flex flex-col items-center justify-center w-16 py-2 rounded-xl transition-colors ${
            activeTab === 'history' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 group-hover:bg-gray-100'
          }`}>
            <List size={24} />
            <span className="text-xs mt-1">{t('tabs.history', 'History')}</span>
          </div>
        </button>

        <button
          onClick={() => onTabChange('analytics')}
          className="w-1/5 flex justify-center items-center py-2 group"
        >
          <div className={`flex flex-col items-center justify-center w-16 py-2 rounded-xl transition-colors ${
            activeTab === 'analytics' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 group-hover:bg-gray-100'
          }`}>
            <BarChart3 size={24} />
            <span className="text-xs mt-1">{t('tabs.analytics', 'Analytics')}</span>
          </div>
        </button>

        <button
          onClick={() => onTabChange('budget')}
          className="w-1/5 flex justify-center items-center py-2 group"
        >
          <div className={`flex flex-col items-center justify-center w-16 py-2 rounded-xl transition-colors ${
            activeTab === 'budget' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 group-hover:bg-gray-100'
          }`}>
            <PieChart size={24} />
            <span className="text-xs mt-1">{t('tabs.budget', 'Budget')}</span>
          </div>
        </button>

        <button
          onClick={() => onTabChange('reminders')}
          className="w-1/5 flex justify-center items-center py-2 group"
        >
          <div className={`flex flex-col items-center justify-center w-16 py-2 rounded-xl transition-colors ${
            activeTab === 'reminders' ? 'bg-purple-100 text-purple-600' : 'text-gray-600 group-hover:bg-gray-100'
          }`}>
            <Bell size={24} />
            <span className="text-xs mt-1">{t('tabs.reminders', 'Reminders')}</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default BottomNavigation;
