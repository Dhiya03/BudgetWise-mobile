import { useState } from 'react';
import { Bell, Edit3, Trash2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { BillReminder } from '../types';

interface BillReminderTabProps {
  billReminders: BillReminder[];
  setBillReminders: React.Dispatch<React.SetStateAction<BillReminder[]>>;
  showConfirmation: (title: string, message: string, onConfirm: () => void | Promise<void>) => void;
}

const BillReminderTab = ({ billReminders, setBillReminders, showConfirmation }: BillReminderTabProps) => {
  const [editingBillReminder, setEditingBillReminder] = useState<BillReminder | null>(null);
  const [billForm, setBillForm] = useState({ name: '', amount: '', dueDate: '' });

  const handleCancelBillEdit = () => {
    setEditingBillReminder(null);
    setBillForm({ name: '', amount: '', dueDate: '' });
  };

  const editBillReminder = (reminder: BillReminder) => {
    setEditingBillReminder(reminder);
    setBillForm({
      name: reminder.name,
      amount: reminder.amount.toString(),
      dueDate: reminder.dueDate,
    });
  };

  const addOrUpdateBillReminder = async () => {
    if (!billForm.name || !billForm.amount || !billForm.dueDate) return;

    if (editingBillReminder) {
      // --- Update Logic ---
      const updatedReminder = {
        ...editingBillReminder,
        name: billForm.name,
        amount: parseFloat(billForm.amount),
        dueDate: billForm.dueDate,
      };
      setBillReminders(billReminders.map(br => br.id === editingBillReminder.id ? updatedReminder : br));

      if (Capacitor.isNativePlatform()) {
        try {
          // Cancel any existing notification for this reminder ID
          await LocalNotifications.cancel({ notifications: [{ id: editingBillReminder.id }] });

          const [year, month, day] = updatedReminder.dueDate.split('-').map(Number);
          const scheduleDate = new Date(year, month - 1, day, 9, 0, 0); // Schedule for 9 AM on the due date

          if (scheduleDate > new Date()) {
            await LocalNotifications.schedule({
              notifications: [{
                title: `Bill Reminder: ${updatedReminder.name}`,
                body: `Your bill of ₹${updatedReminder.amount.toFixed(2)} is due today!`,
                id: updatedReminder.id,
                schedule: { on: { year, month, day, hour: 9, minute: 0 }, repeats: false, allowWhileIdle: true }
              }]
            });
            alert('Reminder and notification updated successfully!');
          } else {
            alert('Reminder updated, but the due date is in the past. No new notification was scheduled.');
          }
        } catch (e) {
          console.error("Error updating notification", e);
          alert('Reminder updated, but failed to update the notification.');
        }
      } else {
        alert('Bill reminder updated successfully!');
      }
      handleCancelBillEdit();
    } else {
      // --- Add Logic ---
      const newReminder: BillReminder = { id: Math.floor(Math.random() * 2147483647), name: billForm.name, amount: parseFloat(billForm.amount), dueDate: billForm.dueDate };
      setBillReminders([...billReminders, newReminder]);

      if (Capacitor.isNativePlatform()) {
        try {
          const [year, month, day] = newReminder.dueDate.split('-').map(Number);
          const scheduleDate = new Date(year, month - 1, day, 9, 0, 0); // Schedule for 9 AM on the due date

          if (scheduleDate > new Date()) {
            await LocalNotifications.schedule({
              notifications: [{
                title: `Bill Reminder: ${newReminder.name}`,
                body: `Your bill of ₹${newReminder.amount.toFixed(2)} is due today!`,
                id: newReminder.id,
                schedule: { on: { year, month, day, hour: 9, minute: 0 }, repeats: false, allowWhileIdle: true }
              }]
            });
            alert('Bill reminder and notification scheduled successfully!');
          } else {
            alert('Bill reminder added, but the due date is in the past. No notification was scheduled.');
          }
        } catch (e) { console.error("Error scheduling notification", e); alert('Bill reminder added, but failed to schedule the notification.'); }
      } else {
        alert('Bill reminder added successfully! (Notifications only work on mobile devices)');
      }
      setBillForm({ name: '', amount: '', dueDate: '' });
    }
  };

  const deleteBillReminder = (id: number) => {
    showConfirmation(
      'Confirm Deletion',
      'Are you sure you want to delete this reminder?',
      async () => {
        setBillReminders(billReminders.filter(br => br.id !== id));
        // --- Cancel the corresponding notification ---
        if (Capacitor.isNativePlatform()) {
          try {
            await LocalNotifications.cancel({ notifications: [{ id }] });
          } catch (e) {
            console.error("Error cancelling notification", e);
          }
        }
      }
    );
  };

  return (
    <div className="p-4 space-y-6">
      {/* Add/Edit Reminder Form */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {editingBillReminder ? 'Edit Bill Reminder' : 'Add Bill Reminder'}
        </h2>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={billForm.name}
              onChange={e => setBillForm({ ...billForm, name: e.target.value })}
              placeholder="Bill Name"
              className="sm:col-span-2 p-3 border border-gray-300 rounded-xl"
            />
            <input
              type="number"
              value={billForm.amount}
              onChange={e => setBillForm({ ...billForm, amount: e.target.value })}
              placeholder="Amount"
              className="p-3 border border-gray-300 rounded-xl"
            />
            <input
              type="date"
              value={billForm.dueDate}
              onChange={e => setBillForm({ ...billForm, dueDate: e.target.value })}
              className="p-3 border border-gray-300 rounded-xl"
            />
          </div>
          <button
            onClick={addOrUpdateBillReminder}
            className="w-full p-3 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 flex items-center justify-center"
          >
            <Bell size={18} className="mr-2" />
            {editingBillReminder ? 'Update Reminder' : 'Add Reminder'}
          </button>
          {editingBillReminder && (
            <button
              onClick={handleCancelBillEdit}
              className="w-full p-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      {/* List of Reminders */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Upcoming Bills</h2>
        <div className="space-y-2">
          {billReminders.length === 0 && (
            <p className="text-gray-500 text-center py-4">No reminders set.</p>
          )}
          {billReminders
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .map(reminder => (
            <div key={reminder.id} className="flex justify-between items-center gap-4 bg-gray-50 p-3 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{reminder.name}</p>
                <p className="text-sm text-gray-500">
                  ₹{reminder.amount.toFixed(2)} (Due: {reminder.dueDate})
                </p>
              </div>
              <div className="flex-shrink-0 flex space-x-1">
                <button
                  onClick={() => editBillReminder(reminder)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                  title="Edit Reminder"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => deleteBillReminder(reminder.id)}
                  className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                  title="Delete Reminder"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BillReminderTab;