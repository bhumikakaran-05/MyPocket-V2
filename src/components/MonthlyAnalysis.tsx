import { useState } from "react";
import { ChevronLeft, Calendar, PiggyBank, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck, Tag, ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";
import { AppData } from "../types";
import { calculateMonthAnalysis, calculateMonthStats } from "../utils/calculations";
import { format, parseISO } from "date-fns";

interface MonthlyAnalysisProps {
  data: AppData;
  activeMonthKey: string;
  onClose: () => void;
}

export default function MonthlyAnalysis({ data, activeMonthKey, onClose }: MonthlyAnalysisProps) {
  const [selectedMonth, setSelectedMonth] = useState(activeMonthKey);

  const availableMonths = Object.keys(data.months).sort((a, b) => b.localeCompare(a));
  if (!availableMonths.includes(selectedMonth)) {
    availableMonths.unshift(selectedMonth);
  }

  const analysis = calculateMonthAnalysis(data, selectedMonth);
  const monthData = data.months[selectedMonth] || { monthlyPocketMoney: 0, categoryBudgets: {}, expenses: [] };
  const stats = calculateMonthStats(monthData, selectedMonth);

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto">
      <div className="max-w-2xl mx-auto min-h-screen pb-16">
        {/* Sticky Header */}
        <header className="sticky top-0 bg-emerald-600 text-white p-5 sm:p-6 flex items-center justify-between shadow-lg z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Monthly Deep Dive</h1>
              <p className="text-emerald-100 text-xs mt-0.5">Comprehensive review & savings breakdown</p>
            </div>
          </div>

          {/* Month Dropdown Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl border border-emerald-500/40 focus:outline-none"
          >
            {availableMonths.map(m => (
              <option key={m} value={m} className="bg-slate-800 text-white">
                {format(parseISO(`${m}-01`), "MMM yyyy")}
              </option>
            ))}
          </select>
        </header>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Main Key Figures Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider mb-1">Pocket Money</span>
              <p className="text-xl font-black text-slate-800">₹{analysis.allowance.toLocaleString()}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">Allocated: ₹{analysis.totalAllocated.toLocaleString()}</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider mb-1">Total Spent</span>
              <p className="text-xl font-black text-slate-800">₹{analysis.totalSpent.toLocaleString()}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">{analysis.expenseCount} expenses</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider mb-1">Real Remaining Cash</span>
              <p className={`text-xl font-black ${analysis.remaining >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                ₹{analysis.remaining.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Unallocated: ₹{analysis.unallocated.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Savings Performance Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-3xl text-white shadow-lg shadow-emerald-900/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <PiggyBank size={22} className="text-white" />
                </div>
                <div>
                  <span className="text-emerald-100 text-xs font-semibold uppercase tracking-wider block">Month Savings</span>
                  <h3 className="text-2xl font-black">₹{analysis.savings.toLocaleString()}</h3>
                </div>
              </div>
              <div className="text-right">
                <span className="text-emerald-100 text-xs font-semibold block">Savings Rate</span>
                <span className="text-xl font-black bg-white/20 px-3 py-1 rounded-xl inline-block mt-0.5">
                  {analysis.savingsRate}%
                </span>
              </div>
            </div>

            {analysis.comparisonWithPrevMonth && (
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2 text-xs text-emerald-100 font-medium">
                <span>{analysis.comparisonWithPrevMonth.text}</span>
              </div>
            )}
          </div>

          {/* Fixed vs Variable Spending Breakdown */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers size={16} className="text-emerald-600" /> Fixed vs Variable Spending
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Variable Card */}
              <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-purple-700 tracking-wider">Variable (Food, Travel, Fun)</span>
                  <span className="text-xs font-black text-purple-800">₹{stats.variableSpent.toLocaleString()}</span>
                </div>
                <div className="w-full bg-purple-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-purple-600 h-full rounded-full transition-all"
                    style={{ width: `${stats.variableBudget > 0 ? Math.min(100, (stats.variableSpent / stats.variableBudget) * 100) : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-purple-600">
                  <span>Budget: ₹{stats.variableBudget.toLocaleString()}</span>
                  <span>{stats.variableBudget > 0 ? `${Math.round((stats.variableSpent / stats.variableBudget) * 100)}% used` : 'No budget set'}</span>
                </div>
              </div>

              {/* Fixed Card */}
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-blue-700 tracking-wider">Fixed (Rent, Bills, WiFi)</span>
                  <span className="text-xs font-black text-blue-800">₹{stats.fixedSpent.toLocaleString()}</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${stats.fixedBudget > 0 ? Math.min(100, (stats.fixedSpent / stats.fixedBudget) * 100) : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-blue-600">
                  <span>Budget: ₹{stats.fixedBudget.toLocaleString()}</span>
                  <span>{stats.fixedBudget > 0 ? `${Math.round((stats.fixedSpent / stats.fixedBudget) * 100)}% used` : 'No budget set'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Overspent Categories Section */}
          {analysis.overspentCategories.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-500" /> Overspent Categories ({analysis.overspentCategories.length})
              </h3>
              <div className="space-y-2">
                {analysis.overspentCategories.map((c) => (
                  <div key={c.name} className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-rose-900">{c.name}</p>
                      <p className="text-[11px] text-rose-600">Budget: ₹{c.budget.toLocaleString()} • Spent: ₹{c.spent.toLocaleString()}</p>
                    </div>
                    <span className="font-black text-sm text-rose-700">+₹{c.overspent.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Pace & Top Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider mb-1">Daily Burn Rate</span>
              <p className="text-lg font-black text-slate-800">₹{analysis.averageDailySpending.toLocaleString()}</p>
              <span className="text-[11px] text-slate-400 mt-0.5 block">average spent per day</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider mb-1">Highest Spend Category</span>
              <p className="text-lg font-black text-emerald-700 truncate">
                {analysis.highestCategory ? analysis.highestCategory.name : "None"}
              </p>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                {analysis.highestCategory ? `₹${analysis.highestCategory.amount.toLocaleString()}` : "₹0 spent"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
