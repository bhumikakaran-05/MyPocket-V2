import { useState } from "react";
import { Plus, Trash2, Edit2, X, Check, AlertTriangle, ShieldCheck, Copy, AlertCircle, Archive, RotateCcw } from "lucide-react";
import { MonthData, CategoryType, DEFAULT_CATEGORY_TYPES } from "../types";
import { getProgressBarColor } from "../utils/calculations";

interface CategoryManagerProps {
  monthData: MonthData;
  prevMonthData?: MonthData;
  prevMonthName?: string;
  onUpdate: (newData: MonthData) => void;
  onReassignExpenses?: (fromCategory: string, toCategory: string) => void;
  onClose: () => void;
  onResetAll: () => void;
  isEmbedded?: boolean;
}

interface DeleteCategoryPrompt {
  name: string;
  budget: number;
  expenseCount: number;
  totalSpent: number;
  reassignTargetCategory: string;
  action: "archive" | "reassign" | "direct_delete";
}

export default function CategoryManager({ 
  monthData, 
  prevMonthData,
  prevMonthName,
  onUpdate, 
  onReassignExpenses, 
  onClose, 
  onResetAll,
  isEmbedded = false
}: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryBudget, setNewCategoryBudget] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>("variable");
  
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editBudget, setEditBudget] = useState("");
  const [editType, setEditType] = useState<CategoryType>("variable");

  const [formError, setFormError] = useState<string | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<DeleteCategoryPrompt | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Financial calculations
  const allowance = Number(monthData.monthlyPocketMoney || 0);
  const totalAllocated = Object.values(monthData.categoryBudgets || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalSpent = (monthData.expenses || []).reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const remainingMoney = allowance - totalSpent;
  const unallocated = allowance - totalAllocated;
  const isOverAllocated = totalAllocated > allowance;
  const overAllocatedAmount = isOverAllocated ? totalAllocated - allowance : 0;

  const archivedList = Array.isArray(monthData.archivedCategories) ? monthData.archivedCategories : [];

  const handleAdd = () => {
    setFormError(null);
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setFormError("Please enter a category name");
      return;
    }
    if (monthData.categoryBudgets[trimmedName] !== undefined) {
      setFormError(`Category "${trimmedName}" is already active in your budget!`);
      return;
    }

    const budget = parseFloat(newCategoryBudget) || 0;
    if (budget < 0) {
      setFormError("Budget cannot be negative");
      return;
    }

    const newTypes = { ...(monthData.categoryTypes || DEFAULT_CATEGORY_TYPES), [trimmedName]: newCategoryType };
    const updatedArchived = archivedList.filter(c => c !== trimmedName);

    onUpdate({
      ...monthData,
      categoryBudgets: {
        ...monthData.categoryBudgets,
        [trimmedName]: budget
      },
      categoryTypes: newTypes,
      archivedCategories: updatedArchived
    });

    setNewCategoryName("");
    setNewCategoryBudget("");
    setNewCategoryType("variable");
  };

  const handleStartDelete = (name: string) => {
    setFormError(null);
    const budget = Number(monthData.categoryBudgets[name] || 0);
    const categoryExpenses = (monthData.expenses || []).filter(e => e.category === name);
    const catSpent = categoryExpenses.reduce((a, b) => a + Number(b.amount || 0), 0);
    const otherCategories = Object.keys(monthData.categoryBudgets || {}).filter(c => c !== name);

    // If no budget and no expenses: direct safe delete
    if (budget === 0 && categoryExpenses.length === 0) {
      setDeletePrompt({
        name,
        budget: 0,
        expenseCount: 0,
        totalSpent: 0,
        reassignTargetCategory: "",
        action: "direct_delete"
      });
      return;
    }

    // Has expenses: default to archive
    if (categoryExpenses.length > 0) {
      setDeletePrompt({
        name,
        budget,
        expenseCount: categoryExpenses.length,
        totalSpent: catSpent,
        reassignTargetCategory: otherCategories[0] || "",
        action: "archive"
      });
      return;
    }

    // Has budget but 0 expenses
    setDeletePrompt({
      name,
      budget,
      expenseCount: 0,
      totalSpent: 0,
      reassignTargetCategory: "",
      action: "direct_delete"
    });
  };

  const handleConfirmDelete = () => {
    if (!deletePrompt) return;

    if (deletePrompt.action === "reassign" && deletePrompt.reassignTargetCategory && onReassignExpenses) {
      onReassignExpenses(deletePrompt.name, deletePrompt.reassignTargetCategory);
      setDeletePrompt(null);
      return;
    }

    if (deletePrompt.action === "archive") {
      // Archive flow: remove from categoryBudgets, keep in archivedCategories, preserve all expenses
      const newBudgets = { ...monthData.categoryBudgets };
      delete newBudgets[deletePrompt.name];

      const newArchived = Array.from(new Set([...archivedList, deletePrompt.name]));

      onUpdate({
        ...monthData,
        categoryBudgets: newBudgets,
        archivedCategories: newArchived
      });

      setDeletePrompt(null);
      return;
    }

    // Direct delete flow (no expenses or user confirmed removal of unused allocation)
    const newBudgets = { ...monthData.categoryBudgets };
    delete newBudgets[deletePrompt.name];

    const newTypes = { ...monthData.categoryTypes };
    delete newTypes[deletePrompt.name];

    const newArchived = archivedList.filter(c => c !== deletePrompt.name);

    onUpdate({
      ...monthData,
      categoryBudgets: newBudgets,
      categoryTypes: newTypes,
      archivedCategories: newArchived
    });

    setDeletePrompt(null);
  };

  const handleRestoreCategory = (categoryName: string) => {
    const newArchived = archivedList.filter(c => c !== categoryName);
    const newBudgets = {
      ...monthData.categoryBudgets,
      [categoryName]: 0
    };
    const newTypes = {
      ...(monthData.categoryTypes || DEFAULT_CATEGORY_TYPES),
      [categoryName]: monthData.categoryTypes?.[categoryName] || DEFAULT_CATEGORY_TYPES[categoryName] || "variable"
    };

    onUpdate({
      ...monthData,
      categoryBudgets: newBudgets,
      categoryTypes: newTypes,
      archivedCategories: newArchived
    });
  };

  const handleStartEdit = (name: string, budget: number) => {
    setFormError(null);
    setEditingCategory(name);
    setEditBudget(budget.toString());
    setEditType(monthData.categoryTypes?.[name] || DEFAULT_CATEGORY_TYPES[name] || "variable");
  };

  const handleSaveEdit = (name: string) => {
    setFormError(null);
    const budget = parseFloat(editBudget);
    if (isNaN(budget) || budget < 0) {
      setFormError("Please enter a valid budget amount (₹0 or greater)");
      return;
    }

    const newTypes = { ...(monthData.categoryTypes || DEFAULT_CATEGORY_TYPES), [name]: editType };

    onUpdate({
      ...monthData,
      categoryBudgets: {
        ...monthData.categoryBudgets,
        [name]: budget
      },
      categoryTypes: newTypes
    });
    setEditingCategory(null);
  };

  const handleCopyPrevMonthBudgets = () => {
    if (!prevMonthData || !prevMonthData.categoryBudgets) return;
    
    const copiedBudgets = { ...prevMonthData.categoryBudgets };
    const copiedTypes = { ...(prevMonthData.categoryTypes || DEFAULT_CATEGORY_TYPES) };

    onUpdate({
      ...monthData,
      categoryBudgets: copiedBudgets,
      categoryTypes: copiedTypes
    });

    setCopyFeedback(`Copied ${Object.keys(copiedBudgets).length} category budgets from ${prevMonthName || "previous month"}!`);
    setTimeout(() => setCopyFeedback(null), 3500);
  };

  const hasPrevBudgets = prevMonthData && 
    prevMonthData.categoryBudgets && 
    Object.keys(prevMonthData.categoryBudgets).length > 0;

  const otherCategories = deletePrompt 
    ? Object.keys(monthData.categoryBudgets || {}).filter(c => c !== deletePrompt.name)
    : [];

  return (
    <div className={isEmbedded ? "w-full" : "fixed inset-0 bg-black/60 flex items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-sm"}>
      <div className={`bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-xs border border-slate-200/90 flex flex-col relative ${
        isEmbedded ? "" : "shadow-2xl max-h-[90vh]"
      }`}>
        {/* Header */}
        <div className="p-5 sm:p-6 bg-emerald-600 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">Category Budgets & Planner</h2>
            <p className="text-emerald-100 text-xs mt-0.5">Plan and allocate your monthly pocket money</p>
          </div>
          {!isEmbedded && (
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          )}
        </div>

        {/* Complete Money Summary Required for Budget Page:
            Allowance, Total allocated, Total unallocated, Total spent, Remaining money */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Allowance</span>
              <span className="text-base font-black text-slate-800">₹{allowance.toLocaleString()}</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Total Spent</span>
              <span className="text-base font-black text-slate-800">₹{totalSpent.toLocaleString()}</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Remaining</span>
              <span className={`text-base font-black ${remainingMoney >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                ₹{remainingMoney.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Allocated</span>
              <span className={`text-sm font-black ${isOverAllocated ? 'text-rose-600' : 'text-emerald-700'}`}>
                ₹{totalAllocated.toLocaleString()}
              </span>
            </div>

            <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Unallocated</span>
              <span className={`text-sm font-black ${unallocated < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {unallocated < 0 ? `-₹${Math.abs(unallocated).toLocaleString()}` : `₹${unallocated.toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Over-allocation Alert Banner */}
          {isOverAllocated && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <AlertTriangle size={16} className="shrink-0 text-rose-500" />
              <span>You have allocated ₹{overAllocatedAmount.toLocaleString()} more than your allowance.</span>
            </div>
          )}
          {!isOverAllocated && unallocated > 0 && allowance > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 flex items-center gap-2 text-emerald-800 text-xs font-medium">
              <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
              <span>₹{unallocated.toLocaleString()} unallocated reserve available for unplanned needs.</span>
            </div>
          )}
          
          {copyFeedback && (
            <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-2 text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <Check size={14} className="text-emerald-600" />
              <span>{copyFeedback}</span>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* Quick Copy Previous Month Budgets Button */}
          {hasPrevBudgets && (
            <button
              type="button"
              onClick={handleCopyPrevMonthBudgets}
              className="w-full py-2.5 px-3 bg-teal-50 hover:bg-teal-100/80 border border-teal-200 text-teal-800 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Copy size={14} className="text-teal-600" />
              <span>Copy Budgets from {prevMonthName || "Previous Month"}</span>
            </button>
          )}

          {/* Add New Category Form */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Plus size={14} /> Add New Category
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Books, Gym, Groceries"
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      setFormError(null);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Monthly Budget
                  </label>
                  <div className="relative w-full">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm select-none">₹</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={newCategoryBudget}
                      onChange={(e) => {
                        setNewCategoryBudget(e.target.value);
                        setFormError(null);
                      }}
                      className="w-full pl-8 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 tracking-tight"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Type:</span>
                  <div className="inline-flex bg-white rounded-lg p-0.5 border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setNewCategoryType("variable")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        newCategoryType === "variable"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Variable
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCategoryType("fixed")}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                        newCategoryType === "fixed"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Fixed
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Plus size={15} /> Add Category
                </button>
              </div>
            </div>
          </div>

          {/* Active Categories List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Category Budgets ({Object.keys(monthData.categoryBudgets || {}).length})
              </h3>
              <span className="text-[11px] text-slate-400">Synchronized with expenses</span>
            </div>

            {Object.keys(monthData.categoryBudgets || {}).length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400 space-y-1">
                <p className="text-sm font-semibold text-slate-600">No active category budgets</p>
                <p className="text-xs">Use the form above to add a category or restore from archived.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(monthData.categoryBudgets || {}).map(([name, budgetVal]) => {
                  const budget = Number(budgetVal) || 0;
                  const isEditing = editingCategory === name;
                  const catType = monthData.categoryTypes?.[name] || DEFAULT_CATEGORY_TYPES[name] || "variable";
                  const catExpenses = (monthData.expenses || []).filter(e => e.category === name);
                  const spent = catExpenses.reduce((a, b) => a + Number(b.amount || 0), 0);
                  const catRemaining = budget - spent;
                  const percentage = budget > 0 ? (spent / budget) * 100 : (spent > 0 ? 100 : 0);

                  return (
                    <div 
                      key={name} 
                      className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-200 transition-all space-y-2"
                    >
                      {isEditing ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-sm">{name}</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditType("variable")}
                                className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                                  editType === "variable" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                Variable
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditType("fixed")}
                                className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                                  editType === "fixed" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                Fixed
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                              <span className="absolute left-3.5 top-2 text-slate-400 font-bold text-sm select-none">₹</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="any"
                                value={editBudget}
                                onChange={(e) => setEditBudget(e.target.value)}
                                className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-emerald-500 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-800 tracking-tight shadow-xs"
                                autoFocus
                                placeholder="0"
                              />
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleSaveEdit(name)} 
                              className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-xs active:scale-95 shrink-0"
                              title="Save changes"
                            >
                              <Check size={18} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => setEditingCategory(null)} 
                              className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors active:scale-95 shrink-0"
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="font-bold text-slate-800 text-sm truncate">{name}</p>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                catType === "fixed" 
                                  ? "bg-blue-50 text-blue-700 border border-blue-100" 
                                  : "bg-purple-50 text-purple-700 border border-purple-100"
                              }`}>
                                {catType}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button 
                                type="button"
                                onClick={() => handleStartEdit(name, budget)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors active:scale-95"
                                title="Edit budget"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleStartDelete(name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors active:scale-95"
                                title={catExpenses.length > 0 ? "Archive category" : "Delete category"}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Budget vs Spent & Remaining Metrics */}
                          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Budget</span>
                              <span className="font-bold text-slate-800">₹{budget.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Spent</span>
                              <span className="font-bold text-slate-800">₹{spent.toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Remaining</span>
                              <span className={`font-bold ${catRemaining >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {catRemaining >= 0 ? `₹${catRemaining.toLocaleString()}` : `-₹${Math.abs(catRemaining).toLocaleString()}`}
                              </span>
                            </div>
                          </div>

                          {/* Visual Progress Bar & % Used */}
                          <div className="space-y-1 pt-1.5">
                            <div className="flex justify-between text-[11px] font-semibold">
                              <span className="text-slate-400">{Math.round(percentage)}% used</span>
                              {catRemaining < 0 && (
                                <span className="text-rose-600 font-bold">Overspent by ₹{Math.abs(catRemaining).toLocaleString()}</span>
                              )}
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(percentage)}`}
                                style={{ width: `${Math.min(100, percentage)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Archived Categories Section */}
          {archivedList.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Archive size={14} className="text-slate-400" />
                  <span>Archived Categories ({archivedList.length})</span>
                </div>
                <span className="text-[11px] text-slate-400">{showArchived ? "Hide" : "Show"}</span>
              </button>

              {showArchived && (
                <div className="space-y-1.5 p-2 bg-slate-50/50 rounded-xl border border-slate-200/60 animate-in fade-in">
                  <p className="text-[11px] text-slate-400 px-1">
                    Archived categories preserve past financial records while remaining hidden from new expense logging.
                  </p>
                  {archivedList.map((catName) => (
                    <div key={catName} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">{catName}</span>
                      <button
                        type="button"
                        onClick={() => handleRestoreCategory(catName)}
                        className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md font-bold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw size={12} />
                        <span>Restore to Budget</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reset App Data Section */}
          <div className="pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onResetAll}
              className="w-full py-3 px-4 rounded-2xl border border-rose-200 bg-rose-50/50 text-rose-600 font-bold hover:bg-rose-100/70 transition-colors flex items-center justify-center gap-2 text-xs"
            >
              <Trash2 size={15} /> Reset All App Data
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-1.5">Clears all months, budgets, and saved history.</p>
          </div>
        </div>

        {/* Delete Category Confirmation Dialog (ALWAYS Viewport-Centered with fixed inset-0 z-50) */}
        {deletePrompt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                deletePrompt.expenseCount > 0 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
              }`}>
                {deletePrompt.expenseCount > 0 ? <Archive size={24} /> : <Trash2 size={24} />}
              </div>

              {/* Case 1: ₹0 budget and 0 expenses -> Straightforward safe deletion */}
              {deletePrompt.expenseCount === 0 && (
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-slate-800 text-base">Delete category?</h3>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1">
                    Are you sure you want to delete <strong>{deletePrompt.name}</strong>?
                    {deletePrompt.budget > 0 
                      ? ` Releasing ₹${deletePrompt.budget.toLocaleString()} back to your unallocated pocket money.`
                      : " This category has no budget allocation or expense records."}
                  </p>
                </div>
              )}

              {/* Case 2: Category containing historical expenses -> Archive or Reassign */}
              {deletePrompt.expenseCount > 0 && (
                <div className="space-y-3">
                  <div className="text-center space-y-1">
                    <h3 className="font-bold text-slate-800 text-base">Category has expense history</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>{deletePrompt.name}</strong> contains {deletePrompt.expenseCount} recorded transaction(s) totaling <strong>₹{deletePrompt.totalSpent.toLocaleString()}</strong>.
                    </p>
                  </div>

                  <div className="space-y-2 pt-1 text-xs">
                    {/* Option 1: Archive (Preserves historical records) */}
                    <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      deletePrompt.action === "archive" ? "bg-emerald-50/80 border-emerald-300" : "bg-slate-50 border-slate-200"
                    }`}>
                      <input
                        type="radio"
                        name="deleteAction"
                        checked={deletePrompt.action === "archive"}
                        onChange={() => setDeletePrompt({ ...deletePrompt, action: "archive" })}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Archive Category (Recommended)</span>
                        <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                          Removes category from active budgeting while keeping all {deletePrompt.expenseCount} historical transactions safely preserved.
                        </span>
                      </div>
                    </label>

                    {/* Option 2: Reassign expenses if other categories exist */}
                    {otherCategories.length > 0 && (
                      <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        deletePrompt.action === "reassign" ? "bg-emerald-50/80 border-emerald-300" : "bg-slate-50 border-slate-200"
                      }`}>
                        <input
                          type="radio"
                          name="deleteAction"
                          checked={deletePrompt.action === "reassign"}
                          onChange={() => setDeletePrompt({ ...deletePrompt, action: "reassign" })}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-800 block">Reassign transactions to:</span>
                          <select
                            value={deletePrompt.reassignTargetCategory}
                            onChange={(e) => setDeletePrompt({ ...deletePrompt, reassignTargetCategory: e.target.value, action: "reassign" })}
                            className="w-full text-xs font-semibold py-1 px-2 mt-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                          >
                            {otherCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletePrompt(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className={`py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-sm transition-colors active:scale-95 ${
                    deletePrompt.expenseCount > 0 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {deletePrompt.expenseCount > 0 ? "Archive" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
