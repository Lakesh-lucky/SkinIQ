import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{
    success: boolean;
    requires_otp?: boolean;
    masked_email?: string;
    email?: string;
    cooldown_seconds?: number;
    error?: string;
  }>;
  verifyLoginOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  resendLoginOtp: (email: string) => Promise<{ success: boolean; message?: string; error?: string; cooldown_seconds?: number }>;
  verifySignupOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  resendSignupOtp: (email: string) => Promise<{ success: boolean; message?: string; error?: string; cooldown_seconds?: number }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; masked_email?: string; error?: string }>;
  verifyResetOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  registerDoctor: (data: any) => Promise<{
    success: boolean;
    requires_otp?: boolean;
    message?: string;
    email?: string;
    masked_email?: string;
    cooldown_seconds?: number;
    doctor_code?: string;
    error?: string;
  }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'dermaclass_doctor_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and verify existing token on startup
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        try {
          const res = await api.auth.getMe(storedToken);
          if (res.success && res.user) {
            setCurrentUser(res.user);
            setToken(storedToken);
          } else {
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setCurrentUser(null);
          }
        } catch {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setCurrentUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.auth.login(email.trim(), password);
      if (res.success && res.requires_otp) {
        return {
          success: true,
          requires_otp: true,
          masked_email: res.masked_email,
          email: res.email,
          message: res.message,
          cooldown_seconds: res.cooldown_seconds || 60,
          dev_otp: (res as any).dev_otp
        };
      }
      return { success: false, error: 'Unexpected login response.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed. Please check your credentials.' };
    }
  };

  const verifyLoginOtp = async (email: string, otp: string) => {
    try {
      const res = await api.auth.verifyLoginOtp(email.trim(), otp.trim());
      if (res.success && res.access_token && res.user) {
        localStorage.setItem(TOKEN_KEY, res.access_token);
        setToken(res.access_token);
        setCurrentUser(res.user);
        return { success: true };
      }
      return { success: false, error: 'Verification failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid or expired OTP code.' };
    }
  };

  const resendLoginOtp = async (email: string) => {
    try {
      const res = await api.auth.resendLoginOtp(email.trim());
      if (res.success) {
        return { success: true, message: res.message, cooldown_seconds: res.cooldown_seconds, dev_otp: (res as any).dev_otp };
      }
      return { success: false, error: 'Could not resend OTP.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to resend code.' };
    }
  };

  const verifySignupOtp = async (email: string, otp: string) => {
    try {
      const res = await api.auth.verifySignupOtp(email.trim(), otp.trim());
      if (res.success && res.access_token && res.user) {
        localStorage.setItem(TOKEN_KEY, res.access_token);
        setToken(res.access_token);
        setCurrentUser(res.user);
        return { success: true };
      }
      return { success: false, error: 'Registration verification failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid or expired OTP code.' };
    }
  };

  const resendSignupOtp = async (email: string) => {
    try {
      const res = await api.auth.resendSignupOtp(email.trim());
      if (res.success) {
        return { success: true, message: res.message, cooldown_seconds: res.cooldown_seconds, dev_otp: (res as any).dev_otp };
      }
      return { success: false, error: 'Could not resend verification code.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to resend code.' };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await api.auth.forgotPassword(email.trim());
      if (res.success) {
        return { success: true, message: res.message, masked_email: res.masked_email };
      }
      return { success: false, error: 'Request failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to process password reset request.' };
    }
  };

  const verifyResetOtp = async (email: string, otp: string) => {
    try {
      const res = await api.auth.verifyResetOtp(email.trim(), otp.trim());
      if (res.success) {
        return { success: true };
      }
      return { success: false, error: 'Code verification failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid or expired OTP.' };
    }
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    try {
      const res = await api.auth.resetPassword(email.trim(), otp.trim(), newPassword);
      if (res.success) {
        return { success: true, message: res.message };
      }
      return { success: false, error: 'Password update failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update password.' };
    }
  };

  const registerDoctor = async (data: any) => {
    try {
      const res = await api.auth.registerDoctor(data);
      if (res.success) {
        return {
          success: true,
          requires_otp: res.requires_otp,
          message: res.message,
          email: res.email,
          masked_email: res.masked_email,
          cooldown_seconds: res.cooldown_seconds,
          doctor_code: res.doctor_code,
          dev_otp: (res as any).dev_otp
        };
      }
      return { success: false, error: 'Registration failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed.' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await api.auth.changePassword(currentPassword, newPassword, token || undefined);
      if (res.success) {
        return { success: true, message: res.message };
      }
      return { success: false, error: 'Password change failed.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to change password.' };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
  };

  const refreshUser = async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      try {
        const res = await api.auth.getMe(storedToken);
        if (res.success && res.user) {
          setCurrentUser(res.user);
        }
      } catch {
        // Ignore
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        verifyLoginOtp,
        resendLoginOtp,
        verifySignupOtp,
        resendSignupOtp,
        forgotPassword,
        verifyResetOtp,
        resetPassword,
        registerDoctor,
        changePassword,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
