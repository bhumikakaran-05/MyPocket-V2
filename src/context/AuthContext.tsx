import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
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
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const getFriendlyAuthErrorMessage = (err: unknown): string => {
    const authErr = err as AuthError;
    switch (authErr.code) {
      case "auth/invalid-email":
        return "Invalid email address format.";
      case "auth/user-disabled":
        return "This user account has been disabled.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect email or password.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Password is too weak (must be at least 6 characters).";
      case "auth/network-request-failed":
        return "Network connection failed. Please check your internet connection.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again in a few moments.";
      default:
        return authErr.message || "Authentication failed. Please try again.";
    }
  };

  const signup = async (email: string, pass: string) => {
    setError(null);
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      await ensureUserProfile(res.user.uid, res.user.email, res.user.displayName);
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
    <AuthContext.Provider value={{ user, loading, error, signup, login, logout, clearError }}>
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
