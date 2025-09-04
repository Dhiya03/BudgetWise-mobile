import { Transaction, MonthlyBudgets } from '../types';

const getPeriodDates = (timeframe: string) => {
  const now = new Date();
  let currentStartDate: Date, currentEndDate: Date, previousStartDate: Date, previousEndDate: Date, currentPeriodDays: number, isThisMonth: boolean;

  currentEndDate = new Date();

  if (timeframe === 'This Month') {
    isThisMonth = true;
    currentStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
    previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    currentPeriodDays = now.getDate(); // Number of days so far this month
  } else {
    isThisMonth = false;
    const timeframeDays = parseInt(timeframe, 10);
    currentStartDate = new Date();
    currentStartDate.setDate(now.getDate() - timeframeDays);
    currentPeriodDays = timeframeDays;

    previousEndDate = new Date(currentStartDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousEndDate.getDate() - (timeframeDays - 1));
  }

  return { currentStartDate, currentEndDate, previousStartDate, previousEndDate, currentPeriodDays, isThisMonth };
};

const getPeriodData = (transactions: Transaction[], startDate: Date, endDate: Date, getCustomBudgetName?: (id: number | null) => string) => {
  const filtered = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate >= startDate && transactionDate <= endDate;
  });

  const expensesByCategory: { [key: string]: number } = {};
  let largestTransaction: Transaction | null = null;
  let totalExpenses = 0;
  let totalIncome = 0;

  filtered.forEach(t => {
    if (t.amount < 0) {
      const expense = Math.abs(t.amount);
      totalExpenses += expense;
      let category = t.category;
      if (t.budgetType === 'custom' && t.customBudgetId && getCustomBudgetName) {
        category = `${getCustomBudgetName(t.customBudgetId)} - ${t.customCategory}`;
      }
      if (category) {
        expensesByCategory[category] = (expensesByCategory[category] || 0) + expense;
      }
      if (!largestTransaction || expense > Math.abs(largestTransaction.amount)) {
        largestTransaction = t;
      }
    } else {
      totalIncome += t.amount;
    }
  });

  return {
    transactions: filtered,
    totalExpenses,
    totalIncome,
    expensesByCategory,
    largestTransaction,
  };
};

export const getCategoryInsights = (transactions: Transaction[], analyticsTimeframe: string, getCustomBudgetName: (id: number | null) => string) => {
  const { currentStartDate, currentEndDate, previousStartDate, previousEndDate } = getPeriodDates(analyticsTimeframe);
  const currentPeriod = getPeriodData(transactions, currentStartDate, currentEndDate, getCustomBudgetName);
  const previousPeriod = getPeriodData(transactions, previousStartDate, previousEndDate, getCustomBudgetName);

  const allCategories = new Set([
    ...Object.keys(currentPeriod.expensesByCategory),
    ...Object.keys(previousPeriod.expensesByCategory),
  ]);

  const insights = Array.from(allCategories).map(category => {
    const currentSpending = currentPeriod.expensesByCategory[category] || 0;
    const previousSpending = previousPeriod.expensesByCategory[category] || 0;
    const trend = previousSpending > 0 ? ((currentSpending - previousSpending) / previousSpending) * 100 : (currentSpending > 0 ? 100 : 0);

    const categoryTransactions = currentPeriod.transactions.filter(t => {
        if (t.budgetType === 'custom' && t.customBudgetId) {
            return `${getCustomBudgetName(t.customBudgetId)} - ${t.customCategory}` === category && t.amount < 0;
        }
        return t.category === category && t.amount < 0
    });
    const largestTx = categoryTransactions.reduce((max, t) => (Math.abs(t.amount) > Math.abs(max?.amount || 0) ? t : max), null as Transaction | null);

    let smartText = '';
    if (trend > 30) {
      smartText = `⚠️ Spending is up ${trend.toFixed(0)}% from the last period.`;
    } else if (trend < -10) {
      smartText = `✅ Great job! Spending is down ${Math.abs(trend).toFixed(0)}%.`;
    }

    return {
      category,
      spending: currentSpending,
      trend,
      largestTransaction: largestTx,
      smartText,
    };
  });

  return insights.sort((a, b) => b.spending - a.spending);
};

