import { useState, useMemo } from "react";
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Receipt, 
  Layers, 
  Sparkles, 
  PiggyBank, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  PieChart,
  Tag,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { AppData, MonthData, MonthStats } from "../types";
import WeeklyAnalysis from "./WeeklyAnalysis";
import YearSummary from "./YearSummary";
import { format, parseISO } from "date-fns";

interface AnalysisViewProps {
  data: AppData;
  monthData: MonthData;
  activeMonthKey: string;
  stats: MonthStats;
  smartInsights?: any[];
  prevMonthData?: MonthData;
  prevMonthName?: string;
  onActionClick?: (actionType: string) => void;
  onNavigateToTab?: (tab: "home" | "expenses" | "budget" | "analysis" | "profile") => void;
}

type AnalysisSubView = "analysis" | "weekly" | "yearly";

export default function AnalysisView({
  data,
  monthData,
  activeMonthKey,
  prevMonthData,
  prevMonthName,
  onNavigateToTab
}: AnalysisViewProps) {
  const [subView, setSubView] = useState<AnalysisSubView>("analysis");

  const dateObj = useMemo(() => {
    try {
      return parseISO(`${activeMonthKey}-01`);
    } catch {
      return new Date();
    }
  }, [activeMonthKey]);

  // =========================================================================
  // 1. Core Financial Calculations for Selected Month (Fully Dynamic & Reactive)
  // =========================================================================
  const allowance = Number(monthData.monthlyPocketMoney || 0);
  const expenses = useMemo(() => monthData.expenses || [], [monthData.expenses]);
  const categoryBudgets = useMemo(() => monthData.categoryBudgets || {}, [monthData.categoryBudgets]);
  const categoryTypes = useMemo(() => monthData.categoryTypes || {}, [monthData.categoryTypes]);

  // Total Spent = Sum of all expenses recorded for the selected month
  const totalSpent = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses]);

  // Total Allocated = Sum of the budgets allocated to categories for that month
  const totalAllocated = useMemo(() => {
    return Object.values(categoryBudgets).reduce<number>((sum, b) => sum + (Number(b) || 0), 0);
  }, [categoryBudgets]);

  // Unallocated Money = Pocket money that has not been assigned to any category budget
  const unallocated = Math.max(0, allowance - totalAllocated);

  // Saved / Unused Money:
  // If Total Spent < Monthly Allowance: Saved = Monthly Allowance - Total Spent
  // If Total Spent >= Monthly Allowance: Saved = 0
  const saved = allowance > totalSpent ? allowance - totalSpent : 0;

  // Overspent:
  // If Total Spent > Monthly Allowance: Overspent = Total Spent - Monthly Allowance
  // Otherwise: Overspent = 0
  const overspent = totalSpent > allowance ? totalSpent - allowance : 0;

  const spentPercentage = allowance > 0 ? Math.round((totalSpent / allowance) * 100) : 0;

  // Days calculations for daily burn rate
  const now = new Date();
  const currentMonthKey = format(now, "yyyy-MM");
  const isSelectedCurrentMonth = activeMonthKey === currentMonthKey;
  const daysInMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate();
  const daysPassed = isSelectedCurrentMonth 
    ? Math.max(1, now.getDate()) 
    : daysInMonth;
  const avgDailySpending = Math.round(totalSpent / daysPassed);

  // =========================================================================
  // 2. One Concise Monthly Takeaway
  // =========================================================================
  const takeaway = useMemo(() => {
    if (allowance <= 0 && totalSpent <= 0) {
      return {
        text: "Set your monthly pocket money in the Home screen to start tracking your savings.",
        type: "neutral" as const
      };
    }
    if (allowance <= 0 && totalSpent > 0) {
      return {
        text: `You have spent ₹${totalSpent.toLocaleString()} this month. Set your monthly allowance to see your savings.`,
        type: "neutral" as const
      };
    }
    if (overspent > 0) {
      return {
        text: `You spent ₹${overspent.toLocaleString()} more than your monthly pocket money.`,
        type: "negative" as const
      };
    }
    if (totalSpent === allowance && allowance > 0) {
      return {
        text: `You spent exactly 100% of your pocket money (₹${allowance.toLocaleString()}) with ₹0 left.`,
        type: "warning" as const
      };
    }
    return {
      text: `You spent ${spentPercentage}% of your pocket money and have ₹${saved.toLocaleString()} unused.`,
      type: "positive" as const
    };
  }, [allowance, totalSpent, overspent, saved, spentPercentage]);

  // =========================================================================
  // 3. Category Performance Analysis (Budget vs Actual)
  // =========================================================================
  const allCategoryNames = useMemo(() => {
    const names = new Set<string>();
    Object.keys(categoryBudgets).forEach(c => names.add(c));
    expenses.forEach(e => {
      if (e.category) names.add(e.category);
    });
    return Array.from(names);
  }, [categoryBudgets, expenses]);

  const categoryPerformance = useMemo(() => {
    return allCategoryNames.map(name => {
      const budget = Number(categoryBudgets[name] || 0);
      const catExpenses = expenses.filter(e => e.category === name);
      const spent = catExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const catType = categoryTypes[name] || "variable";
      
      const isOverBudget = budget > 0 && spent > budget;
      const overBudgetAmount = isOverBudget ? spent - budget : 0;
      const remainingAmount = budget > spent ? budget - spent : 0;
      const percentUsed = budget > 0 ? Math.round((spent / budget) * 100) : (spent > 0 ? 100 : 0);
      const shareOfTotal = totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0;

      return {
        name,
        budget,
        spent,
        catType,
        isOverBudget,
        overBudgetAmount,
        remainingAmount,
        percentUsed,
        shareOfTotal,
        expenseCount: catExpenses.length
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [allCategoryNames, categoryBudgets, categoryTypes, expenses, totalSpent]);

  // Overspent categories list
  const overspentCategories = useMemo(() => {
    return categoryPerformance.filter(c => c.isOverBudget);
  }, [categoryPerformance]);

  // Top spending category
  const highestCategory = categoryPerformance.length > 0 && categoryPerformance[0].spent > 0 
    ? categoryPerformance[0] 
    : null;

  // Month-over-month category trends
  const categoryTrends = useMemo(() => {
    if (!prevMonthData) return [];
    return categoryPerformance.map(cat => {
      const prevSpent = (prevMonthData.expenses || [])
        .filter(e => e.category === cat.name)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const diff = cat.spent - prevSpent;
      return {
        name: cat.name,
        currentSpent: cat.spent,
        prevSpent,
        diff,
        increased: diff > 0,
        decreased: diff < 0
      };
    }).filter(t => t.currentSpent > 0 && t.prevSpent > 0);
  }, [categoryPerformance, prevMonthData]);

  return (
    <div className="space-y-4 pb-16 max-w-2xl mx-auto">
      {/* ==================== SUB-VIEW TABS ==================== */}
      <div className="bg-white p-1 rounded-2xl border border-slate-200/90 shadow-xs flex text-xs font-bold">
        <button
          type="button"
          onClick={() => setSubView("analysis")}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            subView === "analysis" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BarChart3 size={14} />
          <span>Monthly Analysis</span>
        </button>
        <button
          type="button"
          onClick={() => setSubView("weekly")}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            subView === "weekly" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Calendar size={14} />
          <span>Weekly Pace</span>
        </button>
        <button
          type="button"
          onClick={() => setSubView("yearly")}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            subView === "yearly" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <TrendingUp size={14} />
          <span>Yearly View</span>
        </button>
      </div>

      {/* Embedded Sub-views */}
      {subView === "weekly" && (
        <WeeklyAnalysis monthData={monthData} onClose={() => setSubView("analysis")} isEmbedded />
      )}

      {subView === "yearly" && (
        <YearSummary data={data} onClose={() => setSubView("analysis")} isEmbedded />
      )}

      {/* Main Monthly Analysis View */}
      {subView === "analysis" && (
        <div className="space-y-4">
          {/* ========================================================
              1. ONE CONCISE MONTHLY TAKEAWAY BANNER
             ======================================================== */}
          <div 
            className={`p-4 sm:p-5 rounded-3xl border shadow-xs transition-all ${
              takeaway.type === "negative"
                ? "bg-rose-50/90 border-rose-200 text-rose-900"
                : takeaway.type === "positive"
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {takeaway.type === "negative" ? (
                  <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                    <AlertTriangle size={18} />
                  </div>
                ) : takeaway.type === "positive" ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <PiggyBank size={18} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600">
                    <Wallet size={18} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                  {format(dateObj, "MMMM yyyy")} Takeaway
                </span>
                <p className="text-sm sm:text-base font-bold leading-snug">
                  {takeaway.text}
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================
              2. MONTHLY FINANCIAL SUMMARY (6 Core Figures)
             ======================================================== */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Monthly Financial Summary
                </h2>
                <p className="text-xs text-slate-400">
                  Pocket money balance for {format(dateObj, "MMMM yyyy")}
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
              </span>
            </div>

            {/* 6 Cards in a responsive 2-col / 3-col grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* Card 1: Pocket Money / Monthly Allowance */}
              <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Wallet size={14} className="text-slate-600" />
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Pocket Money</span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                  ₹{allowance.toLocaleString()}
                </p>
                <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
                  Monthly allowance
                </span>
              </div>

              {/* Card 2: Total Spent */}
              <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Receipt size={14} className="text-slate-600" />
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Total Spent</span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                  ₹{totalSpent.toLocaleString()}
                </p>
                <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
                  {allowance > 0 ? `${spentPercentage}% of pocket money` : "All expenses"}
                </span>
              </div>

              {/* Card 3: Total Allocated */}
              <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Layers size={14} className="text-slate-600" />
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Total Allocated</span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                  ₹{totalAllocated.toLocaleString()}
                </p>
                <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
                  Assigned to budgets
                </span>
              </div>

              {/* Card 4: Unallocated Money */}
              <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Sparkles size={14} className="text-slate-600" />
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Unallocated Money</span>
                </div>
                <p className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                  ₹{unallocated.toLocaleString()}
                </p>
                <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">
                  Unassigned buffer
                </span>
              </div>

              {/* Card 5: Saved / Unused Money */}
              <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <PiggyBank size={14} className="text-emerald-700" />
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Saved / Unused</span>
                </div>
                <p className="text-base sm:text-lg font-black text-emerald-700 tracking-tight">
                  ₹{saved.toLocaleString()}
                </p>
                <span className="text-[10px] sm:text-[11px] text-emerald-700/80 block truncate">
                  {saved > 0 ? "Kept in your pocket" : "No unused allowance"}
                </span>
              </div>

              {/* Card 6: Overspent Amount */}
              <div 
                className={`p-3.5 rounded-2xl border space-y-1 ${
                  overspent > 0 
                    ? "bg-rose-50/80 border-rose-200" 
                    : "bg-slate-50/90 border-slate-200/70"
                }`}
              >
                <div className={`flex items-center gap-1.5 ${overspent > 0 ? "text-rose-700" : "text-slate-500"}`}>
                  <AlertTriangle size={14} className={overspent > 0 ? "text-rose-600" : "text-slate-400"} />
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Overspent</span>
                </div>
                <p className={`text-base sm:text-lg font-black tracking-tight ${overspent > 0 ? "text-rose-600" : "text-slate-400"}`}>
                  ₹{overspent.toLocaleString()}
                </p>
                <span className={`text-[10px] sm:text-[11px] block truncate ${overspent > 0 ? "text-rose-600" : "text-slate-400"}`}>
                  {overspent > 0 ? "Above pocket money" : "Within allowance"}
                </span>
              </div>
            </div>

            {/* Quick helper note clarifying difference between Unallocated & Saved */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>
                <strong className="text-slate-700">Note:</strong> Unallocated is money not assigned to budgets. Saved / Unused is unspent cash from your monthly allowance.
              </span>
            </div>
          </div>

          {/* ========================================================
              3. CATEGORY PERFORMANCE (Budget vs Actual Spending)
             ======================================================== */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <PieChart size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Category Performance
                  </h3>
                  <p className="text-xs text-slate-400">
                    Budget vs actual spending for this month
                  </p>
                </div>
              </div>

              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab("budget")}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <span>Edit Budgets</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            {categoryPerformance.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-1">
                <p className="text-xs font-semibold text-slate-600">No categories or expenses recorded</p>
                <p className="text-[11px] text-slate-400">Add categories in the Budget tab or log an expense.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categoryPerformance.map((cat) => (
                  <div 
                    key={cat.name} 
                    className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2 hover:bg-slate-50 transition-colors"
                  >
                    {/* Top Row: Name + Type Tag, and Amount */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                          {cat.name}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          cat.catType === "fixed" 
                            ? "bg-blue-50 text-blue-700 border border-blue-100" 
                            : "bg-purple-50 text-purple-700 border border-purple-100"
                        }`}>
                          {cat.catType}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-black text-slate-800">
                          ₹{cat.spent.toLocaleString()}
                        </span>
                        {cat.budget > 0 && (
                          <span className="text-xs text-slate-400 font-bold ml-1">
                            / ₹{cat.budget.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {cat.budget > 0 && (
                      <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            cat.isOverBudget 
                              ? "bg-rose-500" 
                              : cat.percentUsed > 80 
                              ? "bg-amber-500" 
                              : "bg-emerald-600"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(3, cat.percentUsed))}%` }}
                        />
                      </div>
                    )}

                    {/* Bottom Row: Remaining or Over budget status, and % used */}
                    <div className="flex items-center justify-between text-[11px] font-semibold pt-0.5">
                      {cat.budget > 0 ? (
                        <>
                          {cat.isOverBudget ? (
                            <span className="text-rose-600 font-bold flex items-center gap-1">
                              <AlertTriangle size={12} />
                              ₹{cat.overBudgetAmount.toLocaleString()} over budget
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold">
                              ₹{cat.remainingAmount.toLocaleString()} remaining
                            </span>
                          )}
                          <span className={cat.isOverBudget ? "text-rose-600 font-bold" : "text-slate-500"}>
                            {cat.percentUsed}% used
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-400 font-normal">
                            No budget allocated
                          </span>
                          <span className="text-slate-500">
                            {cat.shareOfTotal}% of total spend
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================
              4. BUDGET ALERTS SECTION (Over budget categories)
             ======================================================== */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-xl ${overspentCategories.length > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"}`}>
                  {overspentCategories.length > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Budget Alerts
                  </h3>
                  <p className="text-xs text-slate-400">
                    Category budget limit status
                  </p>
                </div>
              </div>

              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab("budget")}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <span>Adjust Budgets</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            {overspentCategories.length > 0 ? (
              <div className="space-y-2">
                {overspentCategories.map((c) => (
                  <div 
                    key={c.name} 
                    className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-rose-950 truncate">{c.name}</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        Budget: ₹{c.budget.toLocaleString()} • Spent: ₹{c.spent.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-rose-700 text-sm block">
                        +₹{c.overBudgetAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-rose-500 font-semibold uppercase">
                        Exceeded
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/90 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-emerald-950">
                    You're within all category budgets this month.
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Every category with an allocated budget is currently within its limit!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================
              5. SPENDING HIGHLIGHTS & COMPARISON
             ======================================================== */}
          <div className="grid grid-cols-2 gap-3">
            {/* Top Category */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Top Spending Category
              </span>
              <p className="text-base font-black text-slate-800 truncate">
                {highestCategory ? highestCategory.name : "None"}
              </p>
              <span className="text-xs text-slate-500 font-medium truncate block">
                {highestCategory ? `₹${highestCategory.spent.toLocaleString()} (${highestCategory.shareOfTotal}%)` : "₹0 spent"}
              </span>
            </div>

            {/* Daily Average Burn Rate */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Daily Burn Rate
              </span>
              <p className="text-base font-black text-slate-800">
                ₹{avgDailySpending.toLocaleString()}
              </p>
              <span className="text-xs text-slate-500 font-medium block">
                avg spent / day
              </span>
            </div>
          </div>

          {/* Month-over-Month Comparison Trends if previous month data exists */}
          {categoryTrends.length > 0 && prevMonthName && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Trends vs {prevMonthName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Category spending comparison
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {categoryTrends.slice(0, 4).map((trend) => (
                  <div key={trend.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{trend.name}</span>
                      <p className="text-[10px] text-slate-400">
                        {prevMonthName}: ₹{trend.prevSpent.toLocaleString()} → Now: ₹{trend.currentSpent.toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center gap-0.5 font-bold text-xs ${
                        trend.increased ? "text-rose-600" : "text-emerald-700"
                      }`}>
                        {trend.increased ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {trend.increased ? `+₹${trend.diff.toLocaleString()}` : `-₹${Math.abs(trend.diff).toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
