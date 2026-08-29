import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  query,
  orderBy,
  Unsubscribe
} from "firebase/firestore";
import { db } from "./config";
import { AppData, MonthData, Expense, DEFAULT_CATEGORIES, DEFAULT_CATEGORY_TYPES, CategoryType } from "../types";
import { handleFirestoreError } from "./errors";

export interface FirestoreMonthDoc {
  monthlyPocketMoney: number;
  categoryBudgets: Record<string, number>;
  categoryTypes?: Record<string, CategoryType>;
  updatedAt: string;
}

export interface FirestoreExpenseDoc {
  id: string;
  amount: number;
  category: string;
  merchant?: string;
  note?: string;
  date: string;
  createdAt: string;
}

/**
 * Ensures user profile doc exists under /users/{userId}
 */
export async function ensureUserProfile(userId: string, email: string | null, displayName?: string | null): Promise<void> {
  const userRef = doc(db, "users", userId);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        id: userId,
        email: email || "",
        displayName: displayName || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    throw handleFirestoreError(error, "ensureUserProfile", `users/${userId}`);
  }
}

/**
 * Saves monthly allowance and budgets to /users/{userId}/months/{monthKey}
 */
export async function saveMonthBudget(
  userId: string, 
  monthKey: string, 
  monthlyPocketMoney: number, 
  categoryBudgets: Record<string, number>,
  categoryTypes?: Record<string, CategoryType>
): Promise<void> {
  const monthRef = doc(db, "users", userId, "months", monthKey);
  try {
    await setDoc(monthRef, {
      monthlyPocketMoney: Number(monthlyPocketMoney || 0),
      categoryBudgets: categoryBudgets || { ...DEFAULT_CATEGORIES },
      categoryTypes: categoryTypes || { ...DEFAULT_CATEGORY_TYPES },
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    throw handleFirestoreError(error, "saveMonthBudget", `users/${userId}/months/${monthKey}`);
  }
}

/**
 * Adds an expense item to /users/{userId}/months/{monthKey}/expenses/{expense.id}
 */
export async function addExpense(userId: string, monthKey: string, expense: Expense): Promise<void> {
  const expenseRef = doc(db, "users", userId, "months", monthKey, "expenses", expense.id);
  try {
    const expenseData: Record<string, any> = {
      id: expense.id,
      amount: Number(expense.amount),
      category: expense.category,
      date: expense.date,
      createdAt: new Date().toISOString()
    };
    if (expense.merchant) expenseData.merchant = expense.merchant;
    if (expense.note) expenseData.note = expense.note;

    await setDoc(expenseRef, expenseData);
  } catch (error) {
    throw handleFirestoreError(error, "addExpense", `users/${userId}/months/${monthKey}/expenses/${expense.id}`);
  }
}

/**
 * Deletes an expense item from /users/{userId}/months/{monthKey}/expenses/{expenseId}
 */
export async function deleteExpense(userId: string, monthKey: string, expenseId: string): Promise<void> {
  const expenseRef = doc(db, "users", userId, "months", monthKey, "expenses", expenseId);
  try {
    await deleteDoc(expenseRef);
  } catch (error) {
    throw handleFirestoreError(error, "deleteExpense", `users/${userId}/months/${monthKey}/expenses/${expenseId}`);
  }
}

/**
 * Subscribes in real-time to all months and their subcollection expenses for a user.
 * Returns an unsubscribe callback.
 */
export function subscribeToUserAppData(
  userId: string,
  onUpdate: (appData: AppData) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const monthsRef = collection(db, "users", userId, "months");
  
  // Store map of active expense unsubscribers by monthKey to avoid memory leaks
  const expenseUnsubscribers: Record<string, Unsubscribe> = {};
  const localMonthsCache: Record<string, {
    monthlyPocketMoney: number;
    categoryBudgets: Record<string, number>;
    categoryTypes?: Record<string, CategoryType>;
    expenses: Expense[];
  }> = {};

  const emitCalculatedData = () => {
    let totalSaved = 0;
    const yearlySaved: Record<string, number> = {};
    const currentMonthKey = new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, '0');

    const sanitizedMonths: Record<string, MonthData> = {};

    Object.entries(localMonthsCache).forEach(([monthKey, mData]) => {
      const year = monthKey.split("-")[0];
      const pocketMoney = mData.monthlyPocketMoney || 0;
      const expenses = mData.expenses || [];
      const totalSpent = expenses.reduce((a, b) => a + (Number(b.amount) || 0), 0);
      const monthlySavings = pocketMoney - totalSpent;

      if (monthKey < currentMonthKey) {
        totalSaved += monthlySavings;
      }
      yearlySaved[year] = (yearlySaved[year] || 0) + monthlySavings;

      sanitizedMonths[monthKey] = {
        monthlyPocketMoney: pocketMoney,
        categoryBudgets: mData.categoryBudgets || { ...DEFAULT_CATEGORIES },
        categoryTypes: mData.categoryTypes || { ...DEFAULT_CATEGORY_TYPES },
        expenses
      };
    });

    onUpdate({
      months: sanitizedMonths,
      savings: {
        totalSaved,
        yearlySaved
      }
    });
  };

  const monthsUnsubscribe = onSnapshot(
    monthsRef,
    (monthsSnapshot) => {
      const activeMonthKeys = new Set<string>();

      monthsSnapshot.docs.forEach((monthDoc) => {
        const monthKey = monthDoc.id;
        activeMonthKeys.add(monthKey);
        const data = monthDoc.data() as FirestoreMonthDoc;

        if (!localMonthsCache[monthKey]) {
          localMonthsCache[monthKey] = {
            monthlyPocketMoney: Number(data.monthlyPocketMoney || 0),
            categoryBudgets: data.categoryBudgets || { ...DEFAULT_CATEGORIES },
            categoryTypes: data.categoryTypes || { ...DEFAULT_CATEGORY_TYPES },
            expenses: []
          };
        } else {
          localMonthsCache[monthKey].monthlyPocketMoney = Number(data.monthlyPocketMoney || 0);
          localMonthsCache[monthKey].categoryBudgets = data.categoryBudgets || { ...DEFAULT_CATEGORIES };
          localMonthsCache[monthKey].categoryTypes = data.categoryTypes || { ...DEFAULT_CATEGORY_TYPES };
        }

        // Set up real-time listener for this month's expenses subcollection if not already listening
        if (!expenseUnsubscribers[monthKey]) {
          const expQuery = query(
            collection(db, "users", userId, "months", monthKey, "expenses"),
            orderBy("date", "desc")
          );

          expenseUnsubscribers[monthKey] = onSnapshot(
            expQuery,
            (expSnapshot) => {
              const expensesList: Expense[] = expSnapshot.docs.map((d) => {
                const expData = d.data();
                return {
                  id: d.id,
                  amount: Number(expData.amount || 0),
                  category: expData.category || "Food",
                  merchant: expData.merchant || undefined,
                  note: expData.note || undefined,
                  date: expData.date || new Date().toISOString()
                };
              });

              if (localMonthsCache[monthKey]) {
                localMonthsCache[monthKey].expenses = expensesList;
                emitCalculatedData();
              }
            },
            (expError) => {
              console.error(`Error in expenses listener for ${monthKey}`, expError);
              if (onError) onError(handleFirestoreError(expError, "listenExpenses", `users/${userId}/months/${monthKey}/expenses`));
            }
          );
        }
      });

      // Cleanup removed months
      Object.keys(localMonthsCache).forEach((key) => {
        if (!activeMonthKeys.has(key)) {
          delete localMonthsCache[key];
          if (expenseUnsubscribers[key]) {
            expenseUnsubscribers[key]();
            delete expenseUnsubscribers[key];
          }
        }
      });

      emitCalculatedData();
    },
    (monthsError) => {
      console.error("Error in months listener", monthsError);
      if (onError) onError(handleFirestoreError(monthsError, "listenMonths", `users/${userId}/months`));
    }
  );

  return () => {
    monthsUnsubscribe();
    Object.values(expenseUnsubscribers).forEach(unsub => unsub());
  };
}

/**
 * Checks if user has any existing months in Firestore.
 */
export async function hasCloudData(userId: string): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, "users", userId, "months"));
    return !snap.empty;
  } catch (e) {
    console.error("Failed to check cloud data", e);
    return false;
  }
}

