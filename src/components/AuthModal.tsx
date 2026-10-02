import { useState, useEffect, FormEvent } from "react";
import { 
  X, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  ShieldCheck, 
  KeyRound, 
  ArrowLeft,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export type AuthMode = "login" | "signup" | "forgot-password" | "reset-confirm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  actionCode?: string | null;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  initialMode = "login",
  actionCode = null
}: AuthModalProps) {
  const { 
    login, 
    signup, 
    loginWithGoogle, 
    sendPasswordReset, 
    verifyResetCode,
    confirmResetPassword,
    error, 
    clearError 
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for confirming reset via link (actionCode)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [confirmSuccessMessage, setConfirmSuccessMessage] = useState<string | null>(null);

  // Sync mode if initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setLocalError(null);
      setResetSuccessMessage(null);
      setConfirmSuccessMessage(null);
      setCodeError(null);
    }
  }, [isOpen, initialMode]);

  // If actionCode provided or mode is reset-confirm, verify the code
  useEffect(() => {
    if (isOpen && mode === "reset-confirm" && actionCode) {
      setIsVerifyingCode(true);
      setCodeError(null);
      verifyResetCode(actionCode)
        .then((userEmail) => {
          setVerifiedEmail(userEmail);
          setEmail(userEmail);
        })
        .catch((err) => {
          setCodeError(
            err.message || "This password reset link is invalid, expired, or has already been used. Please request a new password reset link below."
          );
        })
        .finally(() => {
          setIsVerifyingCode(false);
        });
    }
  }, [isOpen, mode, actionCode]);

  if (!isOpen) return null;

  const handleSwitchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    setLocalError(null);
    setResetSuccessMessage(null);
    setConfirmSuccessMessage(null);
    setCodeError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setLocalError(null);
    setResetSuccessMessage(null);
    setConfirmSuccessMessage(null);

    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Handle Confirm Reset via Link
    if (mode === "reset-confirm") {
      if (!actionCode) {
        setLocalError("No password reset code found in this link.");
        return;
      }
      if (!password) {
        setLocalError("Please enter your new password.");
        return;
      }
      if (password.length < 6) {
        setLocalError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match. Please verify your password confirmation.");
        return;
      }

      setIsSubmitting(true);
      try {
        await confirmResetPassword(actionCode, password);
        setConfirmSuccessMessage(
          "Password reset successfully. You can now log in with your new password."
        );
        setPassword("");
        setConfirmPassword("");
      } catch (err: any) {
        setLocalError(err.message || "Failed to reset password. The link may have expired.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Handle Forgot Password Request
    if (mode === "forgot-password") {
      if (!cleanEmail) {
        setLocalError("Please enter your registered email address.");
        return;
      }
      if (!emailRegex.test(cleanEmail)) {
        setLocalError("Please enter a valid email address (e.g., student@example.com).");
        return;
      }

      setIsSubmitting(true);
      try {
        await sendPasswordReset(cleanEmail);
        setResetSuccessMessage(
          "If an account exists for this email, we've sent you a password-reset link. Please check your inbox and spam folder."
        );
      } catch (err: any) {
        setLocalError(err.message || "Failed to send reset link. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Handle Login and Signup
    if (!cleanEmail) {
      setLocalError("Please enter your email address.");
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setLocalError("Please enter a valid email address (e.g., student@example.com).");
      return;
    }
    if (!password) {
      setLocalError("Please enter your password.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setLocalError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match. Please verify your password confirmation.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        await signup(cleanEmail, password);
      } else {
        await login(cleanEmail, password);
      }
      onClose();
    } catch {
      // Error handled by AuthContext state
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;
    setLocalError(null);
    setResetSuccessMessage(null);
    clearError();
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
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
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-emerald-600 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs">
              ₹
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {mode === "login" 
                  ? "MyPocket" 
                  : mode === "signup" 
                  ? "Create Account" 
                  : mode === "reset-confirm"
                  ? "Set New Password"
                  : "Reset Password"}
              </h2>
              <p className="text-emerald-100 text-xs mt-0.5">
                {mode === "login" 
                  ? "Log in to your synced student pocket-money account" 
                  : mode === "signup"
                  ? "Private cloud sync across all your devices"
                  : mode === "reset-confirm"
                  ? "Create a new secure password for your account"
                  : "Recover your existing MyPocket account"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors active:scale-95 text-white"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switch for Login / Signup (Only shown in login and signup modes) */}
        {mode === "login" || mode === "signup" ? (
          <div className="flex p-1.5 bg-slate-100 mx-5 sm:mx-6 mt-4 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => handleSwitchMode("login")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "login"
                  ? "bg-white text-emerald-800 shadow-xs"
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
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserPlus size={14} /> Create Account
            </button>
          </div>
        ) : (
          <div className="px-5 sm:px-6 pt-4">
            <button
              type="button"
              onClick={() => handleSwitchMode("login")}
              className="text-xs font-bold text-slate-500 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Log In</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Display Error Message */}
          {displayError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col gap-2 text-rose-800 text-xs animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{displayError}</span>
              </div>
              {displayError.includes("Email & Password") && mode !== "login" && (
                <button
                  type="button"
                  onClick={() => handleSwitchMode("login")}
                  className="self-start text-[11px] font-bold text-rose-700 bg-white border border-rose-200 px-3 py-1 rounded-lg hover:bg-rose-100 transition-colors"
                >
                  Switch to Log In with Password
                </button>
              )}
            </div>
          )}

          {/* Invalid/Expired Action Code Alert (TEST 15) */}
          {codeError && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-3 text-amber-900 text-xs animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-sm block">Reset Link Expired or Invalid</span>
                  <p className="leading-relaxed text-amber-800">{codeError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchMode("forgot-password")}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-center text-xs shadow-xs"
              >
                Request a New Reset Link
              </button>
            </div>
          )}

          {/* Reset Link Sent Success Alert */}
          {resetSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col gap-3 text-emerald-800 text-xs animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-sm block text-emerald-900">Check Your Inbox</span>
                  <p className="leading-relaxed text-emerald-800">{resetSuccessMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchMode("login")}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-center text-xs shadow-xs"
              >
                Return to Log In
              </button>
            </div>
          )}

          {/* Confirm Reset Password Success Alert */}
          {confirmSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col gap-3 text-emerald-800 text-xs animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-sm block text-emerald-900">Password Reset Complete</span>
                  <p className="leading-relaxed text-emerald-800">{confirmSuccessMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchMode("login")}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-center text-xs shadow-xs"
              >
                Log In Now
              </button>
            </div>
          )}

          {/* Loading state for verifying link */}
          {isVerifyingCode && (
            <div className="p-6 text-center space-y-2">
              <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Verifying your password reset link...</p>
            </div>
          )}

          {/* MODE: FORGOT-PASSWORD */}
          {mode === "forgot-password" && !resetSuccessMessage && (
            <>
              <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 leading-relaxed">
                Enter your registered MyPocket email address. We will send you a secure link to reset your password and access your existing data.
              </div>

              {/* Email address field */}
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

              {/* Send Reset Link Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound size={16} /> Send Reset Link
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* MODE: RESET-CONFIRM (When opened via reset link) */}
          {mode === "reset-confirm" && !confirmSuccessMessage && !codeError && !isVerifyingCode && (
            <>
              {verifiedEmail && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                  Resetting password for: <span className="font-bold text-slate-800">{verifiedEmail}</span>
                </div>
              )}

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={14} /> New Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={14} /> Confirm New Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-800 font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound size={16} /> Reset MyPocket Password
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* MODE: LOGIN or SIGNUP */}
          {(mode === "login" || mode === "signup") && (
            <>
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail size={14} /> Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus={mode === "login"}
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
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Section 1 & 3: Clearly visible "Forgot password?" link BELOW the password field */}
                {mode === "login" && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleSwitchMode("forgot-password")}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors focus:outline-none"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
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
                  <p className="text-[11px] text-slate-400 font-medium">Must be at least 6 characters</p>
                </div>
              )}

              {/* UID Identity & Security Note */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Financial records belong strictly to your authenticated Firebase UID.</span>
              </div>

              {/* Submit Button: [ Log In ] or [ Create Account ] */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : mode === "login" ? (
                    <>
                      <LogIn size={16} /> Log In
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} /> Create Account
                    </>
                  )}
                </button>
              </div>

              {/* Google Auth Divider & Button */}
              <div className="space-y-3 pt-2">
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 absolute">
                    or
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-700 flex items-center justify-center gap-2.5 transition-all shadow-2xs active:scale-95 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>

              {/* Section 3: Switch between Login and Create Account */}
              <div className="pt-2 text-center text-xs text-slate-500">
                {mode === "login" ? (
                  <p>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => handleSwitchMode("signup")}
                      className="font-bold text-emerald-700 hover:underline ml-1"
                    >
                      Create Account
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => handleSwitchMode("login")}
                      className="font-bold text-emerald-700 hover:underline ml-1"
                    >
                      Log In
                    </button>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Mode Switch Footers for recovery views */}
          {(mode === "forgot-password" || mode === "reset-confirm") && (
            <div className="pt-2 text-center text-xs text-slate-500">
              <p>
                Remembered your password?{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchMode("login")}
                  className="font-bold text-emerald-700 hover:underline ml-1"
                >
                  Back to Log In
                </button>
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
