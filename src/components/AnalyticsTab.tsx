import  { useState, useMemo, FC } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, Activity, HelpCircle, ShieldCheck, ShieldAlert, Shield, CalendarDays, Flame, SlidersHorizontal, AlertTriangle, X, Lightbulb } from 'lucide-react';
import { Transaction, MonthlyBudgets } from '../types';
import { getCategoryInsights, getFinancialHealthScore, getCashFlowAnalysis, getSpendingPersonality, getDailySpendingStreak, getFinancialRunway, simulateBudgetScenario } from '../utils/analytics';

interface AnalyticsTabProps {
  transactions: Transaction[];
  budgets: MonthlyBudgets;
  getCustomBudgetName: (id: number | null) => string;
  savingsGoal: number;
  dailySpendingGoal: number;
  analyticsTimeframe: string;
  setAnalyticsTimeframe: (timeframe: string) => void;
  setDailySpendingGoal: (goal: number) => void;
  setSavingsGoal: (goal: number) => void;
}

const FinancialHealthScore: FC<{ score: number; color: string }> = ({ score, color }) => (
  <div className="relative w-40 h-40 mx-auto">
    <svg className="w-full h-full" viewBox="0 0 36 36">
      <path
        className="text-gray-200"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className={`${color} transition-all duration-500`}
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray={`${score}, 100`}
      />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className={`text-4xl font-bold ${color}`}>{score}</span>
      <span className="text-sm text-gray-500">/ 100</span>
    </div>
  </div>
);

const ImproveScoreModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  tips: string[];
}> = ({ isOpen, onClose, tips }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Lightbulb size={22} className="mr-2 text-yellow-500" />
            How to Improve Your Score
          </h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          {tips.length > 0 ? (
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              {tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 py-4">
              Your financial health looks great! Keep up the good work.
            </p>
          )}
        </div>
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="w-full p-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

const AnalyticsTab: FC<AnalyticsTabProps> = ({ transactions, budgets, getCustomBudgetName, savingsGoal, setSavingsGoal, dailySpendingGoal, setDailySpendingGoal, analyticsTimeframe, setAnalyticsTimeframe }) => {
  const categoryInsights = useMemo(() => getCategoryInsights(transactions, analyticsTimeframe, getCustomBudgetName), [transactions, analyticsTimeframe, getCustomBudgetName]);
  const healthScore = useMemo(() => getFinancialHealthScore(transactions, analyticsTimeframe, getCustomBudgetName), [transactions, analyticsTimeframe, getCustomBudgetName]);
  const cashFlow = useMemo(() => getCashFlowAnalysis(transactions, analyticsTimeframe, budgets, savingsGoal), [transactions, analyticsTimeframe, budgets, savingsGoal]);
  const personality = useMemo(() => getSpendingPersonality(transactions), [transactions]);
  const streak = useMemo(() => getDailySpendingStreak(transactions, dailySpendingGoal), [transactions, dailySpendingGoal]);
  const runway = useMemo(() => getFinancialRunway(transactions), [transactions]);

  const [scenarioChanges, setScenarioChanges] = useState<{ [key: string]: number }>({});
  const simulatedSavingsResult = useMemo(() => simulateBudgetScenario(transactions, budgets, scenarioChanges, analyticsTimeframe), [transactions, budgets, scenarioChanges, analyticsTimeframe]);
  const [isImproveModalOpen, setIsImproveModalOpen] = useState(false);

  const improvementTips = useMemo(() => {
    const tips: string[] = [];
    const { breakdown } = healthScore;

    if (breakdown.budgetScore < 25) {
      const highestCategory = categoryInsights[0];
      tips.push(`Your spending is high compared to your income. Review your largest category, "${highestCategory?.category || 'expenses'}", to find potential savings.`);
    }

    if (breakdown.savingsScore < 15 && cashFlow.savings < savingsGoal) {
      tips.push(`Your savings rate is low. Try setting a more aggressive savings goal or creating a 'Rollover Rule' in the Budget tab to automatically save surpluses.`);
    }

    if (breakdown.trendScore < 10) {
      tips.push(`Your spending has been increasing. Check the 'Smart Category Breakdown' for categories with a high upward trend.`);
    }

    if (isFinite(runway.runwayMonths) && runway.runwayMonths < 3) {
      tips.push(`Your financial runway is short (${runway.runwayMonths} months). Focus on building an emergency fund of 3-6 months of expenses.`);
    }
    return tips;
  }, [healthScore, categoryInsights, cashFlow, runway, savingsGoal]);

  const getScoreDescription = (score: number) => {
    if (score >= 75) return { text: "Thriving", icon: ShieldCheck, color: "text-green-600" };
    if (score >= 50) return { text: "Caution", icon: ShieldAlert, color: "text-yellow-600" };
    return { text: "Action Needed", icon: Shield, color: "text-red-600" };
  };

  const scoreDescription = getScoreDescription(healthScore.score);
  const simulatedSavingsColor = simulatedSavingsResult.simulatedSavings >= savingsGoal ? "text-green-600" : simulatedSavingsResult.simulatedSavings > 0 ? "text-yellow-600" : "text-red-600";

  const handleScenarioChange = (category: string, value: string) => {
      setScenarioChanges({ ...scenarioChanges, [category]: parseInt(value) || 0 });
    };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Analytics Dashboard</h2>
        <div className="flex justify-center space-x-2 mb-4">
          {['30', '60', '90'].map(day => (
            <button
              key={day}
              onClick={() => setAnalyticsTimeframe(day)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                analyticsTimeframe === day ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Last {day} Days
            </button>
          ))}
        </div>
      </div>

      {/* Financial Health Score */}
      <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Financial Health Score</h3>
        <FinancialHealthScore score={healthScore.score} color={healthScore.color} />
        <div className={`mt-4 flex items-center justify-center font-semibold ${scoreDescription.color}`}>
          <scoreDescription.icon size={20} className="mr-2" />
          <span>{scoreDescription.text}</span>
        </div>
        <button
          onClick={() => setIsImproveModalOpen(true)}
          className="mt-4 w-full p-3 bg-purple-100 text-purple-700 rounded-xl font-semibold hover:bg-purple-200"
        >
          Improve Score
        </button>
      </div>

      {/* Cash Flow Reality Check */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Cash Flow Reality Check</h3>
        <div className="space-y-2">
          {/* Waterfall Chart */}
          <div className="flex items-stretch space-x-2" style={{ height: '10rem' }}>
            <div className="flex flex-1 flex-col text-center">
              <div className="flex flex-1 items-end">
                <div className="mx-auto w-4/5 rounded-t-lg bg-green-500" style={{ height: `${Math.min(100, (cashFlow.totalIncome / (cashFlow.totalIncome || 1)) * 100)}%` }}></div>
              </div>
              <p className="text-xs mt-1">Income</p>
              <p className="text-xs font-bold">₹{cashFlow.totalIncome.toFixed(0)}</p>
            </div>
            <div className="flex flex-1 flex-col text-center">
              <div className="flex flex-1 items-end">
                <div className="mx-auto w-4/5 rounded-t-lg bg-red-500" style={{ height: `${Math.min(100, (cashFlow.totalExpenses / (cashFlow.totalIncome || 1)) * 100)}%` }}></div>
              </div>
              <p className="text-xs mt-1">Expenses</p>
              <p className="text-xs font-bold">₹{cashFlow.totalExpenses.toFixed(0)}</p>
            </div>
            <div className="flex flex-1 flex-col text-center">
              <div className="flex flex-1 items-end">
                <div className="mx-auto w-4/5 rounded-t-lg bg-blue-500" style={{ height: `${Math.min(100, (Math.max(0, cashFlow.savings) / (cashFlow.totalIncome || 1)) * 100)}%` }}></div>
              </div>
              <p className="text-xs mt-1">Savings</p>
              <p className="text-xs font-bold">₹{cashFlow.savings.toFixed(0)}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="bg-blue-50 p-3 rounded-lg flex items-center">
            <Target size={18} className="mr-3 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Projected Monthly Savings</p>
              <p className="text-lg font-bold">₹{cashFlow.projectedMonthlySavings.toFixed(0)}</p>
            </div>
          </div>
          <div className={`p-3 rounded-lg flex items-center ${cashFlow.burnRateDays < 30 ? 'bg-red-50' : 'bg-green-50'}`}>
            <Activity size={18} className={`mr-3 ${cashFlow.burnRateDays < 30 ? 'text-red-600' : 'text-green-600'}`} />
            <div>
              <p className="text-sm font-medium">Budget Burn Rate</p>
              <p className="text-sm">{isFinite(cashFlow.burnRateDays) ? `Budget will last ~${cashFlow.burnRateDays.toFixed(0)} days at current rate.` : 'No spending from budget.'}</p>
            </div>
          </div>
          {cashFlow.incomeNeeded > 0 && (
            <div className="bg-yellow-50 p-3 rounded-lg flex items-center">
              <DollarSign size={18} className="mr-3 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Income Optimization</p>
                <p className="text-sm">You need ₹{cashFlow.incomeNeeded.toFixed(0)} more income to reach your savings goal of ₹{cashFlow.savingsGoal}.</p>
              </div>
            </div>
          )}
           <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Savings Goal</label>
            <div className="flex items-center">
                <span className="text-gray-500 mr-2">₹</span>
                <input
                    type="number"
                    value={savingsGoal}
                    onChange={(e) => setSavingsGoal(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., 15000"
                />
            </div>
          </div>
        </div>
      </div>

      {/* Behavioral Pattern Recognition */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Habits</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg flex items-center">
            <CalendarDays size={24} className="mr-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Spending Personality</p>
              <p className="text-lg font-bold">{personality.personality}</p>
              <p className="text-xs text-gray-600">{personality.insight}</p>
            </div>
          </div>
          <div className={`p-4 rounded-lg flex items-center ${streak.isTodayUnder ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <Flame size={24} className={`mr-4 ${streak.isTodayUnder ? 'text-green-600' : 'text-yellow-600'}`} />
            <div>
              <p className="text-sm font-medium">Daily Spending Goal</p>
              <p className="text-lg font-bold">{streak.streak}-Day Streak</p>
              <div className="flex items-center text-xs text-gray-600">
                Under ₹
                <input
                  type="number"
                  value={dailySpendingGoal}
                  onChange={(e) => setDailySpendingGoal(parseInt(e.target.value) || 0)}
                  className="w-16 bg-transparent focus:bg-white focus:ring-1 focus:ring-purple-400 rounded-md p-0.5 text-center"
                />
                 / day
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Preparedness */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><AlertTriangle size={20} className="mr-2 text-orange-500" />Emergency Preparedness</h3>
        <div className="text-center">
          <p className="text-sm text-gray-600">Financial Runway</p>
          <p className="text-4xl font-bold my-2">{isFinite(runway.runwayMonths) ? `${runway.runwayMonths} months` : '∞'}</p>
          <p className="text-xs text-gray-500">Based on your current savings and a 30-day net cash flow of <span className={runway.monthlyNet < 0 ? 'text-red-600' : 'text-green-600'}>₹{runway.monthlyNet.toFixed(0)}</span>.</p>
        </div>
      </div>

      {/* Budget Scenario Planning */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><SlidersHorizontal size={20} className="mr-2 text-purple-600" />Budget Scenario Planning</h3>
        <div className="space-y-3">
          {Object.keys(budgets).slice(0, 3).map(category => (
            <div key={category}>
              <label className="block text-sm font-medium text-gray-700">{category}</label>
              <div className="flex items-center space-x-2">
                <span className="text-sm">₹{budgets[category]}</span>
                <input
                  type="range"
                  min="-5000"
                  max="5000"
                  step="500"
                  value={scenarioChanges[category] || 0}
                  onChange={(e) => handleScenarioChange(category, e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className={`text-sm font-semibold w-16 text-right ${(scenarioChanges[category] || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {scenarioChanges[category] > 0 ? '+' : ''}{scenarioChanges[category] || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-sm text-gray-600">Simulated Monthly Savings</p>
          <div className={`mt-2 text-2xl font-bold ${simulatedSavingsColor}`}>
            ₹{simulatedSavingsResult.simulatedSavings.toFixed(0)}
          </div>
          <p className="text-xs text-gray-500">Based on projected income of ₹{simulatedSavingsResult.monthlyIncome.toFixed(0)} and a budget of ₹{simulatedSavingsResult.simulatedTotalBudget.toFixed(0)}</p>
        </div>
      </div>

      {/* Smart Category Breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Smart Category Breakdown</h3>
        <div className="space-y-3">
          {categoryInsights.map(insight => (
            <div key={insight.category} className="border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">{insight.category}</span>
                <span className="text-lg font-bold">₹{insight.spending.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <div className={`flex items-center ${insight.trend > 10 ? 'text-red-600' : insight.trend < -10 ? 'text-green-600' : 'text-gray-500'}`}>
                  {insight.trend > 10 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                  <span>{insight.trend > 0 ? '+' : ''}{insight.trend.toFixed(0)}%</span>
                </div>
                <button className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full hover:bg-gray-300">
                  Set Alert
                </button>
              </div>
              {insight.smartText && (
                <p className="text-xs text-gray-600 mt-2 bg-gray-100 p-2 rounded-md">{insight.smartText}</p>
              )}
              {insight.largestTransaction && (
                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                  <strong>Largest Tx:</strong> ₹{Math.abs(insight.largestTransaction.amount).toFixed(0)}{insight.largestTransaction.description ? ` - ${insight.largestTransaction.description}` : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Help/Info Section */}
      <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
        <div className="flex items-center justify-center text-gray-600">
          <HelpCircle size={18} className="mr-2" />
          <h3 className="text-lg font-bold">How to Read This</h3>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          This dashboard analyzes your spending over the last {analyticsTimeframe} days to provide insights into your financial habits and health.
        </p>
      </div>

      <ImproveScoreModal
        isOpen={isImproveModalOpen}
        onClose={() => setIsImproveModalOpen(false)}
        tips={improvementTips}
      />
    </div>
  );
};

export default AnalyticsTab;
