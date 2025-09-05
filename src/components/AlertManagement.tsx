import React from 'react';
import { Trash2, BellRing, Bell, BellOff } from 'lucide-react';
import { SpendingAlert } from '../types';

interface AlertManagementProps {
  spendingAlerts: SpendingAlert[];
  onDeleteAlert: (alertId: number) => void;
  onToggleSilence: (alertId: number) => void;
}

const AlertManagement: React.FC<AlertManagementProps> = ({ spendingAlerts, onDeleteAlert, onToggleSilence }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Manage Spending Alerts</h2>
      {spendingAlerts.length === 0 ? (
        <p className="text-gray-500 text-sm">You have no active spending alerts.</p>
      ) : (
        <div className="space-y-3">
          {spendingAlerts.map(alert => (
            <div key={alert.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center">
                <BellRing size={18} className={`mr-3 transition-colors ${alert.isSilenced ? 'text-gray-400' : 'text-purple-600'}`} />
                <div>
                  <p className="font-medium text-gray-800">{alert.category}</p>
                  <p className="text-xs text-gray-600">
                    Alert when spending is above ₹{alert.threshold}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onToggleSilence(alert.id)}
                  className={`p-2 rounded-full transition-colors ${alert.isSilenced ? 'text-gray-500 hover:bg-gray-200' : 'text-purple-600 hover:bg-purple-100'}`}
                  title={alert.isSilenced ? "Unsilence Alert" : "Silence Alert"}
                >
                  {alert.isSilenced ? <BellOff size={16} /> : <Bell size={16} />}
                </button>
                <button
                  onClick={() => onDeleteAlert(alert.id)}
                  className="p-2 text-red-500 hover:bg-red-100 rounded-full"
                  title="Delete Alert"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertManagement;