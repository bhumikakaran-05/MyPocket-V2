import { useMemo } from "react";
import { ArrowRight, Receipt, Plus, Calendar, FileText } from "lucide-react";
import { Expense } from "../types";
import { format, parseISO, isToday, isYesterday } from "date-fns";

interface RecentExpensesCardProps {
  expenses: Expense[];
  onViewAll: () => void;
  onQuickAdd: () => void;
}

export default function RecentExpensesCard({ expenses, onViewAll, onQuickAdd }: RecentExpensesCardProps) {
  const recentThree = useMemo(() => {
    return [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [expenses]);

  const getDateLabel = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return "Today";
      if (isYesterday(d)) return "Yesterday";
      return format(d, "dd MMM");
    } catch {
      return "Earlier";
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <Receipt size={16} />
          </div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Recent Expenses
          </h3>
        </div>
        
        {expenses.length > 0 && (
          <span className="text-[11px] font-bold text-slate-400">
            {expenses.length} total
          </span>
        )}
      </div>

      {/* List (Max 3) */}
      {recentThree.length === 0 ? (
        <div className="py-6 text-center text-slate-400 space-y-2 bg-slate-50/70 rounded-2xl border border-slate-100 p-4">
          <p className="text-xs font-medium text-slate-500">No expenses recorded yet this month.</p>
          <button
            onClick={onQuickAdd}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1"
          >
            <Plus size={13} /> Log your first expense
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {recentThree.map((exp) => (
            <div
              key={exp.id}
              className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/70 flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm truncate">
                    {exp.merchant ? exp.merchant : exp.category}
                  </span>
                  <span className="text-[9px] font-bold bg-white text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                    {exp.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                  <span className="font-medium text-slate-500">
                    {getDateLabel(exp.date)}
                  </span>
                  {exp.note && (
                    <>
                      <span>•</span>
                      <span className="truncate italic text-slate-400 max-w-[150px]">
                        "{exp.note}"
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-black text-sm text-slate-800 block">
                  ₹{exp.amount.toLocaleString()}
                </span>
              </div>
            </div>
          ))}

          {/* View All Button */}
          <button
            onClick={onViewAll}
            className="w-full py-2.5 px-4 mt-1 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-200/60 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-98"
          >
            <span>View all expenses</span>
            {expenses.length > 3 && (
              <span className="text-emerald-600 font-normal">({expenses.length})</span>
            )}
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
