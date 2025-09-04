import React from 'react';
import { Trash2, BellRing } from 'lucide-react';
import { SpendingAlert } from '../types';

interface AlertManagementProps {
  spendingAlerts: SpendingAlert[];
  onDeleteAlert: (alertId: number) => void;
}

const AlertManagement: React.FC<AlertManagementProps> = ({ spendingAlerts, onDeleteAlert }) => {
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
                <BellRing size={18} className="mr-3 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-800">{alert.category}</p>
                  <p className="text-xs text-gray-600">
                    Alert when spending is above ₹{alert.threshold}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onDeleteAlert(alert.id)}
                className="p-2 text-red-500 hover:bg-red-100 rounded-full"
                title="Delete Alert"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertManagement;