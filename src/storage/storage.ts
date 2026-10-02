import { AppData, MonthData, DEFAULT_CATEGORIES, DEFAULT_CATEGORY_TYPES, CategoryType } from "../types";

const STORAGE_KEY = "mypocket_data";

export const getInitialData = (): AppData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Migrate existing V1 data if needed
      if (parsed && typeof parsed === "object" && parsed.months) {
        const migratedMonths: Record<string, MonthData> = {};
        
        Object.entries(parsed.months).forEach(([key, val]) => {
          const rawMonth = val as Partial<MonthData> & { monthlyIncome?: number };
          const categoryBudgets = rawMonth.categoryBudgets !== undefined 
            ? { ...rawMonth.categoryBudgets } 
            : { ...DEFAULT_CATEGORIES };
          
          // Build categoryTypes if missing
          const categoryTypes: Record<string, CategoryType> = rawMonth.categoryTypes ? { ...rawMonth.categoryTypes } : {};
          Object.keys(categoryBudgets).forEach((catName) => {
            if (!categoryTypes[catName]) {
              categoryTypes[catName] = DEFAULT_CATEGORY_TYPES[catName] || "variable";
            }
          });

          migratedMonths[key] = {
            monthlyPocketMoney: Number(rawMonth.monthlyPocketMoney ?? rawMonth.monthlyIncome ?? 0),
            categoryBudgets,
            categoryTypes,
            archivedCategories: Array.isArray(rawMonth.archivedCategories) ? rawMonth.archivedCategories : [],
            expenses: Array.isArray(rawMonth.expenses) ? rawMonth.expenses : []
          };
        });

        return {
          months: migratedMonths,
          savings: parsed.savings || { totalSaved: 0, yearlySaved: {} }
        };
      }
    } catch (e) {
      console.error("Failed to parse stored data", e);
    }
  }
  return {
    months: {},
    savings: {
      totalSaved: 0,
      yearlySaved: {}
    }
  };
};

export const saveData = (data: AppData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save data to localStorage", e);
  }
};

export const getMonthData = (data: AppData, monthKey: string): MonthData => {
  if (data.months && data.months[monthKey]) {
    const existing = data.months[monthKey];
    const categoryBudgets = existing.categoryBudgets !== undefined ? { ...existing.categoryBudgets } : {};
    const categoryTypes = existing.categoryTypes ? { ...existing.categoryTypes } : {};
    Object.keys(categoryBudgets).forEach(cat => {
      if (!categoryTypes[cat]) {
        categoryTypes[cat] = DEFAULT_CATEGORY_TYPES[cat] || "variable";
      }
    });

    return {
      monthlyPocketMoney: Number(existing.monthlyPocketMoney || 0),
      categoryBudgets,
      categoryTypes,
      archivedCategories: Array.isArray(existing.archivedCategories) ? existing.archivedCategories : [],
      expenses: existing.expenses || []
    };
  }

  // If this month has not been initialized yet:
  // Check if user already has other months in data (preserve user's actual categories!)
  const existingMonthKeys = Object.keys(data.months || {}).sort((a, b) => b.localeCompare(a));
  if (existingMonthKeys.length > 0) {
    const latestMonth = data.months[existingMonthKeys[0]];
    const inheritedBudgets: Record<string, number> = {};
    const inheritedTypes: Record<string, CategoryType> = {};
    Object.keys(latestMonth.categoryBudgets || {}).forEach((cat) => {
      inheritedBudgets[cat] = 0; // Default budget to 0 for a new month
      inheritedTypes[cat] = latestMonth.categoryTypes?.[cat] || "variable";
    });
    return {
      monthlyPocketMoney: 0,
      categoryBudgets: inheritedBudgets,
      categoryTypes: inheritedTypes,
      archivedCategories: Array.isArray(latestMonth.archivedCategories) ? [...latestMonth.archivedCategories] : [],
      expenses: []
    };
  }

  // Only for a brand-new user with zero existing months:
  return {
    monthlyPocketMoney: 0,
    categoryBudgets: { ...DEFAULT_CATEGORIES },
    categoryTypes: { ...DEFAULT_CATEGORY_TYPES },
    archivedCategories: [],
    expenses: []
  };
};

export const updateMonthData = (data: AppData, monthKey: string, monthData: MonthData): AppData => {
  const newData = {
    ...data,
    months: {
      ...data.months,
      [monthKey]: monthData
    }
  };
  
  // Recalculate savings
  return recalculateSavings(newData);
};

export const recalculateSavings = (data: AppData): AppData => {
  let totalSaved = 0;
  const yearlySaved: Record<string, number> = {};
  const currentMonthKey = new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, '0');

  Object.entries(data.months).forEach(([monthKey, monthData]) => {
    const year = monthKey.split("-")[0];
    const pocketMoney = monthData.monthlyPocketMoney || 0;
    const totalSpent = (monthData.expenses || []).reduce((a, b) => a + (Number(b.amount) || 0), 0);
    
    const monthlySavings = pocketMoney - totalSpent;
    
    // Past months contribute to accumulated savings
    if (monthKey < currentMonthKey) {
      totalSaved += monthlySavings;
    }
    
    yearlySaved[year] = (yearlySaved[year] || 0) + monthlySavings;
  });

  return {
    ...data,
    savings: {
      totalSaved,
      yearlySaved
    }
  };
};

export const clearAllData = (): AppData => {
  localStorage.removeItem(STORAGE_KEY);
  return {
    months: {},
    savings: {
      totalSaved: 0,
      yearlySaved: {}
    }
  };
};