/**
 * Migrates existing localStorage AppData into user's Firestore structure.
 */
export async function migrateLocalDataToFirestore(userId: string, localData: AppData): Promise<number> {
  if (!localData || !localData.months || Object.keys(localData.months).length === 0) {
    return 0;
  }

  let totalExpensesMigrated = 0;

  try {
    for (const [monthKey, monthData] of Object.entries(localData.months)) {
      // 1. Save Month Doc
      await saveMonthBudget(
        userId,
        monthKey,
        monthData.monthlyPocketMoney || 0,
        monthData.categoryBudgets || { ...DEFAULT_CATEGORIES },
        monthData.categoryTypes || { ...DEFAULT_CATEGORY_TYPES }
      );

      // 2. Batch write expenses in chunks of 400 (Firestore limit is 500)
      const expenses = monthData.expenses || [];
      if (expenses.length > 0) {
        const chunkSize = 400;
        for (let i = 0; i < expenses.length; i += chunkSize) {
          const chunk = expenses.slice(i, i + chunkSize);
          const batch = writeBatch(db);

          chunk.forEach((exp) => {
            const expRef = doc(db, "users", userId, "months", monthKey, "expenses", exp.id);
            const expDoc: Record<string, any> = {
              id: exp.id,
              amount: Number(exp.amount),
              category: exp.category,
              date: exp.date,
              createdAt: new Date().toISOString()
            };
            if (exp.merchant) expDoc.merchant = exp.merchant;
            if (exp.note) expDoc.note = exp.note;

            batch.set(expRef, expDoc);
            totalExpensesMigrated++;
          });

          await batch.commit();
        }
      }
    }

    // Update user profile doc with migration marker
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { migratedFromLocal: true, updatedAt: new Date().toISOString() }, { merge: true });

    return totalExpensesMigrated;
  } catch (error) {
    throw handleFirestoreError(error, "migrateLocalDataToFirestore", `users/${userId}`);
  }
}

/**
 * Clears/Resets all user data in Firestore for the authenticated user.
 */
export async function resetUserDataInFirestore(userId: string): Promise<void> {
  try {
    const monthsSnap = await getDocs(collection(db, "users", userId, "months"));
    
    for (const monthDoc of monthsSnap.docs) {
      const monthKey = monthDoc.id;
      const expSnap = await getDocs(collection(db, "users", userId, "months", monthKey, "expenses"));
      
      const batch = writeBatch(db);
      expSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(monthDoc.ref);
      await batch.commit();
    }
  } catch (error) {
    throw handleFirestoreError(error, "resetUserDataInFirestore", `users/${userId}`);
  }
}
