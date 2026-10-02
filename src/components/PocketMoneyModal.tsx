import { useState, FormEvent } from "react";
import { X, Save, IndianRupee, AlertTriangle, CheckCircle2 } from "lucide-react";

interface PocketMoneyModalProps {
  currentAmount: number;
  totalAllocated?: number;
  onSave: (amount: number) => void;
  onClose: () => void;
}

export default function PocketMoneyModal({ currentAmount, totalAllocated = 0, onSave, onClose }: PocketMoneyModalProps) {
  const [amount, setAmount] = useState(currentAmount > 0 ? currentAmount.toString() : "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [acknowledgedOverAllocation, setAcknowledgedOverAllocation] = useState(false);

  const numVal = parseFloat(amount) || 0;
  const isBelowAllocated = totalAllocated > 0 && numVal > 0 && numVal < totalAllocated;
  const diff = totalAllocated - numVal;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setErrorMessage("Please enter a valid amount (₹0 or greater).");
      return;
    }

    if (isBelowAllocated && !acknowledgedOverAllocation) {
      setErrorMessage(`Your total category budgets (₹${totalAllocated.toLocaleString()}) exceed this allowance by ₹${diff.toLocaleString()}. Please confirm below to proceed.`);
      return;
    }

    onSave(parsedAmount);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Set Monthly Allowance</h2>
            <p className="text-emerald-100 text-xs mt-0.5">Your total pocket money for the month</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors active:scale-95">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee size={14} /> Total Pocket Money
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 sm:top-3.5 text-2xl font-bold text-slate-400 select-none">₹</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                required
                autoFocus
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="8000"
                className="w-full text-2xl sm:text-3xl font-black pl-10 pr-4 py-3 sm:py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 tracking-tight"
              />
            </div>
            
            {totalAllocated > 0 && (
              <div className="pt-1 text-xs text-slate-500 flex justify-between">
                <span>Currently Allocated:</span>
                <span className="font-bold text-slate-700">₹{totalAllocated.toLocaleString()}</span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {isBelowAllocated && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-900 text-xs leading-relaxed">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">Allocations exceed new allowance</p>
                  <p className="text-amber-700 mt-0.5">Your category budgets total ₹{totalAllocated.toLocaleString()}, which is ₹{diff.toLocaleString()} higher.</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-amber-200/80 font-bold text-amber-900">
                <input
                  type="checkbox"
                  checked={acknowledgedOverAllocation}
                  onChange={(e) => {
                    setAcknowledgedOverAllocation(e.target.checked);
                    if (e.target.checked) setErrorMessage(null);
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>I understand and want to save anyway</span>
              </label>
            </div>
          )}

          {!isBelowAllocated && numVal >= totalAllocated && totalAllocated > 0 && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-700 text-xs">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Unallocated remainder: ₹{(numVal - totalAllocated).toLocaleString()}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-base hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95"
          >
            <Save size={18} /> Save Allowance
          </button>
        </form>
      </div>
    </div>
  );
}
