import { useState } from "react";
import { ChevronLeft, Calendar, TrendingUp, TrendingDown, Clock, Tag, ShoppingBag, ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { MonthData, WeekStats } from "../types";
import { calculateWeekStats } from "../utils/calculations";
import { format, parseISO } from "date-fns";

interface WeeklyAnalysisProps {
  monthData: MonthData;
  onClose: () => void;
}

export default function WeeklyAnalysis({ monthData, onClose }: WeeklyAnalysisProps) {
  const weekStats: WeekStats = calculateWeekStats(monthData, new Date());

  const maxDaily = Math.max(...weekStats.dailySpending.map(d => d.amount), 100);

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
              <h1 className="text-xl font-bold">Weekly Analysis</h1>
              <p className="text-emerald-100 text-xs mt-0.5">Current week spending pace & trend</p>
            </div>
          </div>
          <div className="bg-emerald-700/60 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/30">
            <Calendar size={14} />
            <span>This Week</span>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Status Headline Banner */}
          <div className={`p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 ${
            weekStats.statusType === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : weekStats.statusType === "neutral"
              ? "bg-slate-100 border-slate-200 text-slate-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}>
            {weekStats.statusType === "warning" ? (
              <AlertCircle size={24} className="text-amber-600 shrink-0" />
            ) : weekStats.statusType === "neutral" ? (
              <Clock size={24} className="text-slate-500 shrink-0" />
            ) : (
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
            )}
            <div>
              <h3 className="font-bold text-sm leading-tight">{weekStats.statusText}</h3>
              <p className="text-xs opacity-85 mt-0.5">
                {weekStats.daysRemainingInWeek > 0 
                  ? `${weekStats.daysRemainingInWeek} day(s) left in this week's cycle.` 
                  : "Final day of current week cycle."}
              </p>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider mb-1">Spent This Week</span>
              <p className="text-xl font-black text-slate-800">₹{weekStats.weekSpent.toLocaleString()}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">{weekStats.expenseCount} logged items</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider mb-1">Daily Average</span>
              <p className="text-xl font-black text-slate-800">₹{weekStats.dailyAverage.toLocaleString()}</p>
              <span className="text-[11px] text-slate-500 mt-1 block">per active day</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider mb-1">Top Category</span>
              <p className="text-base font-black text-emerald-700 truncate">
                {weekStats.topCategory ? weekStats.topCategory.name : "None"}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {weekStats.topCategory ? `₹${weekStats.topCategory.amount.toLocaleString()}` : "₹0 spent"}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider mb-1">Last Week Comparison</span>
              <div className="flex items-center gap-1 mt-0.5">
                {weekStats.previousWeekSpent > 0 ? (
                  weekStats.weekSpent > weekStats.previousWeekSpent ? (
                    <span className="text-rose-600 font-bold text-sm flex items-center">
                      <ArrowUpRight size={16} /> +₹{(weekStats.weekSpent - weekStats.previousWeekSpent).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-bold text-sm flex items-center">
                      <ArrowDownRight size={16} /> -₹{(weekStats.previousWeekSpent - weekStats.weekSpent).toLocaleString()}
                    </span>
                  )
                ) : (
                  <span className="text-slate-500 text-xs font-medium">No prev data</span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Prev: ₹{weekStats.previousWeekSpent.toLocaleString()}</span>
            </div>
          </div>

          {/* 7-Day Visual Activity Bar Distribution */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Weekly Daily Breakdown</h3>
                <p className="text-xs text-slate-400 mt-0.5">Monday to Sunday spending distribution</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                Peak: ₹{maxDaily.toLocaleString()}
              </span>
            </div>

            {/* Custom SVG / HTML CSS Bar representation */}
            <div className="grid grid-cols-7 gap-2 items-end h-44 pt-6 pb-2 px-1 border-b border-slate-100">
              {weekStats.dailySpending.map((day, idx) => {
                const heightPercent = maxDaily > 0 ? Math.max(4, Math.round((day.amount / maxDaily) * 100)) : 4;
                return (
                  <div key={idx} className="flex flex-col items-center h-full justify-end group">
                    <span className="text-[10px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      ₹{day.amount > 0 ? day.amount : 0}
                    </span>
                    <div className="w-full max-w-[28px] bg-slate-100 rounded-t-lg relative flex items-end justify-center overflow-hidden h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          day.isToday
                            ? "bg-emerald-600 shadow-sm"
                            : day.amount > 0
                            ? "bg-emerald-400"
                            : "bg-slate-200/60"
                        }`}
                      />
                    </div>
                    <span className={`text-[11px] mt-2 font-bold ${day.isToday ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {day.day}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Past Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
