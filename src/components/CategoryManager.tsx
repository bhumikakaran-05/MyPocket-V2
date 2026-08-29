import { useState } from "react";
import { Plus, Trash2, Edit2, X, Check, AlertTriangle, IndianRupee, ShieldCheck, Tag } from "lucide-react";
import { MonthData, CategoryType, DEFAULT_CATEGORY_TYPES } from "../types";

interface CategoryManagerProps {
  monthData: MonthData;
  onUpdate: (newData: MonthData) => void;
  onClose: () => void;
  onResetAll: () => void;
}

export default function CategoryManager({ monthData, onUpdate, onClose, onResetAll }: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryBudget, setNewCategoryBudget] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>("variable");
  
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editBudget, setEditBudget] = useState("");
  const [editType, setEditType] = useState<CategoryType>("variable");

  const allowance = Number(monthData.monthlyPocketMoney || 0);
  const totalAllocated = Object.values(monthData.categoryBudgets || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  const unallocated = allowance - totalAllocated;
  const isOverAllocated = totalAllocated > allowance;
  const overAllocatedAmount = isOverAllocated ? totalAllocated - allowance : 0;

  const handleAdd = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      alert("Please enter a category name");
      return;
    }
    if (monthData.categoryBudgets[trimmedName] !== undefined) {
      alert("Category already exists!");
      return;
    }

    const budget = parseFloat(newCategoryBudget) || 0;
    if (budget < 0) {
      alert("Budget cannot be negative");
      return;
    }

    // Over-allocation check warning
    const prospectiveTotal = totalAllocated + budget;
    if (allowance > 0 && prospectiveTotal > allowance) {
      const overAmount = prospectiveTotal - allowance;
      if (!confirm(`Warning: Adding this budget will exceed your allowance by ₹${overAmount.toLocaleString()}. Proceed anyway?`)) {
        return;
      }
    }

    const newTypes = { ...(monthData.categoryTypes || DEFAULT_CATEGORY_TYPES), [trimmedName]: newCategoryType };

    onUpdate({
      ...monthData,
      categoryBudgets: {
        ...monthData.categoryBudgets,
        [trimmedName]: budget
      },
      categoryTypes: newTypes
    });

    setNewCategoryName("");
    setNewCategoryBudget("");
    setNewCategoryType("variable");
  };

  const handleDelete = (name: string) => {
    const categoryExpenses = (monthData.expenses || []).filter(e => e.category === name);
    
    if (categoryExpenses.length > 0) {
      const choice = confirm(
        `"${name}" has ${categoryExpenses.length} logged expense(s) totaling ₹${categoryExpenses.reduce((a, b) => a + b.amount, 0).toLocaleString()}.\n\n` +
        `Click OK to delete the category but KEEP expense history (recommended).\n` +
        `Click Cancel to abort.`
      );
      
      if (!choice) return;
    }

    const newBudgets = { ...monthData.categoryBudgets };
    delete newBudgets[name];

    const newTypes = { ...monthData.categoryTypes };
    delete newTypes[name];

    onUpdate({
      ...monthData,
      categoryBudgets: newBudgets,
      categoryTypes: newTypes
      // Expenses are kept safely in history!
    });
  };

  const handleStartEdit = (name: string, budget: number) => {
    setEditingCategory(name);
    setEditBudget(budget.toString());
    setEditType(monthData.categoryTypes?.[name] || DEFAULT_CATEGORY_TYPES[name] || "variable");
  };

  const handleSaveEdit = (name: string) => {
    const budget = parseFloat(editBudget);
    if (isNaN(budget) || budget < 0) {
      alert("Please enter a valid budget amount");
      return;
    }

    const currentCatBudget = monthData.categoryBudgets[name] || 0;
    const prospectiveTotal = totalAllocated - currentCatBudget + budget;
    if (allowance > 0 && prospectiveTotal > allowance) {
      const overAmount = prospectiveTotal - allowance;
      if (!confirm(`Warning: This change will allocate ₹${overAmount.toLocaleString()} more than your available allowance. Proceed?`)) {
        return;
      }
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-emerald-600 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">Category Budgets & Planner</h2>
            <p className="text-emerald-100 text-xs mt-0.5">Allocate your monthly pocket money</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-full transition-colors active:scale-95"
          >
            <X size={22} />
          </button>
        </div>

        {/* Live Allocation Summary Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-3 gap-2 text-center mb-2">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Allowance</span>
              <span className="text-base font-black text-slate-800">₹{allowance.toLocaleString()}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Allocated</span>
              <span className={`text-base font-black ${isOverAllocated ? 'text-rose-600' : 'text-emerald-600'}`}>
                ₹{totalAllocated.toLocaleString()}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Unallocated</span>
              <span className={`text-base font-black ${unallocated < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {unallocated < 0 ? `-₹${Math.abs(unallocated).toLocaleString()}` : `₹${unallocated.toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Allocation Warning Banner */}
          {isOverAllocated && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <AlertTriangle size={16} className="shrink-0 text-rose-500" />
              <span>You are allocating ₹{overAllocatedAmount.toLocaleString()} more than your available allowance.</span>
            </div>
          )}
          {!isOverAllocated && unallocated > 0 && allowance > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 flex items-center gap-2 text-emerald-700 text-xs font-medium">
              <ShieldCheck size={16} className="shrink-0 text-emerald-500" />
              <span>₹{unallocated.toLocaleString()} unallocated money is available to assign or save.</span>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Add New Category Form */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Plus size={14} /> Add New Category
            </h3>
            <div className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Category Name (e.g. Gym)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                <div className="relative w-32">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    placeholder="Budget"
                    value={newCategoryBudget}
                    onChange={(e) => setNewCategoryBudget(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Type:</span>
                  <div className="inline-flex bg-white rounded-lg p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setNewCategoryType("variable")}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
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
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
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
                  onClick={handleAdd}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold text-sm flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Plus size={16} /> Add Category
                </button>
              </div>
            </div>
          </div>

          {/* Existing Categories List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Monthly Categories ({Object.keys(monthData.categoryBudgets || {}).length})
              </h3>
              <span className="text-xs text-slate-400">Click pencil to edit budget</span>
            </div>

            <div className="space-y-2">
              {Object.entries(monthData.categoryBudgets || {}).map(([name, budget]) => {
                const isEditing = editingCategory === name;
                const catType = monthData.categoryTypes?.[name] || DEFAULT_CATEGORY_TYPES[name] || "variable";
                const catExpenses = (monthData.expenses || []).filter(e => e.category === name);
                const spent = catExpenses.reduce((a, b) => a + Number(b.amount), 0);

                return (
                  <div 
                    key={name} 
                    className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-200 transition-all"
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
                            <span className="absolute left-3 top-2 text-slate-400 text-sm">₹</span>
                            <input
                              type="number"
                              value={editBudget}
                              onChange={(e) => setEditBudget(e.target.value)}
                              className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
                              autoFocus
                              placeholder="0"
                            />
                          </div>
                          <button 
                            onClick={() => handleSaveEdit(name)} 
                            className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                            title="Save changes"
                          >
                            <Check size={18} />
                          </button>
                          <button 
                            onClick={() => setEditingCategory(null)} 
                            className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800 text-sm truncate">{name}</p>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              catType === "fixed" 
                                ? "bg-blue-50 text-blue-700 border border-blue-100" 
                                : "bg-purple-50 text-purple-700 border border-purple-100"
                            }`}>
                              {catType}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>Budget: <strong className="text-slate-700">₹{budget.toLocaleString()}</strong></span>
                            <span>•</span>
                            <span>Spent: <strong className="text-slate-700">₹{spent.toLocaleString()}</strong></span>
                          </div>
                        </div>

                        <div className="flex gap-1 shrink-0">
                          <button 
                            onClick={() => handleStartEdit(name, budget)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors active:scale-95"
                            title="Edit budget"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(name)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors active:scale-95"
                            title="Delete category"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reset App Data Section */}
          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={onResetAll}
              className="w-full py-3.5 px-4 rounded-2xl border border-rose-200 bg-rose-50/50 text-rose-600 font-bold hover:bg-rose-100/70 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Trash2 size={16} /> Reset All App Data
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-1.5">Permanently clears all months, budgets, and saved history.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
