import { useState, FormEvent } from "react";
import { X, Plus, Calendar, Tag, FileText, Store, IndianRupee } from "lucide-react";
import { MonthData, Expense } from "../types";
import { format } from "date-fns";

interface AddExpenseProps {
  monthData: MonthData;
  onAdd: (expense: Expense) => void;
  onClose: () => void;
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

export default function AddExpense({ monthData, onAdd, onClose }: AddExpenseProps) {
  const categories = Object.keys(monthData.categoryBudgets || {});
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0] || "Food");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Calculate remaining budget in selected category
  const catBudget = monthData.categoryBudgets?.[category] || 0;
  const catSpent = (monthData.expenses || [])
    .filter(e => e.category === category)
    .reduce((a, b) => a + Number(b.amount), 0);
  const catRemaining = catBudget - catSpent;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a valid amount greater than 0");
      return;
    }

    if (!category) {
      alert("Please select a category");
      return;
    }

    // Use current time combined with selected date
    const dateObj = new Date(date);
    const now = new Date();
    dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      amount: parsedAmount,
      category,
      merchant: merchant.trim() || undefined,
      note: note.trim() || undefined,
      date: dateObj.toISOString()
    };

    onAdd(newExpense);
    onClose();
  };

  const handleQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-emerald-600 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">Add Expense</h2>
            <p className="text-emerald-100 text-xs mt-0.5">Quick log spending in seconds</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors active:scale-95"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee size={14} /> Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-2xl font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.5"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-3xl font-black pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            {/* Quick add chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAmount(val)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition-colors"
                >
                  +{val}
                </button>
              ))}
              {amount && (
                <button
                  type="button"
                  onClick={() => setAmount("")}
                  className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-100"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category selection */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Tag size={14} /> Category
              </label>
              {catBudget > 0 && (
                <span className={`text-[11px] font-semibold ${catRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {catRemaining >= 0 ? `₹${catRemaining.toLocaleString()} budget left` : `Over by ₹${Math.abs(catRemaining).toLocaleString()}`}
                </span>
              )}
            </div>
            
            {/* Quick Category Chips */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    category === c
                      ? "bg-emerald-600 text-white shadow-xs scale-102"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Merchant / Vendor (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Store size={14} /> Paid To / Merchant <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Canteen, Swiggy, Amazon"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800"
            />
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={14} /> Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800 font-medium"
            />
          </div>

          {/* Note (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} /> Note <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Lunch with friends"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-base hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus size={18} /> Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
