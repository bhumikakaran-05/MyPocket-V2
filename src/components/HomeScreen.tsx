import { format, parseISO } from "date-fns";
import { 
  Sparkles, 
  Edit3, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  Calendar,
  Clock,
  TrendingDown,
  Info
} from "lucide-react";
import { MonthData, MonthStats, SmartInsight } from "../types";
import { getProgressBarColor } from "../utils/calculations";
import MonthSelector from "./MonthSelector";

interface HomeScreenProps {
  monthData: MonthData;
  stats: MonthStats;
  activeMonthKey: string;
  onMonthChange: (monthKey: string) => void;
  onOpenPocketMoney: () => void;
  onNavigateToTab: (tab: "expenses" | "budget" | "analysis") => void;
}

export default function HomeScreen({
  monthData,
  stats,
  activeMonthKey,
  onMonthChange,
  onOpenPocketMoney,
  onNavigateToTab
}: HomeScreenProps) {
  // Calculate Today's Spending from expenses
  const todayDateStr = format(new Date(), "yyyy-MM-dd");
  const todayExpenses = (monthData.expenses || []).filter(e => {
    try {
      return format(parseISO(e.date), "yyyy-MM-dd") === todayDateStr;
    } catch {
      return false;
    }
  });
  const todaySpent = todayExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Top 3 Spending Categories ONLY
  const top3Categories = [...stats.categoryStats]
    .filter(c => c.spent > 0 || c.budget > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 3);

  // Determine ONE Single Priority Status Message
  const getPriorityStatus = () => {
    // Priority 1: Deficit in total allowance
    if (stats.remainingBalance < 0) {
      return {
        type: "danger" as const,
        icon: <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />,
        text: `Allowance exceeded by ₹${Math.abs(stats.remainingBalance).toLocaleString()}. Prioritize essential expenses.`
      };
    }

    // Priority 2: Any individual category overspent
    const overspentCat = stats.categoryStats.find(c => c.overspent > 0);
    if (overspentCat) {
      return {
        type: "warning" as const,
        icon: <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />,
        text: `${overspentCat.name} budget is exceeded by ₹${overspentCat.overspent.toLocaleString()}.`
      };
    }

    // Priority 3: Today's spending exceeded daily planned safe pace
    if (stats.isCurrentMonth && stats.safeToSpendToday > 0 && todaySpent > stats.safeToSpendToday) {
      const paceExceeded = todaySpent - stats.safeToSpendToday;
      return {
        type: "warning" as const,
        icon: <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />,
        text: `You spent ₹${paceExceeded.toLocaleString()} more than your planned daily pace today.`
      };
    }

    // Priority 4: Category approaching limit (>= 80% used)
    const nearLimitCat = stats.categoryStats.find(c => c.percentage >= 80 && c.budget > 0);
    if (nearLimitCat) {
      return {
        type: "info" as const,
        icon: <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />,
        text: `${nearLimitCat.name} budget is ${Math.round(nearLimitCat.percentage)}% used.`
      };
    }

    // Priority 5: Unallocated funds available
    if (stats.unallocated > 0 && stats.totalBudget > 0) {
      return {
        type: "success" as const,
        icon: <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />,
        text: `You have ₹${stats.unallocated.toLocaleString()} unallocated reserve available for savings or upcoming needs.`
      };
    }

    // Priority 6: Default disciplined safe pace
    return {
      type: "success" as const,
      icon: <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />,
      text: `Pacing safely: ₹${stats.remainingBalance.toLocaleString()} remaining over ${stats.daysRemaining} days.`
    };
  };

  const priorityStatus = getPriorityStatus();

  return (
    <div className="space-y-3.5 pb-16">
      {/* Month Selector */}
      <MonthSelector 
        currentMonth={activeMonthKey} 
        onMonthChange={onMonthChange} 
      />

      {/* ========================================================
          A. MONTHLY MONEY SUMMARY & B. BUDGET STATUS
         ======================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-4">
        {/* Allowance & Real Remaining */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Monthly Allowance
            </span>
            <button
              type="button"
              onClick={onOpenPocketMoney}
              className="group flex items-center gap-2 text-left mt-0.5 hover:opacity-80 transition-opacity"
              title="Click to edit pocket money"
            >
              <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                ₹{stats.totalBudget.toLocaleString()}
              </h2>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <Edit3 size={15} />
              </div>
            </button>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Remaining Money
            </span>
            <p className={`text-2xl sm:text-3xl font-black mt-0.5 ${stats.remainingBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              ₹{stats.remainingBalance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 3 Metric Breakdown: Spent, Allocated, Unallocated */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Spent</span>
            <span className="text-sm font-black text-slate-800 block mt-0.5">₹{stats.totalSpent.toLocaleString()}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Allocated</span>
            <span className={`text-sm font-black block mt-0.5 ${stats.isOverAllocated ? 'text-rose-600' : 'text-emerald-700'}`}>
              ₹{stats.totalAllocated.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unallocated</span>
            <span className={`text-sm font-black block mt-0.5 ${stats.unallocated < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              {stats.unallocated < 0 ? `-₹${Math.abs(stats.unallocated).toLocaleString()}` : `₹${stats.unallocated.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* Visual Budget Status Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-500">Allowance Consumed</span>
            <span className="text-slate-800 font-bold">{Math.round(stats.spentPercentage)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(stats.spentPercentage)}`}
              style={{ width: `${Math.min(100, stats.spentPercentage)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
            <span>₹{stats.totalSpent.toLocaleString()} spent</span>
            <span>₹{Math.max(0, stats.remainingBalance).toLocaleString()} remaining</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          C. DAILY SPENDING STATUS
         ======================================================== */}
      {stats.isCurrentMonth && stats.totalBudget > 0 && (
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-100 block">
                  Daily Safe Spending
                </span>
                <h3 className="text-2xl font-black">
                  ₹{stats.safeToSpendToday.toLocaleString()} <span className="text-xs font-medium text-emerald-100">/ day</span>
                </h3>
              </div>
            </div>

            <div className="text-right bg-white/15 px-3 py-1.5 rounded-xl border border-white/20">
              <span className="text-xs font-black block">{stats.daysRemaining} days left</span>
              <span className="text-[10px] text-emerald-100">in {format(new Date(), "MMMM")}</span>
            </div>
          </div>

          {/* Today's Actual Spending vs Safe Pace */}
          <div className="p-3 bg-white/10 rounded-2xl border border-white/15 text-xs text-emerald-50 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span>Today's Spending:</span>
              <span className="text-sm font-black text-white">₹{todaySpent.toLocaleString()}</span>
            </div>
            <p className="text-[11px] text-emerald-100 leading-relaxed pt-0.5">
              {todaySpent > stats.safeToSpendToday
                ? `You spent ₹${(todaySpent - stats.safeToSpendToday).toLocaleString()} more than your daily target today. Pacing your next ${stats.daysRemaining} days will keep you safely on budget.`
                : todaySpent > 0
                ? `You have ₹${Math.max(0, stats.safeToSpendToday - todaySpent).toLocaleString()} remaining of today's safe allowance pace.`
                : `No expenses logged yet today. You can safely spend up to ₹${stats.safeToSpendToday.toLocaleString()} today.`}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================
          D. TOP SPENDING CATEGORIES (Only Top 3!)
         ======================================================== */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Layers size={15} className="text-emerald-700" />
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Top Spending Categories
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab("budget")}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 transition-colors"
          >
            <span>All Budgets</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {top3Categories.length === 0 ? (
          <div className="py-4 text-center text-slate-400 text-xs">
            <p>No expenses or category budgets recorded yet this month.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {top3Categories.map((cat) => (
              <div key={cat.name} className="space-y-1 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                    <span className="font-bold text-slate-800 truncate">{cat.name}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md ${
                      cat.type === "fixed" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    }`}>
                      {cat.type}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-800">₹{cat.spent.toLocaleString()}</span>
                    {cat.budget > 0 && (
                      <span className="text-slate-400 text-[11px]"> / ₹{cat.budget.toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {cat.budget > 0 && (
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(cat.percentage)}`}
                      style={{ width: `${Math.min(100, cat.percentage)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          E. ONE PRIORITY STATUS (Single Focused Insight)
         ======================================================== */}
      <div className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs shadow-xs transition-all ${
        priorityStatus.type === "danger"
          ? "bg-rose-50 border-rose-200 text-rose-800"
          : priorityStatus.type === "warning"
          ? "bg-amber-50 border-amber-200 text-amber-900"
          : priorityStatus.type === "info"
          ? "bg-blue-50 border-blue-200 text-blue-900"
          : "bg-emerald-50 border-emerald-200 text-emerald-900"
      }`}>
        {priorityStatus.icon}
        <span className="font-bold leading-relaxed">{priorityStatus.text}</span>
      </div>
    </div>
  );
}
