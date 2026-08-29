import { format, subMonths, parseISO, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface MonthSelectorProps {
  currentMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
}

export default function MonthSelector({ currentMonth, onMonthChange }: MonthSelectorProps) {
  const date = parseISO(`${currentMonth}-01`);

  const handlePrev = () => {
    const prev = subMonths(date, 1);
    onMonthChange(format(prev, "yyyy-MM"));
  };

  const handleNext = () => {
    const next = subMonths(date, -1);
    onMonthChange(format(next, "yyyy-MM"));
  };

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-emerald-50 mb-6">
      <button 
        onClick={handlePrev}
        className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-emerald-600"
      >
        <ChevronLeft size={24} />
      </button>
      
      <div className="flex items-center gap-2">
        <Calendar size={20} className="text-emerald-500" />
        <span className="text-lg font-semibold text-slate-800">
          {format(date, "MMMM yyyy")}
        </span>
      </div>

      <button 
        onClick={handleNext}
        className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-emerald-600"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
}