export const getFinancialHealthScore = (
  transactions: Transaction[],
  analyticsTimeframe: string,
  getCustomBudgetName?: (id: number | null) => string
) => {
  const { currentStartDate, currentEndDate, previousStartDate, previousEndDate } = getPeriodDates(analyticsTimeframe);
  const periodData = getPeriodData(transactions, currentStartDate, currentEndDate, getCustomBudgetName);

  // 1. Spending vs Income (40 points) - NEW LOGIC
  // This is a more accurate health metric. Are you spending less than you earn?
  let spendingScore = 0;
  if (periodData.totalIncome > 0) {
    const ratio = periodData.totalExpenses / periodData.totalIncome;
    // Score is 40 if you spend 80% or less of income. It's 0 if you spend 120% or more.
    spendingScore = Math.min(40, Math.max(0, 40 * (1 - (ratio - 0.8) / 0.4)));
  } else if (periodData.totalExpenses === 0) {
    spendingScore = 40; // No income, no expenses
  }

  // 2. Savings Rate (30 points)
  let savingsScore = 0;
  if (periodData.totalIncome > 0) {
    const savingsRate = (periodData.totalIncome - periodData.totalExpenses) / periodData.totalIncome;
    // Scale from -1 (or lower) to 1 (or higher) to 0-30 points. 0.2 is a good target.
    savingsScore = Math.max(0, Math.min(30, 30 * (savingsRate + 0.1) / 0.5));
  }

  // 3. Trend Consistency (30 points)
  const previousPeriodData = getPeriodData(transactions, previousStartDate, previousEndDate, getCustomBudgetName);
  const trend = previousPeriodData.totalExpenses > 0
    ? (periodData.totalExpenses - previousPeriodData.totalExpenses) / previousPeriodData.totalExpenses
    : (periodData.totalExpenses > 0 ? 1 : 0);

  let trendScore = 15; // Start at neutral
  if (trend < -0.1) trendScore = 30; // Significantly decreasing
  else if (trend < 0) trendScore = 20; // Decreasing
  else if (trend > 0.2) trendScore = 0; // Significantly increasing
  else if (trend > 0) trendScore = 10; // Increasing

  const totalScore = Math.round(spendingScore + savingsScore + trendScore);

  let scoreColor = 'text-red-500';
  if (totalScore >= 75) scoreColor = 'text-green-500';
  else if (totalScore >= 50) scoreColor = 'text-yellow-500';

  return {
    score: totalScore,
    color: scoreColor,
    breakdown: { budgetScore: spendingScore, savingsScore, trendScore },
  };
};

export const getCashFlowAnalysis = (
  transactions: Transaction[],
  analyticsTimeframe: string,
  budgets: MonthlyBudgets,
  savingsGoal: number = 15000
) => {
  const { currentStartDate, currentEndDate, currentPeriodDays, isThisMonth } = getPeriodDates(analyticsTimeframe);
  const periodData = getPeriodData(transactions, currentStartDate, currentEndDate);
  const { totalIncome, totalExpenses, expensesByCategory } = periodData;

  const savings = totalIncome - totalExpenses;
  const projectedMonthlySavings = isThisMonth ? savings : savings * (30 / currentPeriodDays);

  const totalMonthlyBudget = Object.values(budgets).reduce((sum, b) => sum + b, 0);
  const avgDailySpending = totalExpenses / currentPeriodDays;
  const burnRateDays = avgDailySpending > 0 ? (totalMonthlyBudget * (currentPeriodDays / 30)) / avgDailySpending : Infinity;

  const incomeNeeded = Math.max(0, (totalExpenses + savingsGoal) - totalIncome);

  return {
    totalIncome,
    totalExpenses,
    savings,
    expensesByCategory,
    projectedMonthlySavings,
    burnRateDays,
    incomeNeeded,
    savingsGoal,
  };
};

export const getSpendingPersonality = (transactions: Transaction[]) => {
  const dayOfWeekSpending: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let totalSpending = 0;

  transactions.forEach(t => {
    if (t.amount < 0) {
      const day = new Date(t.date).getDay(); // 0 = Sunday, 6 = Saturday
      const expense = Math.abs(t.amount);
      dayOfWeekSpending[day] += expense;
      totalSpending += expense;
    }
  });

  if (totalSpending === 0) return { personality: "Not Enough Data", insight: "Start logging expenses to see your spending habits." };

  const weekendSpending = dayOfWeekSpending[0] + dayOfWeekSpending[5] + dayOfWeekSpending[6];
  const weekdaySpending = totalSpending - weekendSpending;

  const weekendPercentage = (weekendSpending / totalSpending) * 100;

  if (weekendPercentage > 60) {
    return { personality: "Weekend Spender", insight: `You spend ${weekendPercentage.toFixed(0)}% of your money on weekends.` };
  }
  if (weekendPercentage < 40) {
    return { personality: "Weekday Warrior", insight: `You handle most of your spending (${(weekdaySpending / totalSpending * 100).toFixed(0)}%) during the week.` };
  }
  return { personality: "Balanced Spender", insight: "Your spending is evenly distributed throughout the week." };
};

