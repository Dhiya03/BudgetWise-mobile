import { useState, useMemo } from 'react';
import { Bell, Edit3, Trash2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { BillReminder, SupportedLanguage } from '../types';
import { isLimitReached, Limit } from '../subscriptionManager';
import { useLocalization } from '../LocalizationContext';
import { formatCurrency } from '../utils/formatting';

interface BillReminderTabProps {
  billReminders: BillReminder[];
  setBillReminders: React.Dispatch<React.SetStateAction<BillReminder[]>>;
  showConfirmation: (title: string, message: string, onConfirm: () => void | Promise<void>) => void;
  language: SupportedLanguage;
}

const BillReminderTab = ({ billReminders, setBillReminders, showConfirmation, language }: BillReminderTabProps) => {
  const [editingBillReminder, setEditingBillReminder] = useState<BillReminder | null>(null);
  const [billForm, setBillForm] = useState({ name: '', amount: '', dueDate: '' });
  const { t } = useLocalization();

  const reminderLimitReached = useMemo(() => {
    if (editingBillReminder) {
      return false;
    }
    return isLimitReached(Limit.BillReminders, billReminders.length);
  }, [billReminders.length, editingBillReminder]);

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

          // --- New Notification Scheduling Logic ---
          // const [year, month, day] = updatedReminder.dueDate.split('-').map(Number);
          // const scheduleDate = new Date(year, month - 1, day, 9, 0, 0);
          // const now = new Date();
          // const todayMidnight = new Date();
          // todayMidnight.setHours(0, 0, 0, 0);
          // const dueDateMidnight = new Date(year, month - 1, day);
          // dueDateMidnight.setHours(0, 0, 0, 0);
         
          // --- FOR TESTING ONLY: Schedule for 2 minutes from now ---
          const scheduleOptions = { at: new Date(Date.now() + 2 * 60 * 1000), allowWhileIdle: true };

          // if (dueDateMidnight < todayMidnight) {
          //   alert('Reminder updated, but the due date is in the past. No new notification was scheduled.');
          // } else {
          //   // If the target time (9 AM on due date) has passed, schedule it for 1 second from now.
          //   // Otherwise, schedule it for the target time.
          //   const scheduleOptions = scheduleDate > now
          //     ? { on: { year, month, day, hour: 9, minute: 0 }, repeats: false, allowWhileIdle: true }
          //     : { at: new Date(Date.now() + 1000), allowWhileIdle: true };

          //   await LocalNotifications.schedule({
          //     notifications: [{
          //       title: `Bill Reminder: ${updatedReminder.name}`,
          //       body: `Your bill of ₹${updatedReminder.amount.toFixed(2)} is due today!`,
          //       id: updatedReminder.id,
          //       schedule: scheduleOptions
          //     }]
          //   });
          //   alert('Reminder and notification updated successfully!');
          // }

          await LocalNotifications.schedule({
            notifications: [{
              title: `Bill Reminder: ${updatedReminder.name}`,
              body: `Your bill of ₹${updatedReminder.amount.toFixed(2)} is due today!`,
              id: updatedReminder.id,
              schedule: scheduleOptions
            }]
          });
          alert(t('toast.reminderUpdated.testMode'));
         
        } catch (e) {
          console.error("Error updating notification", e);
          alert(t('toast.reminderUpdated.notificationError'));
        }
      } else {
        alert(t('toast.reminderUpdated.success'));
      }
      handleCancelBillEdit();
    } else {
      // --- Add Logic ---
      if (reminderLimitReached) {
        alert(t('toast.reminderLimitReached'));
        return;
      }
      const newReminder: BillReminder = { id: Math.floor(Math.random() * 2147483647), name: billForm.name, amount: parseFloat(billForm.amount), dueDate: billForm.dueDate };
      setBillReminders([...billReminders, newReminder]);

      if (Capacitor.isNativePlatform()) {
        try {
           // --- New Notification Scheduling Logic ---
          // const [year, month, day] = newReminder.dueDate.split('-').map(Number);
          // const scheduleDate = new Date(year, month - 1, day, 9, 0, 0);
          // const now = new Date();
          // const todayMidnight = new Date();
          // todayMidnight.setHours(0, 0, 0, 0);
          // const dueDateMidnight = new Date(year, month - 1, day);
          // dueDateMidnight.setHours(0, 0, 0, 0);
         
            // --- FOR TESTING ONLY: Schedule for 2 minutes from now ---
          const scheduleOptions = { at: new Date(Date.now() + 2 * 60 * 1000), allowWhileIdle: true };

          //  if (dueDateMidnight < todayMidnight) {
          //   alert('Bill reminder added, but the due date is in the past. No notification was scheduled.');
          // } else {
          //   // If the target time (9 AM on due date) has passed, schedule it for 1 second from now.
          //   // Otherwise, schedule it for the target time.
          //   const scheduleOptions = scheduleDate > now
          //     ? { on: { year, month, day, hour: 9, minute: 0 }, repeats: false, allowWhileIdle: true }
          //     : { at: new Date(Date.now() + 1000), allowWhileIdle: true };

          //   await LocalNotifications.schedule({
          //     notifications: [{
          //       title: `Bill Reminder: ${newReminder.name}`,
          //       body: `Your bill of ₹${newReminder.amount.toFixed(2)} is due today!`,
          //       id: newReminder.id,
          //       schedule: scheduleOptions
          //     }]
          //   });
          //   alert('Bill reminder and notification scheduled successfully!');
          // }
          
           await LocalNotifications.schedule({
            notifications: [{
              title: `Bill Reminder: ${newReminder.name}`,
              body: `Your bill of ₹${newReminder.amount.toFixed(2)} is due today!`,
              id: newReminder.id,
              schedule: scheduleOptions
            }]
          });
          alert(t('toast.reminderAdded.testMode'));
        
        } catch (e) { console.error("Error scheduling notification", e); alert(t('toast.reminderAdded.notificationError')); }
      } else {
        alert(t('toast.reminderAdded.successWeb'));
      }
      setBillForm({ name: '', amount: '', dueDate: '' });
    }
  };

  const deleteBillReminder = (id: number) => {
    showConfirmation(
      t('confirmation.deleteReminder.title'),
      t('confirmation.deleteReminder.message'),
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
          {editingBillReminder ? t('reminders.editTitle') : t('reminders.addTitle')}
        </h2>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={billForm.name}
              onChange={e => setBillForm({ ...billForm, name: e.target.value })}
              placeholder={t('reminders.billName')}
              className="sm:col-span-2 p-3 border border-gray-300 rounded-xl"
            />
            <input
              type="number"
              value={billForm.amount}
              onChange={e => setBillForm({ ...billForm, amount: e.target.value })}
              placeholder={t('reminders.amount')}
              className="p-3 border border-gray-300 rounded-xl"
            />
            <input
              type="date"
              value={billForm.dueDate}
              onChange={e => setBillForm({ ...billForm, dueDate: e.target.value })}
              placeholder={t('reminders.dueDate')}
              className="p-3 border border-gray-300 rounded-xl"
            />
          </div>
          <button
            onClick={addOrUpdateBillReminder}
            disabled={reminderLimitReached && !editingBillReminder}
            className="w-full p-3 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Bell size={18} className="mr-2" />
            {editingBillReminder ? t('reminders.updateButton') : t('reminders.addButton')}
          </button>
          {reminderLimitReached && !editingBillReminder && (
            <p className="text-center text-sm text-red-600 mt-2">
              {t('reminders.limitReached')}
            </p>
          )}
          {editingBillReminder && (
            <button
              onClick={handleCancelBillEdit}
              className="w-full p-3 bg-gray-400 text-white rounded-xl hover:bg-gray-500"
            >
              {t('addTab.cancelEdit')}
            </button>
          )}
        </div>
      </div>

      {/* List of Reminders */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{t('reminders.upcomingBills')}</h2>
        <div className="space-y-2">
          {billReminders.length === 0 && (
            <p className="text-gray-500 text-center py-4">{t('reminders.noReminders')}</p>
          )}
          {billReminders
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .map(reminder => (
            <div key={reminder.id} className="flex justify-between items-center gap-4 bg-gray-50 p-3 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{reminder.name}</p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(reminder.amount, language)} ({t('reminders.due')} {reminder.dueDate})
                </p>
              </div>
              <div className="flex-shrink-0 flex space-x-1">
                <button
                  onClick={() => editBillReminder(reminder)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                  title={t('reminders.tooltip.edit')}
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => deleteBillReminder(reminder.id)}
                  className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                  title={t('reminders.tooltip.delete')}
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