import React from 'react';

interface LockScreenProps {
  passwordInput: string;
  setPasswordInput: (value: string) => void;
  unlockError: string;
  handleUnlock: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({
  passwordInput,
  setPasswordInput,
  unlockError,
  handleUnlock,
}) => {
  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen flex items-center justify-center p-4">
      <div className="w-full bg-white rounded-2xl p-8 shadow-lg text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">BudgetWise</h1>
        <p className="text-gray-600 mb-6">App is locked. Please enter your password.</p>
        <div className="space-y-4">
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleUnlock();
              }
            }}
            placeholder="Enter PIN"
            className="w-full p-3 border border-gray-300 rounded-xl text-center focus:ring-2 focus:ring-purple-500"
          />
          {unlockError && (
            <p className="text-red-500 text-sm">{unlockError}</p>
          )}
          <button
            onClick={handleUnlock}
            className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700"
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockScreen;
