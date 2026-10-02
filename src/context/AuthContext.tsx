import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  unlink,
  signOut,
  AuthError
} from "firebase/auth";
import { auth } from "../firebase/config";
import { ensureUserProfile } from "../firebase/firestoreService";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signup: (email: string, pass: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  unlinkGoogleAccount: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  verifyResetCode: (code: string) => Promise<string>;
  confirmResetPassword: (code: string, newPass: string) => Promise<void>;
  setPasswordForGoogleUser: (newPass: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  changePassword: (newPass: string, currentPass?: string) => Promise<void>;
  reloadUser: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getFriendlyAuthErrorMessage(err: unknown): string {
  const authErr = err as AuthError;
  const code = authErr?.code || "";

  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Password is incorrect. Please try again.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/network-request-failed":
      return "Unable to connect. Please check your internet connection.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a few moments.";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed before completing.";
    case "auth/cancelled-popup-request":
      return "Sign-in popup request was cancelled.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using Email & Password. Please log in with your password, then connect Google in Profile settings.";
    case "auth/credential-already-in-use":
      return "This Google account is already linked to another MyPocket user.";
    case "auth/requires-recent-login":
      return "This operation requires recent verification. Please enter your current password.";
    case "auth/invalid-action-code":
      return "This password reset link is invalid, expired, or has already been used. Please request a new password reset link.";
    case "auth/expired-action-code":
      return "This password reset link has expired. Please request a new password reset link below.";
    default:
      return authErr?.message || "Authentication request failed. Please try again.";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await ensureUserProfile(currentUser.uid, currentUser.email, currentUser.displayName);
        } catch (e) {
          console.error("Failed to ensure user profile", e);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (email: string, pass: string) => {
    setError(null);
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      await ensureUserProfile(res.user.uid, res.user.email, res.user.displayName);
      // Automatically send verification email on new account creation
      try {
        await sendEmailVerification(res.user);
      } catch (verErr) {
        console.warn("Could not auto-send verification email on signup", verErr);
      }
    } catch (err) {
      const msg = getFriendlyAuthErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const login = async (email: string, pass: string) => {
    setError(null);
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
      await ensureUserProfile(res.user.uid, res.user.email, res.user.displayName);
    } catch (err) {
      const msg = getFriendlyAuthErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const res = await signInWithPopup(auth, provider);
      await ensureUserProfile(res.user.uid, res.user.email, res.user.displayName);
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        return;
      }
      const msg = getFriendlyAuthErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const linkGoogleAccount = async () => {
    setError(null);
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user is currently signed in.");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await linkWithPopup(currentUser, provider);
      await currentUser.reload();
      setUser({ ...currentUser } as User);
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user" || err?.code === "auth/cancelled-popup-request") {
        return;
      }
      const msg = getFriendlyAuthErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const unlinkGoogleAccount = async () => {
    setError(null);
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user is currently signed in.");
    try {
      await unlink(currentUser, "google.com");
      await currentUser.reload();
      setUser({ ...currentUser } as User);
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const sendPasswordReset = async (email: string) => {
    setError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      const msg = "Please enter your email address.";
      setError(msg);
      throw new Error(msg);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      const msg = "Please enter a valid email address.";
      setError(msg);
      throw new Error(msg);
    }

    try {
      try {
        const actionCodeSettings = {
          url: `${window.location.origin}${window.location.pathname}`,
          handleCodeInApp: true,
        };
        await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
      } catch (innerErr: any) {
        if (
          innerErr?.code === "auth/unauthorized-continue-uri" || 
          innerErr?.code === "auth/invalid-continue-uri"
        ) {
          // Fallback to standard reset email without custom URL if domain is not whitelisted yet
          await sendPasswordResetEmail(auth, cleanEmail);
        } else {
          throw innerErr;
        }
      }
    } catch (err: any) {
      if (err?.code === "auth/invalid-email") {
        const msg = "Please enter a valid email address.";
        setError(msg);
        throw new Error(msg);
      }
      if (err?.code === "auth/too-many-requests") {
        const msg = "Too many attempts. Please try again later.";
        setError(msg);
        throw new Error(msg);
      }
      if (err?.code === "auth/network-request-failed") {
        const msg = "Unable to connect. Please check your internet connection.";
        setError(msg);
        throw new Error(msg);
      }
      // Security standard: do not enumerate accounts on user-not-found
      if (err?.code === "auth/user-not-found") {
        return;
      }
      const msg = getFriendlyAuthErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const verifyResetCode = async (code: string): Promise<string> => {
    setError(null);
    try {
      const email = await verifyPasswordResetCode(auth, code);
      return email;
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const confirmResetPassword = async (code: string, newPass: string): Promise<void> => {
    setError(null);
    if (!newPass || newPass.length < 6) {
      const msg = "Password must be at least 6 characters long.";
      setError(msg);
      throw new Error(msg);
    }
    try {
      await confirmPasswordReset(auth, code, newPass);
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const setPasswordForGoogleUser = async (newPass: string) => {
    setError(null);
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user is currently signed in.");

    if (!newPass || newPass.length < 6) {
      const msg = "Password must be at least 6 characters long.";
      setError(msg);
      throw new Error(msg);
    }

    try {
      await updatePassword(currentUser, newPass);
      await currentUser.reload();
      setUser({ ...currentUser } as User);
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const sendVerificationEmail = async () => {
    setError(null);
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user is currently signed in.");
    try {
      await sendEmailVerification(currentUser);
    } catch (err: any) {
      const msg = getFriendlyAuthErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const changePassword = async (newPass: string, currentPass?: string) => {
    setError(null);
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No user is currently signed in.");

    if (!newPass || newPass.length < 6) {
      const msg = "Password must be at least 6 characters long.";
      setError(msg);
      throw new Error(msg);
    }

    try {
      if (currentPass && currentUser.email) {
        const cred = EmailAuthProvider.credential(currentUser.email, currentPass);
        await reauthenticateWithCredential(currentUser, cred);
      }
      await updatePassword(currentUser, newPass);
    } catch (err: any) {
      if (err?.code === "auth/requires-recent-login" && !currentPass) {
        const msg = "Please enter your current password to verify your identity.";
        setError(msg);
        throw new Error(msg);
      }
      const msg = getFriendlyAuthErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const reloadUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser } as User);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch (err) {
      const msg = getFriendlyAuthErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signup,
        login,
        loginWithGoogle,
        linkGoogleAccount,
        unlinkGoogleAccount,
        sendPasswordReset,
        verifyResetCode,
        confirmResetPassword,
        setPasswordForGoogleUser,
        sendVerificationEmail,
        changePassword,
        reloadUser,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
