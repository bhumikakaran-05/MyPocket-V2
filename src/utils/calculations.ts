import { 
  format, 
  parseISO, 
  getDaysInMonth, 
  getDate, 
  startOfWeek, 
  endOfWeek, 
  isWithinInterval, 
  subWeeks, 
  subMonths, 
  eachDayOfInterval,
  isSameDay
} from "date-fns";
import { 
  AppData, 
  MonthData, 
  MonthStats, 
  CategoryStat, 
  DEFAULT_CATEGORY_TYPES, 
  WeekStats, 
  MonthAnalysisData, 
  SmartInsight 
} from "../types";

export const calculateMonthStats = (monthData: MonthData, monthKey?: string): MonthStats => {
  const currentMonthKey = format(new Date(), "yyyy-MM");
  const activeMonthKey = monthKey || currentMonthKey;
  const isCurrentMonth = activeMonthKey === currentMonthKey;
  
  const totalBudget = Number(monthData.monthlyPocketMoney || 0);
  
  // Total allocated to categories
  const totalAllocated = Object.values(monthData.categoryBudgets || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  
  // Unallocated money (can be negative if user allocated more than allowance)
  const unallocated = totalBudget - totalAllocated;
  const isOverAllocated = totalAllocated > totalBudget;
  const overAllocatedAmount = isOverAllocated ? totalAllocated - totalBudget : 0;
  
  // Total actual cash spent
  const totalSpent = (monthData.expenses || []).reduce((a, b) => a + (Number(b.amount) || 0), 0);
  
  // Real remaining cash the user can spend (NOT double deducted by allocations!)
  const remainingBalance = totalBudget - totalSpent;
  const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  // Date and "Safe to spend today" calculations
  const dateObj = parseISO(`${activeMonthKey}-01`);
  const totalDaysInMonth = getDaysInMonth(dateObj);
  
  let daysRemaining = 0;
  if (isCurrentMonth) {
    const today = new Date();
    const currentDay = getDate(today);
    daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1); // Includes today
  } else if (activeMonthKey > currentMonthKey) {
    daysRemaining = totalDaysInMonth;
  } else {
    daysRemaining = 0; // Past month
  }

  // Safe to spend today = remaining cash / days remaining
  let safeToSpendToday = 0;
  if (daysRemaining > 0 && remainingBalance > 0) {
    safeToSpendToday = Math.max(0, Math.floor(remainingBalance / daysRemaining));
  }

  // Category breakdown
  let fixedSpent = 0;
  let fixedBudget = 0;
  let variableSpent = 0;
  let variableBudget = 0;

  const categoryStats: CategoryStat[] = Object.entries(monthData.categoryBudgets || {}).map(([name, budgetVal]) => {
    const budget = Number(budgetVal) || 0;
    const spent = (monthData.expenses || [])
      .filter(e => e.category === name)
      .reduce((a, b) => a + (Number(b.amount) || 0), 0);
    
    const catType = monthData.categoryTypes?.[name] || DEFAULT_CATEGORY_TYPES[name] || "variable";
    
    if (catType === "fixed") {
      fixedSpent += spent;
      fixedBudget += budget;
    } else {
      variableSpent += spent;
      variableBudget += budget;
    }

    return {
      name,
      budget,
      spent,
      remaining: budget - spent,
      percentage: budget > 0 ? (spent / budget) * 100 : (spent > 0 ? 100 : 0),
      overspent: spent > budget ? spent - budget : 0,
      type: catType
    };
  });

  // Account for expenses that might belong to categories no longer in categoryBudgets
  (monthData.expenses || []).forEach(exp => {
    if (!monthData.categoryBudgets?.[exp.category] && !categoryStats.some(c => c.name === exp.category)) {
      categoryStats.push({
        name: exp.category,
        budget: 0,
        spent: Number(exp.amount) || 0,
        remaining: -(Number(exp.amount) || 0),
        percentage: 100,
        overspent: Number(exp.amount) || 0,
        type: monthData.categoryTypes?.[exp.category] || "variable"
      });
    }
  });

  return {
    totalBudget,
    totalAllocated,
    unallocated,
    isOverAllocated,
    overAllocatedAmount,
    totalSpent,
    remainingBalance,
    spentPercentage,
    safeToSpendToday,
    daysRemaining,
    totalDaysInMonth,
    isCurrentMonth,
    categoryStats,
    monthlySavings: totalBudget > totalSpent ? totalBudget - totalSpent : 0,
    monthlyOverspent: totalSpent > totalBudget ? totalSpent - totalBudget : 0,
    fixedSpent,
    fixedBudget,
    variableSpent,
    variableBudget
  };
};

