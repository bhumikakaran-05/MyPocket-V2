import { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Settings, 
  BarChart3, 
  CalendarDays, 
  PieChart, 
  Edit3, 
  Sparkles, 
  LogIn, 
  LogOut, 
  Cloud, 
  CloudCheck,
  User as UserIcon,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { AppData, MonthData, Expense } from "./types";
import { getInitialData, saveData, getMonthData, updateMonthData, clearAllData } from "./storage/storage";
import { calculateMonthStats, getProgressBarColor, getProgressBarTextColor, generateSmartInsights } from "./utils/calculations";
import MonthSelector from "./components/MonthSelector";
import AddExpense from "./components/AddExpense";
import CategoryManager from "./components/CategoryManager";
import YearSummary from "./components/YearSummary";
import WeeklyAnalysis from "./components/WeeklyAnalysis";
import MonthlyAnalysis from "./components/MonthlyAnalysis";
import PocketMoneyModal from "./components/PocketMoneyModal";
import ResetConfirmationModal from "./components/ResetConfirmationModal";
import SmartInsightsSection from "./components/SmartInsightsSection";
import ExpenseHistory from "./components/ExpenseHistory";
import AuthModal from "./components/AuthModal";
import MigrationModal from "./components/MigrationModal";
import { useAuth } from "./context/AuthContext";
import { 
  subscribeToUserAppData, 
  saveMonthBudget, 
  addExpense as addExpenseToCloud, 
  deleteExpense as deleteExpenseFromCloud,
  resetUserDataInFirestore,
  hasCloudData
} from "./firebase/firestoreService";
import { format } from "date-fns";

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  
  const [data, setData] = useState<AppData>(getInitialData);
  const [activeMonthKey, setActiveMonthKey] = useState<string>(() => format(new Date(), "yyyy-MM"));
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isYearSummaryOpen, setIsYearSummaryOpen] = useState(false);
  const [isWeeklyAnalysisOpen, setIsWeeklyAnalysisOpen] = useState(false);
  const [isMonthlyAnalysisOpen, setIsMonthlyAnalysisOpen] = useState(false);
  const [isPocketMoneyModalOpen, setIsPocketMoneyModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  
  // Auth & Migration Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login");
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const hasCheckedMigrationRef = useRef(false);

  // Real-time Firestore subscription when user is authenticated
  useEffect(() => {
    if (!user) {
      // Offline / guest mode: load from localStorage
      setData(getInitialData());
      hasCheckedMigrationRef.current = false;
      return;
    }

    setIsSyncing(true);
    setCloudError(null);

    // Subscribe to real-time updates for user's isolated Firestore subcollections
    const unsubscribe = subscribeToUserAppData(
      user.uid,
      (cloudData) => {
        setData(cloudData);
        setIsSyncing(false);
      },
      (err: any) => {
        console.error("Firestore sync error", err);
        setCloudError(err.message || "Failed to sync with cloud");
        setIsSyncing(false);
      }
    );

    // Check for potential local data to migrate
    if (!hasCheckedMigrationRef.current) {
      hasCheckedMigrationRef.current = true;
      const localData = getInitialData();
      const hasLocalContent = localData && localData.months && Object.keys(localData.months).length > 0;

      if (hasLocalContent) {
        hasCloudData(user.uid).then((hasCloud) => {
          if (!hasCloud) {
            setIsMigrationModalOpen(true);
          }
        });
      }
    }

    return () => unsubscribe();
  }, [user]);

  // Persist locally if user is not signed in
  useEffect(() => {
    if (!user) {
      saveData(data);
    }
  }, [data, user]);

  const currentMonthData: MonthData = getMonthData(data, activeMonthKey);
  const stats = calculateMonthStats(currentMonthData, activeMonthKey);
  
  // Previous month data for comparison insights
  const prevMonthKeyParts = activeMonthKey.split("-");
  const prevYear = parseInt(prevMonthKeyParts[0]);
  const prevMonth = parseInt(prevMonthKeyParts[1]);
  const prevMonthKey = prevMonth === 1 
    ? `${prevYear - 1}-12` 
    : `${prevYear}-${String(prevMonth - 1).padStart(2, '0')}`;
  const prevMonthData = data.months[prevMonthKey];

  const smartInsights = generateSmartInsights(currentMonthData, stats, prevMonthData);

  const handleUpdateMonth = async (newMonthData: MonthData) => {
    // Optimistic local update
    setData(prev => updateMonthData(prev, activeMonthKey, newMonthData));

    // Cloud write if logged in
    if (user) {
      try {
        setIsSyncing(true);
        await saveMonthBudget(
          user.uid,
          activeMonthKey,
          newMonthData.monthlyPocketMoney,
          newMonthData.categoryBudgets,
          newMonthData.categoryTypes
        );
      } catch (err: any) {
        setCloudError(err.message);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleAddExpense = async (expense: Expense) => {
    const updatedExpenses = [expense, ...(currentMonthData.expenses || [])];
    const updatedMonth = {
      ...currentMonthData,
      expenses: updatedExpenses
    };
    
    // Optimistic local update
    setData(prev => updateMonthData(prev, activeMonthKey, updatedMonth));

    // Cloud write if logged in
    if (user) {
      try {
        setIsSyncing(true);
        // Ensure month doc exists first
        await saveMonthBudget(
          user.uid,
          activeMonthKey,
          currentMonthData.monthlyPocketMoney,
          currentMonthData.categoryBudgets,
          currentMonthData.categoryTypes
        );
        await addExpenseToCloud(user.uid, activeMonthKey, expense);
      } catch (err: any) {
        setCloudError(err.message);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const updatedExpenses = (currentMonthData.expenses || []).filter(e => e.id !== id);
    const updatedMonth = {
      ...currentMonthData,
      expenses: updatedExpenses
    };

    // Optimistic local update
    setData(prev => updateMonthData(prev, activeMonthKey, updatedMonth));

    // Cloud write if logged in
    if (user) {
      try {
        setIsSyncing(true);
        await deleteExpenseFromCloud(user.uid, activeMonthKey, id);
      } catch (err: any) {
        setCloudError(err.message);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleSavePocketMoney = async (amount: number) => {
    const updatedMonth = {
      ...currentMonthData,
      monthlyPocketMoney: amount
    };
    await handleUpdateMonth(updatedMonth);
  };

  const handleResetAll = async () => {
    if (user) {
      try {
        setIsSyncing(true);
        await resetUserDataInFirestore(user.uid);
      } catch (err: any) {
        setCloudError(err.message);
      } finally {
        setIsSyncing(false);
      }
    }
    const fresh = clearAllData();
    setData(fresh);
    setIsResetConfirmOpen(false);
    setIsCategoryManagerOpen(false);
  };

  const handleInsightAction = (actionText: string) => {
    if (actionText.includes("Allowance") || actionText.includes("Pocket")) {
      setIsPocketMoneyModalOpen(true);
    } else if (actionText.includes("Categories") || actionText.includes("Budgets") || actionText.includes("Adjust")) {
      setIsCategoryManagerOpen(true);
    }
  };

  const openAuth = (mode: "login" | "signup") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
    setShowUserMenu(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-28">
      {/* Top Header */}
      <header className="sticky top-0 bg-emerald-600 text-white shadow-md z-30 px-4 py-3 sm:py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-xs font-black text-lg shadow-xs">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight leading-tight">MyPocket</h1>
                {user && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-emerald-50">
                    <Cloud size={10} /> Cloud
                  </span>
                )}
              </div>
              <p className="text-[10px] text-emerald-100 font-medium">Daily Pocket-Money Planner</p>
            </div>
          </div>

          {/* Action controls & Auth Menu */}
          <div className="flex items-center gap-1.5">
            {/* Year Summary */}
            <button
              onClick={() => setIsYearSummaryOpen(true)}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white active:scale-95 flex items-center gap-1 text-xs font-bold bg-emerald-700/60 px-2.5"
              title="Year Summary"
            >
              <BarChart3 size={16} />
              <span className="hidden sm:inline">Year</span>
            </button>

            {/* Category Budgets */}
            <button
              onClick={() => setIsCategoryManagerOpen(true)}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white active:scale-95"
              title="Category Budgets"
            >
              <Settings size={20} />
            </button>

            {/* Auth Pill / User Profile */}
            {authLoading ? (
              <div className="w-8 h-8 flex items-center justify-center">
                <RefreshCw size={14} className="animate-spin text-emerald-200" />
              </div>
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 bg-emerald-700/80 hover:bg-emerald-700 rounded-xl border border-emerald-500/40 text-xs font-bold transition-all active:scale-95"
                >
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] uppercase font-black">
                    {user.email ? user.email.charAt(0) : "U"}
                  </div>
                  <span className="hidden md:inline truncate max-w-[100px] text-emerald-50">
                    {user.email?.split("@")[0]}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 top-11 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 p-2 min-w-[200px] z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Signed in as</span>
                      <p className="text-xs font-bold text-slate-800 truncate">{user.email}</p>
                      <div className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1 font-medium">
                        <Cloud size={12} />
                        <span>Firestore Synced</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 mt-1 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut size={14} /> Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuth("login")}
                className="flex items-center gap-1 px-3 py-1.5 bg-white text-emerald-700 rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-50 transition-colors active:scale-95"
              >
                <LogIn size={14} />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Guest Sync Banner if not logged in */}
      {!user && !authLoading && (
        <div className="bg-emerald-50 border-b border-emerald-200/80 px-4 py-2 text-xs">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-emerald-800">
              <Cloud size={15} className="text-emerald-600 shrink-0" />
              <span className="font-medium text-[11px] sm:text-xs">
                You're using local storage. <strong>Log in or Sign up</strong> to sync data to Firebase cloud across all your devices.
              </span>
            </div>
            <button
              onClick={() => openAuth("signup")}
              className="shrink-0 text-[11px] font-bold text-emerald-700 underline hover:text-emerald-900"
            >
              Sign Up Free
            </button>
          </div>
        </div>
      )}

      {/* Cloud Sync Activity / Error Banner */}
      {cloudError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-800">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <span>{cloudError}</span>
            <button onClick={() => setCloudError(null)} className="underline font-bold ml-2">Dismiss</button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-2xl mx-auto p-4 sm:p-5 space-y-4">
        {/* Month Selector */}
        <MonthSelector 
          currentMonth={activeMonthKey} 
          onMonthChange={setActiveMonthKey} 
        />

        {/* Quick Analytical Navigation Pills */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setIsWeeklyAnalysisOpen(true)}
            className="p-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between text-left group active:scale-98"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg group-hover:bg-teal-100 transition-colors">
                <CalendarDays size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Weekly Pace</span>
                <span className="text-[10px] text-slate-400">7-day breakdown</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => setIsMonthlyAnalysisOpen(true)}
            className="p-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between text-left group active:scale-98"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg group-hover:bg-purple-100 transition-colors">
                <PieChart size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">Monthly Analysis</span>
                <span className="text-[10px] text-slate-400">Savings & trends</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Primary Pocket Money Dashboard Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Monthly Allowance
              </span>
              <button
                onClick={() => setIsPocketMoneyModalOpen(true)}
                className="group flex items-center gap-2 text-left mt-0.5 hover:opacity-80 transition-opacity"
              >
                <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                  ₹{stats.totalBudget.toLocaleString()}
                </h2>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                  <Edit3 size={16} />
                </div>
              </button>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Real Remaining
              </span>
              <p className={`text-2xl sm:text-3xl font-black mt-0.5 ${stats.remainingBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                ₹{stats.remainingBalance.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Allocation & Spending Sub-metrics */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Spent</span>
              <span className="text-sm font-black text-slate-800">₹{stats.totalSpent.toLocaleString()}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Allocated</span>
              <span className={`text-sm font-black ${stats.isOverAllocated ? 'text-rose-600' : 'text-emerald-700'}`}>
                ₹{stats.totalAllocated.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unallocated</span>
              <span className={`text-sm font-black ${stats.unallocated < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {stats.unallocated < 0 ? `-₹${Math.abs(stats.unallocated).toLocaleString()}` : `₹${stats.unallocated.toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Allowance Consumed</span>
              <span className={getProgressBarTextColor(stats.spentPercentage)}>
                {Math.round(stats.spentPercentage)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(stats.spentPercentage)}`}
                style={{ width: `${Math.min(100, stats.spentPercentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Signature "Safe to Spend Today" Card */}
        {stats.isCurrentMonth && stats.totalBudget > 0 && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-100 block">
                    Daily Safe Spending
                  </span>
                  <h3 className="text-2xl font-black">
                    ₹{stats.safeToSpendToday.toLocaleString()} <span className="text-xs font-medium text-emerald-100">/ day</span>
                  </h3>
                </div>
              </div>

              <div className="text-right bg-white/15 px-3 py-1.5 rounded-xl border border-white/20">
                <span className="text-xs font-black block">{stats.daysRemaining} days left</span>
                <span className="text-[10px] text-emerald-100">in {format(new Date(), "MMMM")}</span>
              </div>
            </div>
            <p className="text-xs text-emerald-100 pt-1 leading-relaxed">
              Spend up to this amount daily over the remaining days to finish the month safely without exceeding your allowance.
            </p>
          </div>
        )}

        {/* Smart Rule-Based Insights & Alerts */}
        <SmartInsightsSection 
          insights={smartInsights} 
          onActionClick={handleInsightAction} 
        />

        {/* Category Breakdown Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Category Budgets ({stats.categoryStats.length})
            </h3>
            <button
              onClick={() => setIsCategoryManagerOpen(true)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1"
            >
              <Settings size={13} />
              <span>Manage Budgets</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {stats.categoryStats.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl text-center text-slate-400 border border-slate-200">
                <p className="text-sm font-medium">No categories created for this month.</p>
                <button
                  onClick={() => setIsCategoryManagerOpen(true)}
                  className="mt-2 text-xs font-bold text-emerald-600 underline"
                >
                  Create Categories
                </button>
              </div>
            ) : (
              stats.categoryStats.map((cat) => {
                return (
                  <div
                    key={cat.name}
                    className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5 hover:border-emerald-200 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{cat.name}</span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          cat.type === "fixed"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : "bg-purple-50 text-purple-700 border border-purple-100"
                        }`}>
                          {cat.type}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-slate-800">
                          ₹{cat.spent.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 font-medium"> / ₹{cat.budget.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(cat.percentage)}`}
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${cat.remaining >= 0 ? 'text-slate-500' : 'text-rose-600'}`}>
                        {cat.remaining >= 0 
                          ? `₹${cat.remaining.toLocaleString()} left` 
                          : `Overspent by ₹${Math.abs(cat.remaining).toLocaleString()}`}
                      </span>
                      <span className={`font-bold ${getProgressBarTextColor(cat.percentage)}`}>
                        {Math.round(cat.percentage)}% used
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Filterable & Searchable Expense History */}
        <ExpenseHistory
          expenses={currentMonthData.expenses || []}
          categories={Object.keys(currentMonthData.categoryBudgets || {})}
          onDeleteExpense={handleDeleteExpense}
        />
      </main>

      {/* Floating Action Button for Add Expense */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsAddExpenseOpen(true)}
          className="p-4 bg-emerald-600 text-white rounded-full shadow-xl shadow-emerald-700/30 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center group"
          title="Add Expense"
        >
          <Plus size={28} className="group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* Modals */}
      {isAddExpenseOpen && (
        <AddExpense
          monthData={currentMonthData}
          onAdd={handleAddExpense}
          onClose={() => setIsAddExpenseOpen(false)}
        />
      )}

      {isCategoryManagerOpen && (
        <CategoryManager
          monthData={currentMonthData}
          onUpdate={handleUpdateMonth}
          onClose={() => setIsCategoryManagerOpen(false)}
          onResetAll={() => setIsResetConfirmOpen(true)}
        />
      )}

      {isPocketMoneyModalOpen && (
        <PocketMoneyModal
          currentAmount={currentMonthData.monthlyPocketMoney || 0}
          totalAllocated={stats.totalAllocated}
          onSave={handleSavePocketMoney}
          onClose={() => setIsPocketMoneyModalOpen(false)}
        />
      )}

      {isWeeklyAnalysisOpen && (
        <WeeklyAnalysis
          monthData={currentMonthData}
          onClose={() => setIsWeeklyAnalysisOpen(false)}
        />
      )}

      {isMonthlyAnalysisOpen && (
        <MonthlyAnalysis
          data={data}
          activeMonthKey={activeMonthKey}
          onClose={() => setIsMonthlyAnalysisOpen(false)}
        />
      )}

      {isYearSummaryOpen && (
        <YearSummary
          data={data}
          onClose={() => setIsYearSummaryOpen(false)}
        />
      )}

      <ResetConfirmationModal
        isOpen={isResetConfirmOpen}
        onConfirm={handleResetAll}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {user && (
        <MigrationModal
          isOpen={isMigrationModalOpen}
          userId={user.uid}
          localData={getInitialData()}
          onSuccess={(count) => {
            setIsMigrationModalOpen(false);
          }}
          onDismiss={() => setIsMigrationModalOpen(false)}
        />
      )}
    </div>
  );
}
