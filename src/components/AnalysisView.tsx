import { useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Sparkles, 
  PiggyBank, 
  ArrowRight,
  GraduationCap,
  Calendar,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Lightbulb
} from "lucide-react";
import { AppData, MonthData, MonthStats, SmartInsight, CategoryStat } from "../types";
import { getProgressBarColor } from "../utils/calculations";
import WeeklyAnalysis from "./WeeklyAnalysis";
import YearSummary from "./YearSummary";
import { format, parseISO } from "date-fns";

interface AnalysisViewProps {
  data: AppData;
  monthData: MonthData;
  activeMonthKey: string;
  stats: MonthStats;
  smartInsights: SmartInsight[];
  prevMonthData?: MonthData;
  prevMonthName?: string;
  onActionClick?: (actionType: string) => void;
  onNavigateToTab?: (tab: any) => void;
}

type AnalysisSubView = "analysis" | "weekly" | "yearly";

export default function AnalysisView({
  data,
  monthData,
  activeMonthKey,
  stats,
  smartInsights,
  prevMonthData,
  prevMonthName,
  onActionClick,
  onNavigateToTab
}: AnalysisViewProps) {
  const [subView, setSubView] = useState<AnalysisSubView>("analysis");

  const dateObj = parseISO(`${activeMonthKey}-01`);
  const totalDays = stats.totalDaysInMonth || 30;
  const daysPassed = stats.isCurrentMonth 
    ? Math.max(1, totalDays - stats.daysRemaining + 1)
    : totalDays;
  const avgDailySpending = Math.round(stats.totalSpent / daysPassed);

  // Highest spending category
  const sortedCategories: CategoryStat[] = [...stats.categoryStats].sort((a, b) => b.spent - a.spent);
  const highestCategory = sortedCategories.length > 0 && sortedCategories[0].spent > 0 
    ? sortedCategories[0] 
    : null;

  const overspentCategories = stats.categoryStats.filter(c => c.overspent > 0);
  const underusedCategories = stats.categoryStats.filter(c => c.budget > 0 && c.spent < c.budget * 0.7);

  // Calculate month-over-month category trend comparisons
  const categoryTrends = stats.categoryStats.map(cat => {
    const prevSpent = (prevMonthData?.expenses || [])
      .filter(e => e.category === cat.name)
      .reduce((a, b) => a + Number(b.amount || 0), 0);
    const diff = cat.spent - prevSpent;
    return {
      name: cat.name,
      currentSpent: cat.spent,
      prevSpent,
      diff,
      increased: diff > 0,
      decreased: diff < 0
    };
  }).filter(t => t.currentSpent > 0 || t.prevSpent > 0);

  // Limit simultaneously visible smart insights to top 2-3 most actionable
  const curatedInsights = (smartInsights || []).slice(0, 3);

  return (
    <div className="space-y-4 pb-16">
      {/* Sub-view Navigation: Main Analysis, Weekly Velocity, Yearly History */}
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

      {subView === "weekly" && (
        <WeeklyAnalysis monthData={monthData} onClose={() => setSubView("analysis")} isEmbedded />
      )}

      {subView === "yearly" && (
        <YearSummary data={data} onClose={() => setSubView("analysis")} isEmbedded />
      )}

      {subView === "analysis" && (
        <div className="space-y-4">
          {/* ========================================================
              A. SPENDING OVERVIEW
             ======================================================== */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {format(dateObj, "MMMM yyyy")}
                </span>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Spending Overview</h2>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <BarChart3 size={20} />
              </div>
            </div>

            {/* 4 Overview Figures: Total spent, Average daily, Highest category, Transactions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Spent</span>
                <p className="text-base sm:text-lg font-black text-slate-800 mt-0.5">
                  ₹{stats.totalSpent.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  {Math.round(stats.spentPercentage)}% of budget
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daily Average</span>
                <p className="text-base sm:text-lg font-black text-slate-800 mt-0.5">
                  ₹{avgDailySpending.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  burn rate / day
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Top Category</span>
                <p className="text-base sm:text-lg font-black text-emerald-700 truncate mt-0.5">
                  {highestCategory ? highestCategory.name : "None"}
                </p>
                <span className="text-[10px] text-slate-500 font-medium truncate block">
                  {highestCategory ? `₹${highestCategory.spent.toLocaleString()}` : "₹0 spent"}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transactions</span>
                <p className="text-base sm:text-lg font-black text-slate-800 mt-0.5">
                  {(monthData.expenses || []).length}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  expenses logged
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================
              G. ACTIONABLE SMART INSIGHTS
             ======================================================== */}
          {curatedInsights.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Smart Insights & Guidance
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{curatedInsights.length} actionable</span>
              </div>

              <div className="space-y-2.5">
                {curatedInsights.map((insight) => {
                  let bg = "bg-slate-50 border-slate-200 text-slate-800";
                  if (insight.type === "warning") bg = "bg-amber-50 border-amber-200 text-amber-900";
                  if (insight.type === "success") bg = "bg-emerald-50 border-emerald-200 text-emerald-900";

                  return (
                    <div key={insight.id} className={`p-3.5 rounded-2xl border ${bg} flex items-start justify-between gap-3 text-xs`}>
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-bold block leading-tight">{insight.title}</span>
                        <p className="opacity-90 leading-relaxed text-[11px]">{insight.message}</p>
                      </div>
                      {insight.actionText && onActionClick && (
                        <button
                          type="button"
                          onClick={() => onActionClick(insight.actionText || "")}
                          className="shrink-0 text-[11px] font-bold underline flex items-center gap-0.5 hover:opacity-80 transition-opacity mt-0.5"
                        >
                          <span>{insight.actionText}</span>
                          <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              E. OVERSPENDING DETECTION (Highlighted)
             ======================================================== */}
          {overspentCategories.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-rose-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                <h3 className="text-sm font-bold">Overspent Categories ({overspentCategories.length})</h3>
              </div>

              <div className="space-y-2">
                {overspentCategories.map((c) => (
                  <div key={c.name} className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-rose-900">{c.name}</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        Budget: ₹{c.budget.toLocaleString()} • Spent: ₹{c.spent.toLocaleString()}
                      </p>
                    </div>
                    <span className="font-black text-rose-700 text-sm">
                      Overspent ₹{c.overspent.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              B. CATEGORY BREAKDOWN & C. BUDGET VS ACTUAL
             ======================================================== */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Category Breakdown & Budget vs Actual</h3>
                  <span className="text-[11px] text-slate-400">Where your money went this month</span>
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

            {/* List of categories with Budget vs Actual */}
            <div className="space-y-3">
              {sortedCategories.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <p>No category budgets or expenses logged for this month.</p>
                </div>
              ) : (
                sortedCategories.map((cat) => {
                  const shareOfTotalSpend = stats.totalSpent > 0 
                    ? Math.round((cat.spent / stats.totalSpent) * 100) 
                    : 0;

                  return (
                    <div key={cat.name} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">{cat.name}</span>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-md ${
                            cat.type === "fixed" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          }`}>
                            {cat.type}
                          </span>
                          {cat.overspent > 0 && (
                            <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded-md">
                              Overspent ₹{cat.overspent.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="font-black text-xs text-slate-800">₹{cat.spent.toLocaleString()}</span>
                          <span className="text-[11px] text-slate-400"> / ₹{cat.budget.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Visual progress bar */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(cat.percentage)}`}
                          style={{ width: `${Math.min(100, cat.percentage)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span>
                          {cat.remaining >= 0 ? `₹${cat.remaining.toLocaleString()} remaining` : `Exceeded by ₹${Math.abs(cat.remaining).toLocaleString()}`}
                          {" "}({Math.round(cat.percentage)}% used)
                        </span>
                        <span>{shareOfTotalSpend}% of total spend</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ========================================================
              D. SPENDING TRENDS (Month-over-Month Comparison)
             ======================================================== */}
          {categoryTrends.length > 0 && prevMonthData && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Spending Trends vs {prevMonthName || "Previous Month"}</h3>
                  <span className="text-[11px] text-slate-400">Track changes in category spending</span>
                </div>
              </div>

              <div className="space-y-2">
                {categoryTrends.map((trend) => (
                  <div key={trend.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{trend.name}</span>
                    <div className="flex items-center gap-1.5">
                      {trend.diff > 0 ? (
                        <span className="text-rose-600 font-bold flex items-center gap-0.5">
                          <ArrowUpRight size={13} />
                          +₹{Math.abs(trend.diff).toLocaleString()} more
                        </span>
                      ) : trend.diff < 0 ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                          <ArrowDownRight size={13} />
                          -₹{Math.abs(trend.diff).toLocaleString()} less
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Same as last month</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              F. MONTHLY STUDENT LEARNING & 8. NEXT-MONTH PLANNING
             ======================================================== */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-md space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <GraduationCap size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold">Monthly Learning & Next Month Planning</h3>
                <p className="text-xs text-slate-400">Actionable student guidance to improve your finances</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              {/* Spending Proportion Insight */}
              {highestCategory && stats.totalBudget > 0 && (
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 space-y-0.5">
                  <span className="font-bold text-emerald-300 block">Category Allocation Insight</span>
                  <p className="leading-relaxed">
                    You spent {Math.round((highestCategory.spent / stats.totalBudget) * 100)}% of your monthly allowance on {highestCategory.name}.
                  </p>
                </div>
              )}

              {/* Fixed vs Variable Advice */}
              {stats.fixedBudget > 0 && (
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 space-y-0.5">
                  <span className="font-bold text-sky-300 block">Fixed Commitments</span>
                  <p className="leading-relaxed">
                    Fixed costs (Rent, WiFi, Bills) took ₹{stats.fixedSpent.toLocaleString()}. Setting this aside on the 1st ensures your discretionary spending is safe.
                  </p>
                </div>
              )}

              {/* Next Month Budget Guidance */}
              {overspentCategories.length > 0 ? (
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 space-y-0.5">
                  <span className="font-bold text-amber-300 block">Next Month Planning Recommendation</span>
                  <p className="leading-relaxed">
                    Budget exceeded in {overspentCategories.map(c => `${c.name} (+₹${c.overspent.toLocaleString()})`).join(', ')}. 
                    Consider allocating an additional buffer or adjusting variable categories next month.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 space-y-0.5">
                  <span className="font-bold text-emerald-300 block">Replicating Success</span>
                  <p className="leading-relaxed">
                    You maintained strict adherence to all category budgets. You can easily replicate this budget template for next month in the Budget Planner.
                  </p>
                </div>
              )}
            </div>

            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab("budget")}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Open Budget Planner for Next Month</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
