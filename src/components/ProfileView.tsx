import { User, Cloud, LogIn, LogOut, Trash2, ShieldCheck, Database, Info, Sparkles } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";

interface ProfileViewProps {
  user: FirebaseUser | null;
  onOpenAuth: (mode: "login" | "signup") => void;
  onLogout: () => void;
  onResetAll: () => void;
  onOpenMigration?: () => void;
  hasLocalDataToMigrate?: boolean;
}

export default function ProfileView({
  user,
  onOpenAuth,
  onLogout,
  onResetAll,
  onOpenMigration,
  hasLocalDataToMigrate
}: ProfileViewProps) {
  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Account Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-200">
            {user?.email ? user.email.charAt(0).toUpperCase() : "G"}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-800 truncate">
              {user?.email ? user.email : "Guest Student"}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                user 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                <Cloud size={11} />
                {user ? "Cloud Synced (Firestore)" : "Local Storage (Device only)"}
              </span>
            </div>
          </div>
        </div>

        {user ? (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">UID: {user.uid.slice(0, 10)}...</span>
            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 active:scale-95"
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-xs text-slate-500 leading-relaxed">
              Create a free account or log in to sync your pocket-money budgets and expenses across all your phones and laptops.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onOpenAuth("login")}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all text-center"
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth("signup")}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all text-center shadow-xs"
              >
                Sign Up Free
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cloud Migration Card if applicable */}
      {user && hasLocalDataToMigrate && onOpenMigration && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-md space-y-2">
          <div className="flex items-center gap-2">
            <Database size={18} />
            <h3 className="font-bold text-sm">Local Records Detected</h3>
          </div>
          <p className="text-xs text-emerald-100 leading-relaxed">
            You have saved data from your previous offline sessions in this browser. Upload them to your cloud account to sync everywhere.
          </p>
          <button
            onClick={onOpenMigration}
            className="mt-2 py-2 px-4 bg-white text-emerald-800 font-bold text-xs rounded-xl hover:bg-emerald-50 transition-colors shadow-xs"
          >
            Review & Migrate Data
          </button>
        </div>
      )}

      {/* Preferences & Reset */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Data & Management
        </h3>

        <button
          onClick={onResetAll}
          className="w-full py-3 px-4 rounded-2xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-between transition-colors"
        >
          <span className="flex items-center gap-2">
            <Trash2 size={16} /> Reset All App Data
          </span>
          <span className="text-[10px] text-rose-500">Clears history</span>
        </button>
      </div>

      {/* App Info */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 text-center space-y-1">
        <p className="text-xs font-bold text-slate-700">MyPocket V2</p>
        <p className="text-[11px] text-slate-400">Student Pocket-Money & Daily Expense Planner</p>
      </div>
    </div>
  );
}
