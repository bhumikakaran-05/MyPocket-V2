import { useState, FormEvent } from "react";
import { X, Save, Calendar, Tag, FileText, Store, IndianRupee } from "lucide-react";
import { MonthData, Expense } from "../types";
import { format, parseISO } from "date-fns";

interface EditExpenseModalProps {
  expense: Expense;
  monthData: MonthData;
  onSave: (updatedExpense: Expense) => void;
  onClose: () => void;
}

export default function EditExpenseModal({ expense, monthData, onSave, onClose }: EditExpenseModalProps) {
  const categories = Object.keys(monthData.categoryBudgets || {});
  // Ensure the expense's current category is present in the list even if deleted from budgets
  if (expense.category && !categories.includes(expense.category)) {
    categories.unshift(expense.category);
  }

  const [amount, setAmount] = useState(expense.amount.toString());
  const [category, setCategory] = useState(expense.category || categories[0] || "");
  const [merchant, setMerchant] = useState(expense.merchant || "");
  const [note, setNote] = useState(expense.note || "");
  const [date, setDate] = useState(() => {
    try {
      return format(parseISO(expense.date), "yyyy-MM-dd");
    } catch {
      return format(new Date(), "yyyy-MM-dd");
    }
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("Please enter a valid amount greater than ₹0.");
      return;
    }

    if (!category) {
      setErrorMessage("Please select a category.");
      return;
    }

    // Preserve original timestamp time if same day, or use current time
    let dateObj = new Date(date);
    try {
      const originalDate = parseISO(expense.date);
      dateObj.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds());
    } catch {
      const now = new Date();
      dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    }

    const updated: Expense = {
      ...expense,
      amount: parsedAmount,
      category,
      merchant: merchant.trim() || undefined,
      note: note.trim() || undefined,
      date: dateObj.toISOString()
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-emerald-600 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">Edit Expense</h2>
            <p className="text-emerald-100 text-xs mt-0.5">Update transaction details</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors active:scale-95"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee size={14} /> Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-2xl font-bold text-slate-400 select-none">₹</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0.01"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-2xl sm:text-3xl font-black pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 tracking-tight"
              />
            </div>
          </div>

          {/* Category selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Tag size={14} /> Category
            </label>
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

          {/* Merchant / Vendor */}
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

          {/* Note */}
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
              <Save size={18} /> Update Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
