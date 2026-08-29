import { AlertCircle, AlertTriangle, CheckCircle2, Lightbulb, Sparkles, ArrowRight } from "lucide-react";
import { SmartInsight } from "../types";

interface SmartInsightsSectionProps {
  insights: SmartInsight[];
  onActionClick?: (actionType: string) => void;
}

export default function SmartInsightsSection({ insights, onActionClick }: SmartInsightsSectionProps) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Lightbulb size={14} className="text-amber-500" /> Smart Insights & Alerts
        </h3>
        <span className="text-[11px] text-slate-400 font-medium">{insights.length} active</span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {insights.map((insight) => {
          let bgClass = "bg-slate-50 border-slate-200 text-slate-700";
          let icon = <Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5" />;

          if (insight.type === "warning") {
            bgClass = "bg-rose-50 border-rose-200 text-rose-800";
            icon = <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />;
          } else if (insight.type === "success") {
            bgClass = "bg-emerald-50 border-emerald-200 text-emerald-800";
            icon = <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />;
          } else if (insight.type === "tip") {
            bgClass = "bg-teal-50/80 border-teal-200 text-teal-900";
            icon = <Sparkles size={18} className="text-teal-600 shrink-0 mt-0.5" />;
          } else if (insight.type === "info") {
            bgClass = "bg-blue-50 border-blue-200 text-blue-800";
            icon = <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />;
          }

          return (
            <div
              key={insight.id}
              className={`p-3.5 rounded-2xl border ${bgClass} shadow-xs flex items-start justify-between gap-3 transition-all`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {icon}
                <div>
                  <h4 className="text-xs font-bold leading-tight">{insight.title}</h4>
                  <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{insight.message}</p>
                </div>
              </div>

              {insight.actionText && onActionClick && (
                <button
                  onClick={() => onActionClick(insight.actionText || "")}
                  className="shrink-0 text-[11px] font-bold underline flex items-center gap-0.5 mt-0.5 hover:opacity-80 transition-opacity"
                >
                  <span>{insight.actionText}</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
