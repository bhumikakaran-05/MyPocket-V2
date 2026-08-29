import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AppData } from "../types";
import { ChevronLeft, TrendingUp, TrendingDown, Wallet, PiggyBank, Award, Flame, Tag } from "lucide-react";
import { format, parseISO } from "date-fns";

interface YearSummaryProps {
  data: AppData;
  onClose: () => void;
}

export default function YearSummary({ data, onClose }: YearSummaryProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  const years = Array.from(new Set(Object.keys(data.months).map(m => m.split("-")[0])));
  if (!years.includes(selectedYear)) years.push(selectedYear);
  years.sort((a, b) => b.localeCompare(a));

  const yearMonths = Object.entries(data.months)
    .filter(([key]) => key.startsWith(selectedYear))
    .sort(([a], [b]) => a.localeCompare(b));

  const chartData = yearMonths.map(([key, monthData]) => {
    const spent = (monthData.expenses || []).reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const budget = Number(monthData.monthlyPocketMoney || 0);
    return {
      month: format(parseISO(`${key}-01`), "MMM"),
      spent,
      budget,
      isOverspent: spent > budget
    };
  });

  // Calculate year totals and records
  let bestMonth = { name: "None", savings: 0 };
  let highestSpendMonth = { name: "None", spent: 0 };
  const yearlyCategoryTotals: Record<string, number> = {};

  const yearlyStats = yearMonths.reduce((acc, [key, monthData]) => {
    const budget = Number(monthData.monthlyPocketMoney || 0);
    const spent = (monthData.expenses || []).reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const monthName = format(parseISO(`${key}-01`), "MMMM");

    acc.budget += budget;
    acc.spent += spent;
    
    const diff = budget - spent;
    if (diff > 0) {
      acc.savings += diff;
      if (diff > bestMonth.savings) {
        bestMonth = { name: monthName, savings: diff };
      }
    } else {
      acc.overspent += Math.abs(diff);
    }

    if (spent > highestSpendMonth.spent) {
      highestSpendMonth = { name: monthName, spent };
    }

    // Accumulate category totals
    (monthData.expenses || []).forEach(exp => {
      yearlyCategoryTotals[exp.category] = (yearlyCategoryTotals[exp.category] || 0) + Number(exp.amount);
    });
    
    return acc;
  }, { budget: 0, spent: 0, savings: 0, overspent: 0 });

  const activeMonthsCount = Math.max(1, yearMonths.length);
  const averageMonthlySpend = Math.round(yearlyStats.spent / activeMonthsCount);

  let topYearCategory = { name: "None", amount: 0 };
  Object.entries(yearlyCategoryTotals).forEach(([name, amount]) => {
    if (amount > topYearCategory.amount) {
      topYearCategory = { name, amount };
    }
  });

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto">
      <div className="max-w-2xl mx-auto min-h-screen pb-16">
        {/* Header */}
        <header className="sticky top-0 bg-emerald-600 text-white p-5 sm:p-6 flex items-center justify-between shadow-lg z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Annual Year Summary</h1>
              <p className="text-emerald-100 text-xs mt-0.5">Yearly spending & savings trajectory</p>
            </div>
          </div>

          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl border border-emerald-500/40 focus:outline-none"
          >
            {years.map(y => <option key={y} value={y} className="bg-slate-800 text-white">{y}</option>)}
          </select>
        </header>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Main 4 Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-3xl shadow-xs border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Wallet size={14} /> Total Pocket Money
              </div>
              <p className="text-2xl font-black text-slate-800">₹{yearlyStats.budget.toLocaleString()}</p>
            </div>

            <div className="bg-white p-4 rounded-3xl shadow-xs border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                <TrendingDown size={14} /> Total Spent
              </div>
              <p className="text-2xl font-black text-slate-800">₹{yearlyStats.spent.toLocaleString()}</p>
            </div>

            <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
                <PiggyBank size={14} /> Total Year Savings
              </div>
              <p className="text-2xl font-black text-emerald-700">₹{yearlyStats.savings.toLocaleString()}</p>
            </div>

            <div className="bg-rose-50 p-4 rounded-3xl border border-rose-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-rose-700 text-xs font-bold uppercase tracking-wider mb-1">
                <TrendingUp size={14} /> Total Overspent
              </div>
              <p className="text-2xl font-black text-rose-700">₹{yearlyStats.overspent.toLocaleString()}</p>
            </div>
          </div>

          {/* Highlights & Records */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-1.5 text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">
                <Award size={14} /> Best Savings Month
              </div>
              <p className="text-base font-black text-slate-800">{bestMonth.name}</p>
              <span className="text-xs text-emerald-600 font-semibold mt-0.5 block">
                {bestMonth.savings > 0 ? `+₹${bestMonth.savings.toLocaleString()} saved` : "No savings logged"}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-1.5 text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">
                <Flame size={14} /> Peak Spend Month
              </div>
              <p className="text-base font-black text-slate-800">{highestSpendMonth.name}</p>
              <span className="text-xs text-rose-600 font-semibold mt-0.5 block">
                {highestSpendMonth.spent > 0 ? `₹${highestSpendMonth.spent.toLocaleString()} spent` : "₹0 spent"}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-1.5 text-purple-600 text-xs font-bold uppercase tracking-wider mb-1">
                <Tag size={14} /> Top Year Category
              </div>
              <p className="text-base font-black text-slate-800 truncate">{topYearCategory.name}</p>
              <span className="text-xs text-purple-600 font-semibold mt-0.5 block">
                {topYearCategory.amount > 0 ? `₹${topYearCategory.amount.toLocaleString()} total` : "₹0 spent"}
              </span>
            </div>
          </div>

          {/* Monthly Spending Chart */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-800">Monthly Spending Comparison</h3>
                <p className="text-xs text-slate-400 mt-0.5">Average: ₹{averageMonthlySpend.toLocaleString()}/month</p>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%" minHeight={280}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="spent" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isOverspent ? '#f43f5e' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 flex justify-center gap-6 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Within Budget</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-slate-600">Over Allowance</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
