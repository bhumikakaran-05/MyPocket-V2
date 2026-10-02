import { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Settings, 
  BarChart3, 
  LogIn, 
  LogOut, 
  Cloud, 
  User as UserIcon,
  RefreshCw,
  Sparkles,
  Edit3,
  Receipt,
  Sliders,
  ArrowRight
} from "lucide-react";
import { AppData, MonthData, Expense } from "./types";
import { getInitialData, saveData, getMonthData, updateMonthData, clearAllData } from "./storage/storage";
import { calculateMonthStats, getProgressBarColor, getProgressBarTextColor, generateSmartInsights } from "./utils/calculations";
import MonthSelector from "./components/MonthSelector";
import AddExpense from "./components/AddExpense";
import EditExpenseModal from "./components/EditExpenseModal";
import CategoryManager from "./components/CategoryManager";
import PocketMoneyModal from "./components/PocketMoneyModal";
import ResetConfirmationModal from "./components/ResetConfirmationModal";
import ExpenseHistory from "./components/ExpenseHistory";
import HomeScreen from "./components/HomeScreen";
import AnalysisView from "./components/AnalysisView";
import ProfileView from "./components/ProfileView";
import BottomNavBar, { NavTab } from "./components/BottomNavBar";
import AuthModal from "./components/AuthModal";
import MigrationModal from "./components/MigrationModal";
import { useAuth } from "./context/AuthContext";
import { 
  subscribeToUserAppData, 
  saveMonthBudget, 
  addExpense as addExpenseToCloud, 
  updateExpense as updateExpenseInCloud,
  deleteExpense as deleteExpenseFromCloud,
  reassignCategoryExpenses,
  resetUserDataInFirestore,
  hasCloudData
} from "./firebase/firestoreService";
import { format, parseISO } from "date-fns";

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  
  const [data, setData] = useState<AppData>(getInitialData);
  const [activeMonthKey, setActiveMonthKey] = useState<string>(() => format(new Date(), "yyyy-MM"));
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
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
          newMonthData.categoryTypes,
          newMonthData.archivedCategories
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
          currentMonthData.categoryTypes,
          currentMonthData.archivedCategories
        );
        await addExpenseToCloud(user.uid, activeMonthKey, expense);
      } catch (err: any) {
        setCloudError(err.message);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleEditExpense = async (updatedExpense: Expense) => {
    const updatedExpenses = (currentMonthData.expenses || []).map(e => 
      e.id === updatedExpense.id ? updatedExpense : e
    );
    const updatedMonth = {
      ...currentMonthData,
      expenses: updatedExpenses
    };
    
    // Optimistic local update
    setData(prev => updateMonthData(prev, activeMonthKey, updatedMonth));

    // Cloud update if logged in
    if (user) {
      try {
        setIsSyncing(true);
        await updateExpenseInCloud(user.uid, activeMonthKey, updatedExpense);
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

  const handleReassignExpenses = async (fromCategory: string, toCategory: string) => {
    const updatedExpenses = (currentMonthData.expenses || []).map(e => 
      e.category === fromCategory ? { ...e, category: toCategory } : e
    );
    const newBudgets = { ...currentMonthData.categoryBudgets };
    delete newBudgets[fromCategory];
    const newTypes = { ...(currentMonthData.categoryTypes || {}) };
    delete newTypes[fromCategory];

    const updatedMonth: MonthData = {
      ...currentMonthData,
      expenses: updatedExpenses,
      categoryBudgets: newBudgets,
      categoryTypes: newTypes
    };

    // Optimistic local update
    setData(prev => updateMonthData(prev, activeMonthKey, updatedMonth));

    // Cloud update if logged in
    if (user) {
      try {
        setIsSyncing(true);
        await reassignCategoryExpenses(user.uid, activeMonthKey, fromCategory, toCategory);
        await saveMonthBudget(
          user.uid,
          activeMonthKey,
          updatedMonth.monthlyPocketMoney,
          updatedMonth.categoryBudgets,
          updatedMonth.categoryTypes,
          updatedMonth.archivedCategories
        );
      } catch (err: any) {
        setCloudError(err.message);
      } finally {
        setIsSyncing(false);
      }
    }
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
      setActiveTab("budget");
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

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5">
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
                        setActiveTab("profile");
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                      <UserIcon size={14} /> Profile & Settings
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 mt-1 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border-t border-slate-100"
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

      {/* Cloud Sync Error Banner */}
      {cloudError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-800">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <span>{cloudError}</span>
            <button onClick={() => setCloudError(null)} className="underline font-bold ml-2">Dismiss</button>
          </div>
        </div>
      )}

      {/* Main Body per Active Tab */}
      <main className="max-w-2xl mx-auto p-4 sm:p-5 space-y-4">
        {/* ==================== HOME TAB ==================== */}
        {activeTab === "home" && (
          <HomeScreen
            monthData={currentMonthData}
            stats={stats}
            activeMonthKey={activeMonthKey}
            onMonthChange={setActiveMonthKey}
            onOpenPocketMoney={() => setIsPocketMoneyModalOpen(true)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* ==================== EXPENSES TAB (Dedicated Full Transaction History) ==================== */}
        {activeTab === "expenses" && (
          <div className="space-y-4">
            <MonthSelector 
              currentMonth={activeMonthKey} 
              onMonthChange={setActiveMonthKey} 
            />

            <ExpenseHistory
              expenses={currentMonthData.expenses || []}
              categories={Object.keys(currentMonthData.categoryBudgets || {})}
              activeMonthKey={activeMonthKey}
              onMonthChange={setActiveMonthKey}
              onDeleteExpense={handleDeleteExpense}
              onEditExpense={(exp) => setEditingExpense(exp)}
              onQuickAdd={() => setIsAddExpenseOpen(true)}
              isStandaloneScreen={true}
            />
          </div>
        )}

        {/* ==================== BUDGET TAB (Category Budgets & Planner) ==================== */}
        {activeTab === "budget" && (
          <div className="space-y-4">
            <MonthSelector 
              currentMonth={activeMonthKey} 
              onMonthChange={setActiveMonthKey} 
            />

            <CategoryManager
              monthData={currentMonthData}
              prevMonthData={prevMonthData}
              prevMonthName={format(parseISO(`${prevMonthKey}-01`), "MMMM")}
              onUpdate={handleUpdateMonth}
              onReassignExpenses={handleReassignExpenses}
              onClose={() => setActiveTab("home")}
              onResetAll={() => setIsResetConfirmOpen(true)}
              isEmbedded={true}
            />
          </div>
        )}

        {/* ==================== ANALYSIS TAB ==================== */}
        {activeTab === "analysis" && (
          <div className="space-y-4">
            <MonthSelector 
              currentMonth={activeMonthKey} 
              onMonthChange={setActiveMonthKey} 
            />

            <AnalysisView
              data={data}
              monthData={currentMonthData}
              activeMonthKey={activeMonthKey}
              stats={stats}
              smartInsights={smartInsights}
              prevMonthData={prevMonthData}
              prevMonthName={format(parseISO(`${prevMonthKey}-01`), "MMMM")}
              onActionClick={handleInsightAction}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          </div>
        )}

        {/* ==================== PROFILE TAB ==================== */}
        {activeTab === "profile" && (
          <ProfileView
            user={user}
            onOpenAuth={openAuth}
            onLogout={logout}
            onResetAll={() => setIsResetConfirmOpen(true)}
            onOpenMigration={() => setIsMigrationModalOpen(true)}
            hasLocalDataToMigrate={Boolean(
              getInitialData() && 
              getInitialData().months && 
              Object.keys(getInitialData().months).length > 0
            )}
          />
        )}
      </main>

      {/* Floating Action Button for Quick Add Expense */}
      <div className="fixed bottom-20 right-5 z-40">
        <button
          onClick={() => setIsAddExpenseOpen(true)}
          className="p-3.5 sm:p-4 bg-emerald-600 text-white rounded-full shadow-xl shadow-emerald-700/30 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center group"
          title="Add Expense"
        >
          <Plus size={26} className="group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        expenseCount={(currentMonthData.expenses || []).length}
      />

      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <AddExpense
          monthData={currentMonthData}
          onAdd={handleAddExpense}
          onClose={() => setIsAddExpenseOpen(false)}
        />
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          monthData={currentMonthData}
          onSave={handleEditExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}

      {/* Pocket Money Allowance Modal */}
      {isPocketMoneyModalOpen && (
        <PocketMoneyModal
          currentAmount={currentMonthData.monthlyPocketMoney || 0}
          totalAllocated={stats.totalAllocated}
          onSave={handleSavePocketMoney}
          onClose={() => setIsPocketMoneyModalOpen(false)}
        />
      )}

      {/* Category Manager Modal (when opened from home header or quick action) */}
      {isCategoryManagerOpen && (
        <CategoryManager
          monthData={currentMonthData}
          prevMonthData={prevMonthData}
          prevMonthName={format(parseISO(`${prevMonthKey}-01`), "MMMM")}
          onUpdate={handleUpdateMonth}
          onReassignExpenses={handleReassignExpenses}
          onClose={() => setIsCategoryManagerOpen(false)}
          onResetAll={() => setIsResetConfirmOpen(true)}
        />
      )}

      {/* Reset Confirmation Modal */}
      <ResetConfirmationModal
        isOpen={isResetConfirmOpen}
        onConfirm={handleResetAll}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {/* Migration Modal */}
      {user && (
        <MigrationModal
          isOpen={isMigrationModalOpen}
          userId={user.uid}
          localData={getInitialData()}
          onSuccess={() => {
            setIsMigrationModalOpen(false);
          }}
          onDismiss={() => setIsMigrationModalOpen(false)}
        />
      )}
    </div>
  );
}
