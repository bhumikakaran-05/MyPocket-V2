import { useState, FormEvent } from "react";
import { X, Lock, Mail, Eye, EyeOff, LogIn, UserPlus, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export default function AuthModal({ isOpen, onClose, initialMode = "login" }: AuthModalProps) {
  const { login, signup, error, clearError } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSwitchMode = (newMode: "login" | "signup") => {
    setMode(newMode);
    clearError();
    setLocalError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError("Please fill in all required fields.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setLocalError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      onClose();
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-emerald-600 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center font-black text-xl">
              ₹
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {mode === "login" ? "Welcome Back" : "Create MyPocket Account"}
              </h2>
              <p className="text-emerald-100 text-xs mt-0.5">
                {mode === "login" 
                  ? "Access your synced cloud pocket-money" 
                  : "Private cloud sync across all your devices"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors active:scale-95 text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex p-2 bg-slate-100 mx-5 sm:mx-6 mt-4 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => handleSwitchMode("login")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "login"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LogIn size={14} /> Log In
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode("signup")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "signup"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserPlus size={14} /> Sign Up
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {displayError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium">{displayError}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Mail size={14} /> Email Address
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800 font-medium"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Lock size={14} /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password if signup */}
          {mode === "signup" && (
            <div className="space-y-1.5 animate-in fade-in">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={14} /> Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800 font-medium"
              />
            </div>
          )}

          {/* Privacy Note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Your financial data is encrypted and strictly isolated to your account.</span>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === "login" ? (
                <>
                  <LogIn size={16} /> Log In to Cloud
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Create Account
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