export const getProgressBarColor = (percentage: number) => {
  if (percentage < 70) return "bg-emerald-500";
  if (percentage <= 100) return "bg-amber-500";
  return "bg-rose-500";
};

export const getProgressBarTextColor = (percentage: number) => {
  if (percentage < 70) return "text-emerald-600";
  if (percentage <= 100) return "text-amber-600";
  return "text-rose-600";
};

// Calculate weekly statistics
export const calculateWeekStats = (monthData: MonthData, targetDate = new Date()): WeekStats => {
  const now = targetDate;
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
  
  const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  const expenses = monthData.expenses || [];

  const thisWeekExpenses = expenses.filter(e => {
    try {
      const expDate = parseISO(e.date);
      return isWithinInterval(expDate, { start: weekStart, end: weekEnd });
    } catch {
      return false;
    }
  });

  const prevWeekExpenses = expenses.filter(e => {
    try {
      const expDate = parseISO(e.date);
      return isWithinInterval(expDate, { start: prevWeekStart, end: prevWeekEnd });
    } catch {
      return false;
    }
  });

  const weekSpent = thisWeekExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const previousWeekSpent = prevWeekExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Daily breakdown for the 7 days
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const dailySpending = weekDays.map(day => {
    const dayTotal = thisWeekExpenses
      .filter(e => {
        try {
          return isSameDay(parseISO(e.date), day);
        } catch {
          return false;
        }
      })
      .reduce((a, b) => a + (Number(b.amount) || 0), 0);

    return {
      day: format(day, "EEE"), // Mon, Tue...
      amount: dayTotal,
      isToday: isSameDay(day, now)
    };
  });

  // Calculate day of week index (1 to 7)
  const currentDayIndex = Math.min(7, Math.max(1, (now.getDay() === 0 ? 7 : now.getDay())));
  const dailyAverage = currentDayIndex > 0 ? Math.round(weekSpent / currentDayIndex) : 0;
  const daysRemainingInWeek = Math.max(0, 7 - currentDayIndex);

  // Top Category this week
  const catTotals: Record<string, number> = {};
  thisWeekExpenses.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + (Number(e.amount) || 0);
  });

  let topCategory: { name: string; amount: number } | null = null;
  Object.entries(catTotals).forEach(([name, amount]) => {
    if (!topCategory || amount > topCategory.amount) {
      topCategory = { name, amount };
    }
  });

  // Determine status
  let statusText = "You're on track this week";
  let statusType: "on-track" | "warning" | "neutral" = "on-track";

  if (weekSpent === 0) {
    statusText = "No expenses logged this week yet";
    statusType = "neutral";
  } else if (previousWeekSpent > 0 && weekSpent > previousWeekSpent * 1.15) {
    statusText = "You're spending faster than last week";
    statusType = "warning";
  } else if (previousWeekSpent > 0 && weekSpent < previousWeekSpent * 0.85) {
    statusText = "Great job! Spending is lower than last week";
    statusType = "on-track";
  } else {
    statusText = "Pacing consistently with your weekly budget";
    statusType = "on-track";
  }

  return {
    weekSpent,
    dailyAverage,
    topCategory,
    expenseCount: thisWeekExpenses.length,
    daysRemainingInWeek,
    previousWeekSpent,
    statusText,
    statusType,
    dailySpending
  };
};

