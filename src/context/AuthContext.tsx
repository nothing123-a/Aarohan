import React, { createContext, useContext, useReducer, useEffect } from "react";
import type { User, AuthState, UserRole } from "@/types";
import { CENTRAL_DEMO_USERS } from "@/data/centralDataset";

// ─── Context Types ────────────────────────────────────────────────
interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  /** Demo / Evaluation role switcher — obtains a real signed JWT for the target persona. */
  switchRole: (role: UserRole) => Promise<void>;
}

// ─── Reducer ──────────────────────────────────────────────────────
type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOGIN_SUCCESS"; payload: { user: User; token: string } }
  | { type: "LOGOUT" }
  | { type: "UPDATE_USER"; payload: Partial<User> };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case "LOGOUT":
      return { ...initialState, isLoading: false };
    case "UPDATE_USER":
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("auth_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        dispatch({ type: "LOGIN_SUCCESS", payload: { user, token } });
      } catch {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    } else {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      let user: User;
      let token: string;

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (response.ok) {
          const res = await response.json();
          user = res.data.user;
          token = res.data.token;
        } else {
          throw new Error("API call failed");
        }
      } catch {
        // Fallback for demo testing when backend is not connected:
        // Map identifier to the appropriate regulatory role from CENTRAL_DEMO_USERS
        const lower = email.toLowerCase();
        if (lower.includes("registrar") || lower.includes("dtu") || lower.includes("inst")) {
          user = CENTRAL_DEMO_USERS.institution;
        } else if (lower.includes("approv")) {
          user = CENTRAL_DEMO_USERS.approver;
        } else if (lower.includes("admin")) {
          user = CENTRAL_DEMO_USERS.admin;
        } else {
          user = CENTRAL_DEMO_USERS.officer;
        }
        token = "demo-jwt-token-" + Date.now();
      }

      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));
      dispatch({ type: "LOGIN_SUCCESS", payload: { user, token } });
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      throw error;
    }
  };

  /**
   * View-As / Demo Role Switcher.
   * Calls the backend /auth/switch-role endpoint to obtain a properly signed JWT
   * for the target persona, so backend authorization is exercised correctly during
   * jury demonstration and testing.
   *
   * This is a DEMONSTRATION tool — the real role is derived from the signed JWT by
   * the backend on every API call. Changing localStorage directly does not elevate
   * privileges for backend operations.
   */
  const switchRole = async (role: UserRole): Promise<void> => {
    try {
      const response = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (response.ok) {
        const res = await response.json();
        const { token, user } = res.data;
        localStorage.setItem("auth_token", token);
        localStorage.setItem("auth_user", JSON.stringify(user));
        dispatch({ type: "LOGIN_SUCCESS", payload: { user, token } });
        return;
      }
    } catch {
      // Backend not reachable — fall back to offline demo persona
    }

    // Offline fallback (demo only — backend still enforces real role from JWT)
    let targetUser: User;
    if (role === "institution_representative" || role === "depositor") {
      targetUser = CENTRAL_DEMO_USERS.institution;
    } else if (role === "approving_authority") {
      targetUser = CENTRAL_DEMO_USERS.approver;
    } else if (role === "admin") {
      targetUser = CENTRAL_DEMO_USERS.admin;
    } else {
      targetUser = CENTRAL_DEMO_USERS.officer;
    }
    const token = "demo-offline-" + Date.now();
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(targetUser));
    dispatch({ type: "LOGIN_SUCCESS", payload: { user: targetUser, token } });
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    dispatch({ type: "LOGOUT" });
  };

  const updateUser = (updates: Partial<User>) => {
    if (state.user) {
      const updated = { ...state.user, ...updates };
      localStorage.setItem("auth_user", JSON.stringify(updated));
      dispatch({ type: "UPDATE_USER", payload: updates });
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
