import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";

interface ResetConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ResetConfirmationModal({ isOpen, onConfirm, onCancel }: ResetConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 mb-2">Reset All Data?</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              This will permanently delete all your expenses, budgets, and savings history. This action cannot be undone.
            </p>

            <div className="space-y-3">
              <button
                onClick={onConfirm}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-lg hover:bg-rose-600 transition-colors shadow-lg shadow-rose-100"
              >
                Yes, Delete Everything
              </button>
              <button
                onClick={onCancel}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
