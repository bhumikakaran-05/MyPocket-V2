export type CategoryType = "fixed" | "variable";

export interface Expense {
  id: string;
  amount: number;
  category: string;
  merchant?: string;
  note?: string;
  date: string; // ISO string
}

export interface MonthData {
  monthlyPocketMoney: number;
  categoryBudgets: Record<string, number>;
  categoryTypes?: Record<string, CategoryType>;
  expenses: Expense[];
}

export interface SavingsData {
  totalSaved: number;
  yearlySaved: Record<string, number>; // key: "YYYY"
}

export interface AppData {
  months: Record<string, MonthData>; // key: "YYYY-MM"
  savings: SavingsData;
}

export const DEFAULT_CATEGORIES: Record<string, number> = {
  "Food": 0,
  "Travel": 0,
  "Entertainment": 0,
  "Rent": 0,
  "WiFi Bill": 0,
  "Mobile Recharge": 0,
  "Room Maintenance": 0,
  "Gas Cylinder Bill": 0,
  "Electricity Bill": 0
};

export const DEFAULT_CATEGORY_TYPES: Record<string, CategoryType> = {
  "Food": "variable",
  "Travel": "variable",
  "Entertainment": "variable",
  "Rent": "fixed",
  "WiFi Bill": "fixed",
  "Mobile Recharge": "fixed",
  "Room Maintenance": "fixed",
  "Gas Cylinder Bill": "fixed",
  "Electricity Bill": "fixed"
};

export interface CategoryStat {
  name: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  overspent: number;
  type: CategoryType;
}

export interface MonthStats {
  totalBudget: number; // Monthly pocket money
  totalAllocated: number; // Sum of category budgets
  unallocated: number; // totalBudget - totalAllocated
  isOverAllocated: boolean;
  overAllocatedAmount: number;
  totalSpent: number; // Actual money spent
  remainingBalance: number; // totalBudget - totalSpent (actual remaining money)
  spentPercentage: number;
  safeToSpendToday: number;
  daysRemaining: number;
  totalDaysInMonth: number;
  isCurrentMonth: boolean;
  categoryStats: CategoryStat[];
  monthlySavings: number;
  monthlyOverspent: number;
  fixedSpent: number;
  fixedBudget: number;
  variableSpent: number;
  variableBudget: number;
}

export interface WeekStats {
  weekSpent: number;
  dailyAverage: number;
  topCategory: { name: string; amount: number } | null;
  expenseCount: number;
  daysRemainingInWeek: number;
  previousWeekSpent: number;
  statusText: string;
  statusType: "on-track" | "warning" | "neutral";
  dailySpending: { day: string; amount: number; isToday?: boolean }[];
}

export interface MonthAnalysisData {
  monthKey: string;
  monthName: string;
  allowance: number;
  totalAllocated: number;
  totalSpent: number;
  remaining: number;
  unallocated: number;
  savings: number;
  savingsRate: number;
  highestCategory: { name: string; amount: number } | null;
  overspentCategories: CategoryStat[];
  expenseCount: number;
  averageDailySpending: number;
  comparisonWithPrevMonth: {
    percentageChange: number;
    diffAmount: number;
    text: string;
  } | null;
}

export interface SmartInsight {
  id: string;
  type: "info" | "warning" | "success" | "tip";
  title: string;
  message: string;
  actionText?: string;
}
