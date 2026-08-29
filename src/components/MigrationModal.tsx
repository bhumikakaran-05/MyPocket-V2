import { useState } from "react";
import { CloudUpload, CheckCircle2, AlertCircle, X, ShieldCheck } from "lucide-react";
import { AppData } from "../types";
import { migrateLocalDataToFirestore } from "../firebase/firestoreService";

interface MigrationModalProps {
  isOpen: boolean;
  userId: string;
  localData: AppData;
  onSuccess: (count: number) => void;
  onDismiss: () => void;
}

export default function MigrationModal({
  isOpen,
  userId,
  localData,
  onSuccess,
  onDismiss
}: MigrationModalProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalMonths = Object.keys(localData.months || {}).length;
  const totalExpenses = Object.values(localData.months || {}).reduce(
    (acc, m) => acc + (m.expenses?.length || 0),
    0
  );

  const handleMigrate = async () => {
    setIsMigrating(true);
    setError(null);
    try {
      const count = await migrateLocalDataToFirestore(userId, localData);
      onSuccess(count);
    } catch (e: any) {
      setError(e.message || "Failed to migrate data to cloud.");
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <CloudUpload size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Migrate Local Data</h2>
              <p className="text-emerald-100 text-xs mt-0.5">Found saved data on this device</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors active:scale-95 text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            We discovered <strong>{totalMonths} month(s)</strong> and <strong>{totalExpenses} expense(s)</strong> stored locally in this browser.
          </p>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Safe & Non-Destructive</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-normal">
              Migrating will safely upload your allowances, custom category budgets, and expenses to your private Firebase Firestore cloud.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isMigrating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CloudUpload size={14} /> Migrate to My Account
                </>
              )}
            </button>
            <button
              onClick={onDismiss}
              disabled={isMigrating}
              className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