// Calculate monthly analysis data
export const calculateMonthAnalysis = (data: AppData, monthKey: string): MonthAnalysisData => {
  const monthData = data.months[monthKey] || {
    monthlyPocketMoney: 0,
    categoryBudgets: {},
    expenses: []
  };

  const monthDate = parseISO(`${monthKey}-01`);
  const monthName = format(monthDate, "MMMM yyyy");
  
  const stats = calculateMonthStats(monthData, monthKey);

  // Top spending category
  let highestCategory: { name: string; amount: number } | null = null;
  stats.categoryStats.forEach(c => {
    if (!highestCategory || c.spent > highestCategory.amount) {
      if (c.spent > 0) {
        highestCategory = { name: c.name, amount: c.spent };
      }
    }
  });

  const overspentCategories = stats.categoryStats.filter(c => c.overspent > 0);

  const prevMonthKey = format(subMonths(monthDate, 1), "yyyy-MM");
  const prevMonthData = data.months[prevMonthKey];
  
  let comparisonWithPrevMonth = null;
  if (prevMonthData && prevMonthData.expenses && prevMonthData.expenses.length > 0) {
    const prevSpent = prevMonthData.expenses.reduce((a, b) => a + (Number(b.amount) || 0), 0);
    if (prevSpent > 0) {
      const diffAmount = stats.totalSpent - prevSpent;
      const percentageChange = Math.round(((stats.totalSpent - prevSpent) / prevSpent) * 100);
      const isLess = diffAmount < 0;
      
      comparisonWithPrevMonth = {
        percentageChange: Math.abs(percentageChange),
        diffAmount: Math.abs(diffAmount),
        text: isLess 
          ? `Spent ${Math.abs(percentageChange)}% less than ${format(parseISO(`${prevMonthKey}-01`), "MMMM")}`
          : `Spent ${Math.abs(percentageChange)}% more than ${format(parseISO(`${prevMonthKey}-01`), "MMMM")}`
      };
    }
  }

  const daysInMonth = stats.totalDaysInMonth;
  const currentMonthKey = format(new Date(), "yyyy-MM");
  const daysPassed = monthKey === currentMonthKey ? Math.min(daysInMonth, getDate(new Date())) : daysInMonth;
  const averageDailySpending = daysPassed > 0 ? Math.round(stats.totalSpent / daysPassed) : 0;

  const savingsRate = stats.totalBudget > 0 ? Math.round((stats.monthlySavings / stats.totalBudget) * 1000) / 10 : 0;

  return {
    monthKey,
    monthName,
    allowance: stats.totalBudget,
    totalAllocated: stats.totalAllocated,
    totalSpent: stats.totalSpent,
    remaining: stats.remainingBalance,
    unallocated: stats.unallocated,
    savings: stats.monthlySavings,
    savingsRate,
    highestCategory,
    overspentCategories,
    expenseCount: monthData.expenses.length,
    averageDailySpending,
    comparisonWithPrevMonth
  };
};

