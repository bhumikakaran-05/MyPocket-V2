import { Home, Receipt, Sliders, BarChart3, User } from "lucide-react";

export type NavTab = "home" | "expenses" | "budget" | "analysis" | "profile";

interface BottomNavBarProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  expenseCount?: number;
}

export default function BottomNavBar({ activeTab, onChangeTab, expenseCount = 0 }: BottomNavBarProps) {
  const tabs = [
    { id: "home" as NavTab, label: "Home", icon: Home },
    { id: "expenses" as NavTab, label: "Expenses", icon: Receipt, badge: expenseCount > 0 ? expenseCount : undefined },
    { id: "budget" as NavTab, label: "Budget", icon: Sliders },
    { id: "analysis" as NavTab, label: "Analysis", icon: BarChart3 },
    { id: "profile" as NavTab, label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1.5 sm:py-2">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-2xl transition-all relative active:scale-95 ${
                isActive ? "text-emerald-700 font-bold" : "text-slate-400 hover:text-slate-600 font-medium"
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${
                isActive ? "bg-emerald-50 text-emerald-700" : ""
              }`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <span className={`text-[10px] tracking-tight ${
                isActive ? "text-emerald-800 font-extrabold" : "text-slate-500 font-medium"
              }`}>
                {tab.label}
              </span>

              {/* Active Indicator dot */}
              {isActive && (
                <span className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
