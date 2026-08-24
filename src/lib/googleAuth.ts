import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

const provider = new GoogleAuthProvider();
// Request Workspace scopes
provider.addScope('https://www.googleapis.com/auth/drive');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

const CACHE_KEY = 'google_oauth_token';

function getStoredToken(): string | null {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.token && parsed.expiresAt > Date.now()) {
        return parsed.token;
      } else {
        localStorage.removeItem(CACHE_KEY);
      }
    }
  } catch (e) {
    console.warn('Failed to read stored token', e);
  }
  return null;
}

function setStoredToken(token: string) {
  try {
    // Firebase Google Auth access tokens usually expire in 1 hour
    const expiresAt = Date.now() + 55 * 60 * 1000; // 55 minutes
    localStorage.setItem(CACHE_KEY, JSON.stringify({ token, expiresAt }));
  } catch (e) {
    console.warn('Failed to store token', e);
  }
}

function clearStoredToken() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (e) {}
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = cachedAccessToken || getStoredToken();
      if (token) {
        cachedAccessToken = token;
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      clearStoredToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    setStoredToken(cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || getStoredToken();
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  clearStoredToken();
};