// Generate rule-based deterministic smart insights
export const generateSmartInsights = (
  monthData: MonthData,
  stats: MonthStats,
  prevMonthData?: MonthData
): SmartInsight[] => {
  const insights: SmartInsight[] = [];

  // 1. Budget setup insight
  if (stats.totalBudget === 0) {
    insights.push({
      id: "no-allowance",
      type: "info",
      title: "Set Your Monthly Pocket Money",
      message: "Add your monthly allowance to unlock daily safe spending and accurate savings tracking.",
      actionText: "Set Allowance"
    });
    return insights;
  }

  // 2. Over-allocation warning
  if (stats.isOverAllocated) {
    insights.push({
      id: "over-allocated",
      type: "warning",
      title: "Allocation Exceeds Allowance",
      message: `You have allocated ₹${stats.overAllocatedAmount.toLocaleString()} more across categories than your monthly allowance (₹${stats.totalBudget.toLocaleString()}).`,
      actionText: "Adjust Categories"
    });
  } else if (stats.unallocated > 0) {
    insights.push({
      id: "unallocated-cash",
      type: "info",
      title: "Unallocated Money Available",
      message: `You still have ₹${stats.unallocated.toLocaleString()} unallocated from your pocket money to assign to categories or save.`,
      actionText: "Manage Budgets"
    });
  }

  // 3. Overall overspending alert
  if (stats.monthlyOverspent > 0) {
    insights.push({
      id: "overall-overspent",
      type: "warning",
      title: "Monthly Allowance Exceeded",
      message: `You've spent ₹${stats.monthlyOverspent.toLocaleString()} more than your ₹${stats.totalBudget.toLocaleString()} allowance this month.`
    });
  } else if (stats.isCurrentMonth && stats.safeToSpendToday > 0) {
    insights.push({
      id: "safe-spend",
      type: "tip",
      title: `Safe Daily Budget: ₹${stats.safeToSpendToday.toLocaleString()}`,
      message: `Keeping daily spending around ₹${stats.safeToSpendToday.toLocaleString()} over the remaining ${stats.daysRemaining} days will keep you within your allowance.`
    });
  }

  // 4. Category-specific alerts
  const overspentCats = stats.categoryStats.filter(c => c.overspent > 0);
  if (overspentCats.length > 0) {
    const topOver = overspentCats.sort((a, b) => b.overspent - a.overspent)[0];
    insights.push({
      id: `cat-over-${topOver.name}`,
      type: "warning",
      title: `${topOver.name} Budget Exceeded`,
      message: `${topOver.name} is ₹${topOver.overspent.toLocaleString()} over its allocated budget of ₹${topOver.budget.toLocaleString()}.`
    });
  } else {
    // Check if any category is nearing budget (>= 80%)
    const nearLimit = stats.categoryStats.find(c => c.budget > 0 && c.percentage >= 80 && c.percentage <= 100);
    if (nearLimit) {
      insights.push({
        id: `cat-near-${nearLimit.name}`,
        type: "tip",
        title: `${nearLimit.name} Near Limit`,
        message: `You've used ${Math.round(nearLimit.percentage)}% of your ${nearLimit.name} budget (₹${nearLimit.remaining.toLocaleString()} remaining).`
      });
    }
  }

  // 5. Savings rate accomplishment
  if (stats.monthlySavings > 0 && stats.totalSpent > 0 && !stats.isOverAllocated) {
    const savingsPercent = Math.round((stats.monthlySavings / stats.totalBudget) * 100);
    if (savingsPercent >= 15) {
      insights.push({
        id: "savings-rate",
        type: "success",
        title: "Strong Savings Pace",
        message: `You are on pace to save ${savingsPercent}% (₹${stats.monthlySavings.toLocaleString()}) of your allowance this month!`
      });
    }
  }

  // 6. Category comparison with previous month
  if (prevMonthData && prevMonthData.expenses) {
    const prevCatExpenses: Record<string, number> = {};
    prevMonthData.expenses.forEach(e => {
      prevCatExpenses[e.category] = (prevCatExpenses[e.category] || 0) + Number(e.amount);
    });

    for (const cat of stats.categoryStats) {
      const prevSpent = prevCatExpenses[cat.name] || 0;
      if (prevSpent > 300 && cat.spent > prevSpent * 1.25) {
        const pct = Math.round(((cat.spent - prevSpent) / prevSpent) * 100);
        insights.push({
          id: `compare-${cat.name}`,
          type: "info",
          title: `Increased Spending in ${cat.name}`,
          message: `You spent ${pct}% more on ${cat.name} compared to last month.`
        });
        break; // Only show one comparison to avoid clutter
      }
    }
  }

  return insights;
};
