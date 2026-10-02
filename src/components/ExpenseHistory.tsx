import { useState, useMemo } from "react";
import { 
  Search, 
  Trash2, 
  Tag, 
  Calendar, 
  Store, 
  FileText, 
  X, 
  Check, 
  Edit3, 
  Plus, 
  ArrowUpDown,
  Filter,
  Receipt
} from "lucide-react";
import { Expense } from "../types";
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";

interface ExpenseHistoryProps {
  expenses: Expense[];
  categories: string[];
  activeMonthKey?: string;
  onMonthChange?: (monthKey: string) => void;
  onDeleteExpense: (id: string) => void;
  onEditExpense?: (expense: Expense) => void;
  onQuickAdd?: () => void;
  isStandaloneScreen?: boolean;
}

type TimeframeFilter = "all" | "today" | "week" | "month";
type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export default function ExpenseHistory({ 
  expenses, 
  categories, 
  activeMonthKey,
  onMonthChange,
  onDeleteExpense, 
  onEditExpense,
  onQuickAdd,
  isStandaloneScreen = false
}: ExpenseHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<TimeframeFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  // Group filtered expenses by date
  const groupedExpenses = useMemo(() => {
    const groups: { dateKey: string; label: string; subtotal: number; items: Expense[] }[] = [];
    const map = new Map<string, { label: string; subtotal: number; items: Expense[] }>();

    filteredExpenses.forEach(exp => {
      let dateKey = "unknown";
      let label = "Earlier";
      try {
        const d = parseISO(exp.date);
        dateKey = format(d, "yyyy-MM-dd");
        if (isToday(d)) {
          label = "Today";
        } else if (isYesterday(d)) {
          label = "Yesterday";
        } else {
          label = format(d, "EEEE, dd MMMM yyyy");
        }
      } catch {
        dateKey = "unknown";
      }

      if (!map.has(dateKey)) {
        map.set(dateKey, { label, subtotal: 0, items: [] });
      }
      const group = map.get(dateKey)!;
      group.items.push(exp);
      group.subtotal += exp.amount;
    });

    map.forEach((value, key) => {
      groups.push({ dateKey: key, ...value });
    });

    return groups;
  }, [filteredExpenses]);

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4 ${
      isStandaloneScreen ? "p-4 sm:p-6" : "p-5 sm:p-6"
    }`}>
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Receipt size={18} className="text-emerald-600" />
              {isStandaloneScreen ? "Transaction History" : "Expense History"}
            </h3>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
              {filteredExpenses.length}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Totaling <strong className="text-slate-700 font-bold">₹{totalFilteredAmount.toLocaleString()}</strong> in this view
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onQuickAdd && (
            <button
              type="button"
              onClick={onQuickAdd}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-xs active:scale-95"
            >
              <Plus size={14} />
              <span>Add Expense</span>
            </button>
          )}

          {/* Timeframe Filter Tabs */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto max-w-full">
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

      {/* Date-Grouped Expense List */}
      <div className={`space-y-5 overflow-y-auto pr-1 ${isStandaloneScreen ? "max-h-[620px]" : "max-h-[420px]"}`}>
        {filteredExpenses.length === 0 ? (
          <div className="py-14 text-center text-slate-400 space-y-2">
            <Tag size={36} className="mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-600">No transactions match your search or filter</p>
            <p className="text-xs text-slate-400">
              {expenses.length === 0 
                ? "You haven't logged any expenses for this month yet." 
                : "Try resetting filters to view all entries."}
            </p>
            {onQuickAdd && expenses.length === 0 && (
              <button
                onClick={onQuickAdd}
                className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> Add First Expense
              </button>
            )}
          </div>
        ) : (
          groupedExpenses.map((group) => (
            <div key={group.dateKey} className="space-y-2">
              {/* Group Date Header */}
              <div className="flex items-center justify-between px-1.5 pt-1">
                <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} className="text-emerald-600" />
                  {group.label}
                </span>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  ₹{group.subtotal.toLocaleString()}
                </span>
              </div>

              {/* Items in this date group */}
              <div className="space-y-1.5">
                {group.items.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 sm:p-3.5 bg-slate-50 hover:bg-slate-100/90 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 transition-colors group"
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
                        <span>
                          {format(parseISO(exp.date), "hh:mm a")}
                        </span>
                        {exp.note && (
                          <span className="flex items-center gap-1 text-slate-600 italic truncate max-w-[200px]">
                            <FileText size={12} className="text-slate-400 shrink-0" />
                            "{exp.note}"
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-base text-slate-800">
                        ₹{exp.amount.toLocaleString()}
                      </span>

                      {/* Edit Button */}
                      {onEditExpense && confirmDeleteId !== exp.id && (
                        <button
                          onClick={() => onEditExpense(exp)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors opacity-80 group-hover:opacity-100 active:scale-95"
                          title="Edit transaction"
                        >
                          <Edit3 size={15} />
                        </button>
                      )}

                      {/* Delete Button with Confirmation */}
                      {confirmDeleteId === exp.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-xl animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteExpense(exp.id);
                              setConfirmDeleteId(null);
                            }}
                            className="p-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                            title="Confirm delete"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="p-1 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-80 group-hover:opacity-100 active:scale-95"
                          title="Delete transaction"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