export const getDailySpendingStreak = (transactions: Transaction[], threshold: number, analyticsTimeframe: string) => {
  if (transactions.length === 0) return { streak: 0, isTodayUnder: false };

  // Find the date of the first transaction ever to provide a realistic start for the streak.
  const firstTransactionDate = transactions.reduce((earliest, t) => {
    const tDate = new Date(t.date);
    return tDate < earliest ? tDate : earliest;
  }, new Date());
  firstTransactionDate.setHours(0, 0, 0, 0);

  const spendingByDay: { [key: string]: number } = {};
  // Ensure threshold is a valid number, defaulting to 0 if not
  if (typeof threshold !== 'number' || isNaN(threshold)) {
    console.warn("getDailySpendingStreak: Invalid 'threshold' value, defaulting to 0.", threshold);
    threshold = 0;
  }

  transactions.forEach(t => {
    if (t.amount < 0) {
      spendingByDay[t.date] = (spendingByDay[t.date] || 0) + Math.abs(t.amount);
    }
  });

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const { currentPeriodDays } = getPeriodDates(analyticsTimeframe);
  let loopCounter = 0;

  while (loopCounter < currentPeriodDays) {
    // Stop counting if we go past the user's first transaction.
    if (currentDate < firstTransactionDate) {
      break;
    }

    let dateStr;
    try {
      dateStr = currentDate.toISOString().split('T')[0];
    } catch (e) {
      console.error("getDailySpendingStreak: Error converting date to string. Breaking loop.", currentDate, e);
      break; // Break if date conversion fails
    }

    try {
      if ((spendingByDay[dateStr] || 0) <= threshold) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break; // Streak broken
      }
    } catch (e) {
      console.error("getDailySpendingStreak: Uncaught error during streak calculation. Breaking loop.", { dateStr, spendingByDayValue: spendingByDay[dateStr], threshold, error: e });
      break; // Stop processing on error
    }
    loopCounter++;
  }
  const todayStr = new Date().toISOString().split('T')[0];
  return { streak, isTodayUnder: (spendingByDay[todayStr] || 0) <= threshold };
};

export const getFinancialRunway = (transactions: Transaction[]) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentTransactions = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);

  const totalIncome = recentTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = recentTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (totalExpenses === 0) return { runwayMonths: Infinity, monthlyNet: totalIncome };

  const monthlyNet = totalIncome - totalExpenses;
  const totalSavings = transactions.reduce((sum, t) => sum + t.amount, 0);

  if (monthlyNet >= 0) return { runwayMonths: Infinity, monthlyNet };

  const runwayMonths = totalSavings > 0 ? Math.floor(totalSavings / Math.abs(monthlyNet)) : 0;

  return { runwayMonths, monthlyNet };
};

// REFACTORED: This now simulates potential savings, not a health score.
export const simulateBudgetScenario = (
  transactions: Transaction[],
  currentBudgets: MonthlyBudgets,
  scenarioChanges: { [category: string]: number },
  analyticsTimeframe: string,
) => {
  const { currentStartDate, currentEndDate, currentPeriodDays, isThisMonth } = getPeriodDates(analyticsTimeframe);
  const periodData = getPeriodData(transactions, currentStartDate, currentEndDate);
  const monthlyIncome = isThisMonth ? periodData.totalIncome : periodData.totalIncome * (30 / currentPeriodDays);
  const simulatedBudgets = { ...currentBudgets };
  Object.keys(scenarioChanges).forEach(category => {
    simulatedBudgets[category] = (currentBudgets[category] || 0) + (scenarioChanges[category] || 0);
  });
  const simulatedTotalBudget = Object.values(simulatedBudgets).reduce((sum, b) => sum + b, 0);

  const simulatedSavings = monthlyIncome - simulatedTotalBudget;
  return { simulatedSavings, monthlyIncome, simulatedTotalBudget };
};
