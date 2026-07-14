import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from '@/lib/trackedFirestore';
import { auth, db } from '@/lib/firebase';
import { toast } from 'sonner';

export type UserRole = 'admin' | 'sales_manager' | 'inventory_clerk' | 'pending';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: any;
  hasSetPassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: (rememberMe?: boolean) => Promise<void>;
  loginWithEmail: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  signupWithEmail: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setUserPassword: (pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasSetPassword: boolean | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSetPassword, setHasSetPassword] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Check if password provider is linked safely without triggering enumeration errors
          const hasPasswordProvider = currentUser.providerData.some(
            provider => provider.providerId === 'password'
          );

          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            let needsUpdate = false;
            
            if (currentUser.email === 'husnailalam06@gmail.com' && data.role !== 'admin') {
              data.role = 'admin';
              needsUpdate = true;
            }
            if (hasPasswordProvider && !data.hasSetPassword) {
              data.hasSetPassword = true;
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              await setDoc(userDocRef, { ...data }, { merge: true });
            }
            
            setHasSetPassword(data.hasSetPassword || hasPasswordProvider);
            setUserProfile(data);
          } else {
            const newRole: UserRole = currentUser.email === 'husnailalam06@gmail.com' ? 'admin' : 'pending';
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: newRole,
              hasSetPassword: hasPasswordProvider,
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, newProfile);
            setHasSetPassword(hasPasswordProvider);
            setUserProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
        setHasSetPassword(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // Auto logout after 30 minutes of inactivity (30 * 60 * 1000 = 1800000 ms)
      timeoutId = setTimeout(() => {
        if (auth.currentUser) {
           signOut(auth).then(() => {
             toast.info('You have been logged out due to inactivity.', { duration: 6000 });
             window.location.href = '/';
           });
        }
      }, 1800000);
    };

    if (user) {
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('click', resetTimer);
      window.addEventListener('scroll', resetTimer);
      resetTimer();
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [user]);

  const loginWithGoogle = async (rememberMe = false) => {
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
      toast.success('Logged in successfully');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/user-mismatch' || error.code === 'auth/account-exists-with-different-credential') {
        toast.error('Account conflict detected. Please try logging in again and select the correct account.', { duration: 5000 });
        await signOut(auth);
      } else {
        toast.error(error.message || 'Failed to login with Google');
      }
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string, rememberMe = false) => {
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, pass);
      toast.success('Logged in successfully');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to login');
      throw error;
    }
  };

  const signupWithEmail = async (email: string, pass: string, rememberMe = false) => {
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await createUserWithEmailAndPassword(auth, email, pass);
      toast.success('Account created successfully');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to sign up');
      throw error;
    }
  };

  const setUserPassword = async (pass: string) => {
    if (!auth.currentUser) return;
    try {
      await updatePassword(auth.currentUser, pass);
      await auth.currentUser.reload();
      setHasSetPassword(true);
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userDocRef, { hasSetPassword: true }, { merge: true });
      toast.success('Password set successfully! You can now login with this password.');
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        toast.error('For security reasons, please log out and log back in to set your password.', { duration: 6000 });
      } else {
        console.error(error);
        toast.error(error.message || 'Failed to set password.');
      }
      throw error;
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to send password reset email.');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      window.location.href = '/';
    } catch (error) {
      console.error(error);
      toast.error('Failed to logout');
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, loginWithGoogle, loginWithEmail, signupWithEmail, logout, setUserPassword, resetPassword, hasSetPassword }}>
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

