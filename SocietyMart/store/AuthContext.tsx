import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { api } from '../config/api';

// Define our centralized state types
interface AuthState {
  sessionToken: string | null;
  user: any | null;
  isRegistrationComplete: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  completeRegistration: (user: any) => void;
  refreshUser: () => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    sessionToken: null,
    user: null,
    isRegistrationComplete: false,
    isLoading: true,
  });

  // Helper to sync user with backend
  const syncWithBackend = async (token: string) => {
    const response = await api.post('/auth/login', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  };

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthContext] Firebase User state changed:', firebaseUser ? 'Logged In' : 'Logged Out');
      
      if (firebaseUser) {
        try {
          // Get the ID Token (JWT) from Firebase
          const idToken = await firebaseUser.getIdToken();
          
          // Sync with our backend
          const data = await syncWithBackend(idToken);
          
          setState({
            sessionToken: idToken,
            user: data.user || null,
            isRegistrationComplete: !data.isNewUser,
            isLoading: false,
          });
        } catch (error) {
          console.error('[AuthContext] Backend sync failed:', error);
          // Still set the token so the user can try again or access protected local routes
          const idToken = await firebaseUser.getIdToken();
          setState((prev) => ({ ...prev, sessionToken: idToken, isLoading: false }));
        }
      } else {
        setState({
          sessionToken: null,
          user: null,
          isRegistrationComplete: false,
          isLoading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const completeRegistration = async (userData: any) => {
    try {
      const response = await api.post('/auth/complete-registration', userData);
      setState((prev) => ({
        ...prev,
        user: response.data.user,
        isRegistrationComplete: true,
      }));
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
    if (state.sessionToken) {
      try {
        const data = await syncWithBackend(state.sessionToken);
        setState((prev) => ({
          ...prev,
          user: data.user || null,
          isRegistrationComplete: !data.isNewUser,
        }));
        return data.user;
      } catch (error) {
        console.error('[AuthContext] refreshUser failed:', error);
        throw error;
      }
    }
    return null;
  };

  const logout = async () => {
    // Notify the backend asynchronously (fire-and-forget) to keep the client responsive
    if (state.sessionToken) {
      api.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${state.sessionToken}` }
      }).catch((err) => {
        console.warn('[AuthContext] Background backend logout notify failed:', err.message);
      });
    }

    // Instantly reset the local auth state so that navigation redirects the user to splash/login immediately
    setState({
      sessionToken: null,
      user: null,
      isRegistrationComplete: false,
      isLoading: false,
    });

    // Sign out from Firebase immediately
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ ...state, completeRegistration, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
