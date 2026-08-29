import { useState, useMemo } from "react";
import { Search, Filter, Trash2, Tag, Calendar, Store, FileText, ArrowUpDown, X } from "lucide-react";
import { Expense } from "../types";
import { format, parseISO, isToday, isThisWeek, isThisMonth } from "date-fns";

interface ExpenseHistoryProps {
  expenses: Expense[];
  categories: string[];
  onDeleteExpense: (id: string) => void;
}

type TimeframeFilter = "all" | "today" | "week" | "month";
type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export default function ExpenseHistory({ expenses, categories, onDeleteExpense }: ExpenseHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<TimeframeFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const catMatch = exp.category.toLowerCase().includes(q);
        const noteMatch = exp.note?.toLowerCase().includes(q);
        const merchantMatch = exp.merchant?.toLowerCase().includes(q);
        if (!catMatch && !noteMatch && !merchantMatch) return false;
      }

      // Category filter
      if (selectedCategory !== "all" && exp.category !== selectedCategory) {
        return false;
      }

      // Timeframe filter
      if (timeframe !== "all") {
        try {
          const dateObj = parseISO(exp.date);
          if (timeframe === "today" && !isToday(dateObj)) return false;
          if (timeframe === "week" && !isThisWeek(dateObj, { weekStartsOn: 1 })) return false;
          if (timeframe === "month" && !isThisMonth(dateObj)) return false;
        } catch {
          return true;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "date-desc") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === "date-asc") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === "amount-desc") {
        return b.amount - a.amount;
      }
      if (sortBy === "amount-asc") {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [expenses, searchQuery, selectedCategory, timeframe, sortBy]);

  const totalFilteredAmount = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            Expense History
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {filteredExpenses.length} expense{filteredExpenses.length === 1 ? '' : 's'} totaling ₹{totalFilteredAmount.toLocaleString()}
          </p>
        </div>

        {/* Timeframe Filter Tabs */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl gap-1 self-start sm:self-auto overflow-x-auto max-w-full">
          {(["all", "today", "week", "month"] as TimeframeFilter[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 text-xs font-bold rounded-lg capitalize transition-all whitespace-nowrap ${
                timeframe === tf
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tf === "all" ? "All Time" : tf === "week" ? "This Week" : tf === "month" ? "This Month" : "Today"}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search note, merchant, category..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="sm:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="sm:col-span-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Expense List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Tag size={32} className="mx-auto text-slate-300 mb-2 stroke-[1.5]" />
            <p className="text-sm font-medium">No expenses match your filters.</p>
            <p className="text-xs text-slate-400 mt-0.5">Try resetting filters or adding a new expense.</p>
          </div>
        ) : (
          filteredExpenses.map((exp) => (
            <div
              key={exp.id}
              className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 text-sm">
                    {exp.merchant ? exp.merchant : exp.category}
                  </span>
                  <span className="text-[10px] font-bold bg-white text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
                    {exp.category}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" />
                    {format(parseISO(exp.date), "dd MMM yyyy, hh:mm a")}
                  </span>
                  {exp.note && (
                    <span className="flex items-center gap-1 text-slate-600 italic truncate max-w-[180px]">
                      <FileText size={12} className="text-slate-400 shrink-0" />
                      "{exp.note}"
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="font-black text-base text-slate-800">
                  ₹{exp.amount.toLocaleString()}
                </span>
                <button
                  onClick={() => onDeleteExpense(exp.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-80 group-hover:opacity-100 active:scale-95"
                  title="Delete expense"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
