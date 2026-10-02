import { useState, FormEvent } from "react";
import { 
  User as FirebaseUser 
} from "firebase/auth";
import { 
  Cloud, 
  CloudCheck,
  LogOut, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff,
  Mail,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AuthMode } from "./AuthModal";

interface ProfileViewProps {
  user: FirebaseUser | null;
  onOpenAuth: (mode: AuthMode) => void;
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
  const { 
    changePassword, 
    linkGoogleAccount, 
    unlinkGoogleAccount, 
    setPasswordForGoogleUser 
  } = useAuth();

  // Password change state
  const [showPasswordChangeForm, setShowPasswordChangeForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Google link state
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Check providers
  const hasGoogleProvider = user?.providerData.some((p) => p.providerId === "google.com") ?? false;
  const hasPasswordProvider = user?.providerData.some((p) => p.providerId === "password") ?? false;
  const isGoogleOnly = hasGoogleProvider && !hasPasswordProvider;

  // Handle password change
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (isChangingPassword) return;

    setPasswordError(null);
    setPasswordSuccess(null);

    if (!isGoogleOnly && !currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match. Please verify.");
      return;
    }

    setIsChangingPassword(true);
    try {
      if (isGoogleOnly) {
        await setPasswordForGoogleUser(newPassword);
        setPasswordSuccess("Password set successfully! You can now log in using email and password as well.");
      } else {
        await changePassword(newPassword, currentPassword);
        setPasswordSuccess("Your password has been changed successfully.");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowPasswordChangeForm(false);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password. Please check your current password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Google account linking
  const handleToggleGoogleLink = async () => {
    if (isLinkingGoogle) return;
    setLinkError(null);
    setLinkSuccess(null);
    setIsLinkingGoogle(true);

    try {
      if (hasGoogleProvider) {
        await unlinkGoogleAccount();
        setLinkSuccess("Google account unlinked successfully.");
      } else {
        await linkGoogleAccount();
        setLinkSuccess("Google account connected successfully! You can now sign in with Google.");
      }
    } catch (err: any) {
      setLinkError(err.message || "Failed to update Google account connection.");
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const displayName = user?.displayName || (user?.email ? user.email.split("@")[0] : "Student");

  return (
    <div className="space-y-4 max-w-md mx-auto pb-4">
      {/* ==================== 1. ACCOUNT ==================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Account
          </span>
          {user && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cloud Sync Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-3.5">
          {user?.photoURL ? (
            <img 
              src={user.photoURL} 
              alt="Profile" 
              className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-600 shadow-md shadow-emerald-200 shrink-0" 
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-200 shrink-0">
              {user?.email ? user.email.charAt(0).toUpperCase() : "G"}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-800 truncate">
              {user ? displayName : "Guest User"}
            </h2>
            <p className="text-xs text-slate-500 truncate font-medium">
              {user?.email ? user.email : "Saved only on this device"}
            </p>
          </div>
        </div>

        {!user && (
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <p className="text-xs text-slate-500 leading-relaxed">
              Create an account or log in to sync your pocket money, budgets, and expenses across all your phones and laptops.
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
                Create Account
              </button>
            </div>
            <div className="pt-1 text-center">
              <button
                onClick={() => onOpenAuth("forgot-password")}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
              >
                Forgot password? Recover account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== 2. ACCOUNT & SECURITY ==================== */}
      {user && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Account & Security
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Secure</span>
          </div>

          {/* Account Login Method info */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isGoogleOnly ? (
                  <div className="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center shrink-0 border border-slate-200/60">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center shrink-0 border border-slate-200/60">
                    <Mail size={15} className="text-emerald-600" />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    {isGoogleOnly ? "Google Account" : "Email & Password"}
                  </h4>
                  <p className="text-[11px] text-slate-500">{user.email}</p>
                </div>
              </div>

              {hasGoogleProvider && !isGoogleOnly && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Google Linked
                </span>
              )}
            </div>

            {isGoogleOnly && (
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Your account is secured with your Google sign-in. No password is required.
              </p>
            )}
          </div>

          {/* Connect / Disconnect Google Account */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white shadow-2xs flex items-center justify-center shrink-0 border border-slate-200/60">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800">
                  {hasGoogleProvider ? "Google Account Connected" : "Connect Google Account"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {hasGoogleProvider 
                    ? "1-tap login with Google is enabled" 
                    : "Sign in faster with your Google account"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleGoogleLink}
              disabled={isLinkingGoogle}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                hasGoogleProvider
                  ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              }`}
            >
              {isLinkingGoogle ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : hasGoogleProvider ? (
                "Disconnect"
              ) : (
                "Connect"
              )}
            </button>
          </div>

          {/* Feedback messages for Google Link */}
          {linkSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>{linkSuccess}</span>
            </div>
          )}
          {linkError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
              <span>{linkError}</span>
            </div>
          )}

          {/* Change Password Action */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setShowPasswordChangeForm(!showPasswordChangeForm);
                setPasswordError(null);
                setPasswordSuccess(null);
              }}
              className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-between transition-colors shadow-2xs"
            >
              <span className="flex items-center gap-2">
                <Lock size={15} className="text-emerald-600" />
                <span>{isGoogleOnly ? "Set Account Password" : "Change Password"}</span>
              </span>
              <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
                {showPasswordChangeForm ? "Close" : "Update"}
                {showPasswordChangeForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>
          </div>

          {/* Collapsible Change Password Form */}
          {showPasswordChangeForm && (
            <form onSubmit={handleChangePassword} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock size={14} className="text-emerald-600" />
                  {isGoogleOnly ? "Create a Password" : "Update Your Password"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPasswordFields(!showPasswordFields)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  {showPasswordFields ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPasswordFields ? "Hide" : "Show"}</span>
                </button>
              </div>

              {passwordError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-600 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {!isGoogleOnly && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Current Password
                  </label>
                  <input
                    type={showPasswordFields ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  New Password (min 6 characters)
                </label>
                <input
                  type={showPasswordFields ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a new password"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <input
                  type={showPasswordFields ? "text" : "password"}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordChangeForm(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isChangingPassword ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Save Password"
                  )}
                </button>
              </div>
            </form>
          )}

          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {/* Logout Button */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={onLogout}
              className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-2 active:scale-95"
            >
              <LogOut size={15} /> Log Out
            </button>
          </div>
        </div>
      )}

      {/* ==================== 3. YOUR DATA / CLOUD SYNC ==================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Your Data & Cloud Sync
          </h3>
          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
            <Cloud size={13} />
            {user ? "Synced" : "Local"}
          </span>
        </div>

        {/* User-friendly sync description */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-1">
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            Your expenses and budgets are securely synced to your account and available across your devices.
          </p>
        </div>

        {/* Warning if local unsynced records exist */}
        {user && hasLocalDataToMigrate && onOpenMigration && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2.5 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <Smartphone size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-amber-900">Local data found</h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  We found data saved on this device that hasn't been synced yet.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenMigration}
              className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs text-center"
            >
              Review & Sync
            </button>
          </div>
        )}

        {/* Reset App Data */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={onResetAll}
            className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 text-slate-500 hover:text-rose-600 font-bold text-xs flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <Trash2 size={15} /> Reset All App Data
            </span>
            <span className="text-[10px] text-slate-400">Clears current history</span>
          </button>
        </div>
      </div>

      {/* App Info Footer */}
      <div className="rounded-2xl p-3.5 text-center space-y-0.5">
        <p className="text-xs font-bold text-slate-600">MyPocket V2</p>
        <p className="text-[11px] text-slate-400">Student Pocket-Money & Daily Expense Planner</p>
      </div>
    </div>
  );
}
