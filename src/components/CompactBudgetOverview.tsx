import { MonthStats } from "../types";
import { getProgressBarColor } from "../utils/calculations";
import { ArrowRight, AlertTriangle, CheckCircle2, Sliders } from "lucide-react";

interface CompactBudgetOverviewProps {
  stats: MonthStats;
  onManageBudgets: () => void;
}

export default function CompactBudgetOverview({ stats, onManageBudgets }: CompactBudgetOverviewProps) {
  // Sort categories by highest spent or overspent first
  const displayCategories = [...stats.categoryStats]
    .sort((a, b) => (b.overspent - a.overspent) || (b.spent - a.spent))
    .slice(0, 3);

  const overspentCount = stats.categoryStats.filter(c => c.overspent > 0).length;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <Sliders size={16} />
          </div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Category Budgets ({stats.categoryStats.length})
          </h3>
        </div>

        <button
          onClick={onManageBudgets}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
        >
          <span>Manage</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Overspent alert if any */}
      {overspentCount > 0 && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
            <span>{overspentCount} category budget{overspentCount === 1 ? '' : 's'} exceeded</span>
          </div>
          <span className="font-extrabold text-rose-700">+₹{stats.monthlyOverspent.toLocaleString()}</span>
        </div>
      )}

      {/* Mini categories preview */}
      {displayCategories.length === 0 ? (
        <div className="py-4 text-center text-slate-400 text-xs">
          <p>No category budgets configured yet.</p>
          <button onClick={onManageBudgets} className="text-emerald-700 font-bold underline mt-1">
            Set up categories
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayCategories.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 truncate max-w-[150px]">{cat.name}</span>
                <div className="text-right">
                  <span className="font-bold text-slate-800">₹{cat.spent.toLocaleString()}</span>
                  <span className="text-slate-400"> / ₹{cat.budget.toLocaleString()}</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(cat.percentage)}`}
                  style={{ width: `${Math.min(100, cat.percentage)}%` }}
                />
              </div>
            </div>
          ))}

          {stats.categoryStats.length > 3 && (
            <button
              onClick={onManageBudgets}
              className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 pt-1 block text-center w-full"
            >
              + {stats.categoryStats.length - 3} more categories
            </button>
          )}
        </div>
      )}
    </div>
  );
}
