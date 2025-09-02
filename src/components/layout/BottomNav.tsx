import React from 'react';
import { Plus, List, BarChart3, PieChart, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 px-2 py-2">
      <div className="flex justify-around">
        <button
          onClick={() => setActiveTab('add')}
          className={`flex flex-col items-center py-2 px-3 rounded-xl transition-colors ${
            activeTab === 'add' ? 'bg-purple-100 text-purple-600' : 'text-gray-600'
          }`}
        >
          <Plus size={20} />
          <span className="text-xs mt-1">Add</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center py-2 px-3 rounded-xl transition-colors ${
            activeTab === 'history' ? 'bg-purple-100 text-purple-600' : 'text-gray-600'
          }`}
        >
          <List size={20} />
          <span className="text-xs mt-1">History</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center py-2 px-3 rounded-xl transition-colors ${
            activeTab === 'analytics' ? 'bg-purple-100 text-purple-600' : 'text-gray-600'
          }`}
        >
          <BarChart3 size={20} />
          <span className="text-xs mt-1">Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('budget')}
          className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${
            activeTab === 'budget' ? 'bg-purple-100 text-purple-600' : 'text-gray-600'
          }`}
        >
          <PieChart size={24} />
          <span className="text-xs mt-1">Budget</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center py-2 px-4 rounded-xl transition-colors ${
            activeTab === 'settings' ? 'bg-purple-100 text-purple-600' : 'text-gray-600'
          }`}
        >
          <Settings size={24} />
          <span className="text-xs mt-1">Settings</span>
        </button>
      </div>
    </div>
  );
};

export default BottomNav;
