import { useState, useMemo, FC } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, Activity, HelpCircle, ShieldCheck, ShieldAlert, Shield, CalendarDays, Flame, SlidersHorizontal, AlertTriangle, X, Lightbulb, BellRing, Star } from 'lucide-react';
import { Transaction, MonthlyBudgets, SpendingAlert } from '../types';
import { hasAccessTo, Feature } from '../subscriptionManager';
import { simulateBudgetScenario } from '../utils/analytics';
import { useAnalytics } from '../hooks/useAnalytics';
import { useLocalization } from './LocalizationContext';

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
  handleNavigationRequest: (request: any) => void;
  onSetAlert: (alert: Omit<SpendingAlert, 'id' | 'isSilenced'>) => void;
  spendingAlerts: SpendingAlert[];
}

interface ActionableTip {
  text: string;
  icon: React.ReactNode;
  action?: {
    type: 'navigate';
    payload: {
      tab: string;
      filterCategory?: string;
    };
  };
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
  tips: ActionableTip[];
  onAction: (action: any) => void;
  t: (key: string, fallback?: string) => string;
}> = ({ isOpen, onClose, tips, t }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <Lightbulb size={22} className="mr-2 text-yellow-500" />
            {t('analytics.improveModal.title')}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          {tips.length > 0 ? (
            <div className="space-y-2">
              {tips.map((tip, index) => (
                <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 text-purple-600 mt-1">{tip.icon}</div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-gray-700">{tip.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              {t('analytics.improveModal.greatJob')}
            </p>
          )}
        </div>
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="w-full p-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
          >
            {t('analytics.improveModal.gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
};

const SetAlertModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  category: string | null;
  onSetAlert: (alert: Omit<SpendingAlert, 'id' | 'isSilenced'>) => void;
  t: (key: string, fallback?: string) => string;
}> = ({ isOpen, onClose, category, onSetAlert, t }) => {
  const [threshold, setThreshold] = useState('');

  if (!isOpen || !category) return null;

  const handleSave = () => {
    const thresholdAmount = parseFloat(threshold);
    if (isNaN(thresholdAmount) || thresholdAmount <= 0) {
      alert(t('analytics.setAlertModal.validation.invalidThreshold', 'Please enter a valid positive number for the threshold.'));
      return;
    }
    onSetAlert({
      category,
      threshold: thresholdAmount,
      condition: 'above',
    });
    onClose();
    setThreshold('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{t('analytics.setAlertModal.title').replace('{category}', category)}</h2>
        <p className="text-sm text-gray-600 mb-4">{t('analytics.setAlertModal.description')}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('analytics.setAlertModal.threshold')}</label> {/* Use t() here */}
            <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="e.g., 5000" className="w-full p-3 border border-gray-300 rounded-xl" />
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">{t('general.cancel')}</button>
            <button onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold">{t('analytics.setAlertModal.save')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalyticsTab: FC<AnalyticsTabProps> = (props) => {
  const { transactions, budgets, getCustomBudgetName, savingsGoal, setSavingsGoal, dailySpendingGoal, setDailySpendingGoal, analyticsTimeframe, setAnalyticsTimeframe, handleNavigationRequest, onSetAlert, spendingAlerts } = props;
  const { t } = useLocalization();

  if (!hasAccessTo(Feature.LimitedAnalytics)) {
    return (
      <div className="p-6 text-center bg-white rounded-2xl m-4 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{t('analytics.unlockTitle')}</h2>
        <p className="text-gray-600 mb-4">{t('analytics.unlockDescription')}</p>
        {/* In a real app, this would navigate to the subscription screen */}
        <button 
          onClick={() => handleNavigationRequest({ type: 'navigate', payload: { tab: 'settings' }})} 
          className="p-3 bg-purple-600 text-white rounded-xl font-semibold"
        >{t('upgrade.viewPlans')}</button>
      </div>
    );
  }

  const {
    healthScore,
    cashFlow,
    categoryInsights,
    personality,
    streak,
    runway,
  } = useAnalytics({ transactions, budgets, getCustomBudgetName, savingsGoal, dailySpendingGoal, analyticsTimeframe });

  const [scenarioChanges, setScenarioChanges] = useState<{ [key: string]: number }>({});
  const simulatedSavingsResult = useMemo(() => simulateBudgetScenario(transactions, budgets, scenarioChanges, analyticsTimeframe), [transactions, budgets, scenarioChanges, analyticsTimeframe]);
  const [isImproveModalOpen, setIsImproveModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertCategory, setAlertCategory] = useState<string | null>(null);


  const improvementTips = useMemo(() => {
    const tips: ActionableTip[] = [];
    const { breakdown } = healthScore;

    if (breakdown.budgetScore < 25) {
      const highestCategory = categoryInsights[0];
      if (highestCategory) {
        tips.push({
          text: t('analytics.improveTips.highSpending').replace('{category}', highestCategory.category),
          icon: <DollarSign size={18} />,
        });
      }
    }

    if (breakdown.savingsScore < 15 && cashFlow.savings < savingsGoal) {
      tips.push({
        text: t('analytics.improveTips.lowSavings'),
        icon: <Target size={18} />,
      });
    }

    if (breakdown.trendScore < 10) {
      const highTrendCategory = categoryInsights.find(c => c.trend > 20);
      const details = highTrendCategory
        ? t('analytics.improveTips.increasingSpending.details').replace('{category}', highTrendCategory.category).replace('{percent}', highTrendCategory.trend.toFixed(0))
        : t('analytics.improveTips.increasingSpending.noCategory');
      tips.push({ text: t('analytics.improveTips.increasingSpending').replace('{details}', details), icon: <TrendingUp size={18} /> });
    }

    if (isFinite(runway.runwayMonths) && runway.runwayMonths < 3) {
      tips.push({
        text: t('analytics.improveTips.shortRunway').replace('{months}', runway.runwayMonths.toString()),
        icon: <AlertTriangle size={18} />
      });
    }
    return tips;
  }, [healthScore, categoryInsights, cashFlow, runway, savingsGoal]);

  const getScoreDescription = (score: number) => {
    if (score >= 75) return { text: t('analytics.healthStatus.thriving'), icon: ShieldCheck, color: "text-green-600" };
    if (score >= 50) return { text: t('analytics.healthStatus.caution'), icon: ShieldAlert, color: "text-yellow-600" };
    return { text: t('analytics.healthStatus.actionNeeded'), icon: Shield, color: "text-red-600" };
  };

  const scoreDescription = getScoreDescription(healthScore.score);
  const simulatedSavingsColor = simulatedSavingsResult.simulatedSavings >= savingsGoal ? "text-green-600" : simulatedSavingsResult.simulatedSavings > 0 ? "text-yellow-600" : "text-red-600";

  const handleScenarioChange = (category: string, value: string) => {
      setScenarioChanges({ ...scenarioChanges, [category]: parseInt(value) || 0 });
    };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{t('analytics.dashboardTitle')}</h2>
        <div className="flex justify-center space-x-2 mb-4">
          {['This Month', '30', '60', '90'].map(period => (
            <button
              key={period}
              onClick={() => setAnalyticsTimeframe(period)}
              className={`px-4 py-2 rounded-full text-xs font-medium ${
                analyticsTimeframe === period ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {period === 'This Month' ? t('analytics.timeframe.thisMonth') : t('analytics.timeframe.lastDays').replace('{days}', period)}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Health Score */}
      <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
        <div className="flex justify-center items-center mb-2">
          <h3 className="text-lg font-bold text-gray-800">{t('analytics.healthScoreTitle')}</h3>
          <div className="relative group ml-2">
            <HelpCircle size={16} className="text-gray-400 opacity-50 cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-800 text-white text-xs text-left rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {t('analytics.healthScoreTooltip')}
              <div className="absolute right-2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
            </div>
          </div>
        </div>
        <FinancialHealthScore score={healthScore.score} color={healthScore.color} />
        <div className={`mt-4 flex items-center justify-center font-semibold ${scoreDescription.color}`}>
          <scoreDescription.icon size={20} className="mr-2" />
          <span>{scoreDescription.text}</span>
        </div>
        <button
          onClick={() => setIsImproveModalOpen(true)}
          className="mt-4 w-full p-3 bg-purple-100 text-purple-700 rounded-xl font-semibold hover:bg-purple-200"
        >
          {t('analytics.improveScore')}
        </button>
      </div>

      {/* Cash Flow Reality Check */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">{t('analytics.cashFlowTitle')}</h3>
        <div className="space-y-2">
          {/* Waterfall Chart */}
          <div className="flex items-stretch space-x-2" style={{ height: '10rem' }}>
            <div className="flex flex-1 flex-col text-center">
              <div className="flex flex-1 items-end">
                <div className="mx-auto w-4/5 rounded-t-lg bg-green-500" style={{ height: `${Math.min(100, (cashFlow.totalIncome / (cashFlow.totalIncome || 1)) * 100)}%` }}></div>
              </div>
              <p className="text-xs mt-1">{t('analytics.income')}</p>
              <p className="text-xs font-bold">₹{cashFlow.totalIncome.toFixed(0)}</p>
            </div>
            <div className="flex flex-1 flex-col text-center">
              <div className="flex flex-1 items-end">
                <div className="mx-auto w-4/5 rounded-t-lg bg-red-500" style={{ height: `${Math.min(100, (cashFlow.totalExpenses / (cashFlow.totalIncome || 1)) * 100)}%` }}></div>
              </div>
              <p className="text-xs mt-1">{t('analytics.expenses')}</p>
              <p className="text-xs font-bold">₹{cashFlow.totalExpenses.toFixed(0)}</p>
            </div>
            <div className="flex flex-1 flex-col text-center">
              <div className="flex flex-1 items-end">
                <div className="mx-auto w-4/5 rounded-t-lg bg-blue-500" style={{ height: `${Math.min(100, (Math.max(0, cashFlow.savings) / (cashFlow.totalIncome || 1)) * 100)}%` }}></div>
              </div>
              <p className="text-xs mt-1">{t('analytics.savings')}</p>
              <p className="text-xs font-bold">₹{cashFlow.savings.toFixed(0)}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="bg-blue-50 p-3 rounded-lg flex items-center">
            <Target size={18} className="mr-3 text-blue-600" />
            <div>
              <p className="text-sm font-medium">{t('analytics.projectedSavings')}</p>
              <p className="text-lg font-bold">₹{cashFlow.projectedMonthlySavings.toFixed(0)}</p>
            </div>
          </div>
          <div className={`p-3 rounded-lg flex items-center ${cashFlow.burnRateDays < 30 ? 'bg-red-50' : 'bg-green-50'}`}>
            <Activity size={18} className={`mr-3 ${cashFlow.burnRateDays < 30 ? 'text-red-600' : 'text-green-600'}`} />
            <div>
              <p className="text-sm font-medium">{t('analytics.burnRate')}</p>
              <p className="text-sm">{isFinite(cashFlow.burnRateDays) ? t('analytics.burnRate.duration').replace('{days}', cashFlow.burnRateDays.toFixed(0)) : t('analytics.burnRate.noSpending')}</p>
            </div>
          </div>
          {cashFlow.incomeNeeded > 0 && (
            <div className="bg-yellow-50 p-3 rounded-lg flex items-center">
              <DollarSign size={18} className="mr-3 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">{t('analytics.incomeOptimization.title')}</p>
                <p className="text-sm">{t('analytics.incomeOptimization.description').replace('{needed}', cashFlow.incomeNeeded.toFixed(0)).replace('{goal}', cashFlow.savingsGoal.toString())}</p>
              </div>
            </div>
          )}
           <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('budget.potentialSavings')}</label>
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
        <h3 className="text-lg font-bold text-gray-800 mb-4">{t('analytics.habitsTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg flex items-center">
            <CalendarDays size={24} className="mr-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium">{t('analytics.personalityTitle')}</p>
              <p className="text-lg font-bold">{personality.personality}</p>
              <p className="text-xs text-gray-600">{personality.insight}</p>
            </div>
          </div>
          <div className={`p-4 rounded-lg flex items-center ${streak.isTodayUnder ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <Flame size={24} className={`flex-shrink-0 mr-4 ${streak.isTodayUnder ? 'text-green-600' : 'text-yellow-600'}`} />
            <div>
              <p className="text-sm font-medium">
                {t('analytics.dailyGoalTitle')}
                <span className="relative group ml-1.5 inline-block align-middle">
                  <HelpCircle size={14} className="text-gray-500 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-60 p-2 bg-gray-800 text-white text-xs text-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {t('analytics.dailyGoalTooltip')}
                    <div className="absolute right-2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                  </div>
                </span>
              </p>
              <p className="text-lg font-bold">{t('analytics.streak').replace('{days}', streak.streak.toString())}</p>
              <div className="flex items-center text-xs text-gray-600">
                <span className="mr-1">{t('analytics.underPerDay').split('₹')[0]}₹<input
                  type="number"
                  value={dailySpendingGoal}
                  onChange={(e) => setDailySpendingGoal(parseInt(e.target.value) || 0)}
                 className="w-12 bg-transparent focus:bg-white focus:ring-1 focus:ring-purple-400 rounded-md p-0.5 text-center font-medium hide-arrows"/>{t('analytics.underPerDay').split('}')[1]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Preparedness */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><AlertTriangle size={20} className="mr-2 text-orange-500" />{t('analytics.emergencyTitle')}</h3>
        <div className="text-center">
          <div className="flex justify-center items-center text-sm text-gray-600">
            <span>{t('analytics.runwayTitle')}</span>
            <div className="relative group ml-1.5">
              <HelpCircle size={14} className="text-gray-500 cursor-help" />
              <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-gray-800 text-white text-xs text-left rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {t('analytics.runwayTooltip')}
                <div className="absolute right-2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
              </div>
            </div>
          </div>
          <p className="text-4xl font-bold my-2">{isFinite(runway.runwayMonths) ? t('analytics.runwayMonths').replace('{months}', runway.runwayMonths.toString()) : '∞'}</p>
          <p className="text-xs text-gray-500">{t('analytics.runwayBasedOn')} <span className={runway.monthlyNet < 0 ? 'text-red-600' : 'text-green-600'}>₹{runway.monthlyNet.toFixed(0)}</span>.</p>
        </div>
      </div>

      {/* Budget Scenario Planning */}
      {hasAccessTo(Feature.FullAnalytics) && <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><SlidersHorizontal size={20} className="mr-2 text-purple-600" />{t('analytics.scenarioTitle')}</h3>
        <div className="space-y-3">
          {Object.entries(budgets).sort(([, a], [, b]) => b - a).slice(0, 3).map(([category]) => (
            <div key={category}>
              <label className="block text-sm font-medium text-gray-700">{category}</label>
              <div className="flex items-center space-x-2">
                <span className="text-sm">₹{budgets[category]}</span>
                <input
                  type="range"
                  min={-budgets[category]}
                  max={budgets[category]}
                  step="500"
                  value={scenarioChanges[category] || 0}
                  onChange={(e) => handleScenarioChange(category, e.target.value)}
                  className="flex-1 min-w-0 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className={`text-sm font-semibold w-16 text-right ${(scenarioChanges[category] || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {scenarioChanges[category] > 0 ? '+' : ''}{scenarioChanges[category] || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t text-center">
          <div className="flex justify-center items-center text-sm text-gray-600">
            <span>{t('analytics.simulatedSavings')}</span>
            <div className="relative group ml-1.5">
              <HelpCircle size={14} className="text-gray-400 opacity-50 cursor-help" />
              <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-gray-800 text-white text-xs text-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {t('analytics.simulatedSavingsTooltip')}
                <div className="absolute right-2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
              </div>
            </div>
          </div>
          <div className={`mt-2 text-2xl font-bold ${simulatedSavingsColor}`}>
            ₹{simulatedSavingsResult.simulatedSavings.toFixed(0)}
          </div>
          <p className="text-xs text-gray-500">{t('analytics.simulatedSavingsBasedOn').replace('{income}', simulatedSavingsResult.monthlyIncome.toFixed(0)).replace('{budget}', simulatedSavingsResult.simulatedTotalBudget.toFixed(0))}</p>
        </div>
      </div>}

      {/* Smart Category Breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">{t('analytics.categoryBreakdownTitle')}</h3>
        <div className="space-y-3">
          {categoryInsights.map(insight => {
            const isAlertSet = spendingAlerts.some(alert => alert.category === insight.category);
            return (
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
                  {isAlertSet ? (
                    <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center font-medium">
                      <ShieldCheck size={14} className="mr-1" />
                       {t('analytics.alertSet')}
                    </div>
                  ) : hasAccessTo(Feature.SpendingAlerts) ? (
                    <button onClick={() => {
                      setAlertCategory(insight.category);
                      setIsAlertModalOpen(true);
                    }} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full hover:bg-gray-300 flex items-center">
                      <BellRing size={14} className="mr-1" />
                         {t('analytics.setAlert')}
                    </button>
                  ) : (
                    <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center font-medium"><Star size={12} className="mr-1" />Premium</div>
                  )}
                </div>
                {insight.smartText && (
                  <p className="text-xs text-gray-600 mt-2 bg-gray-100 p-2 rounded-md">{insight.smartText}</p>
                )}
                {insight.largestTransaction && (
                  <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                    <strong>{t('analytics.largestTx')}</strong> ₹{Math.abs(insight.largestTransaction.amount).toFixed(0)}{insight.largestTransaction.description ? ` - ${insight.largestTransaction.description}` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Help/Info Section */}
      <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
        <div className="flex items-center justify-center text-gray-600">
          <HelpCircle size={18} className="mr-2" />
          <h3 className="text-lg font-bold">{t('analytics.howToRead')}</h3>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {t('analytics.howToReadDescription').replace('{timeframe}', analyticsTimeframe)}
        </p>
      </div>

      <ImproveScoreModal
        isOpen={isImproveModalOpen}
        onClose={() => setIsImproveModalOpen(false)}
        onAction={(action) => {
          handleNavigationRequest(action);
          setIsImproveModalOpen(false);
        }}
        tips={improvementTips}
        t={t}
      />

      <SetAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        category={alertCategory}
        onSetAlert={onSetAlert}
        t={t}
      />
    </div>
  );
};

export default AnalyticsTab;
