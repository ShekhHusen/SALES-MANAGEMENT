import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, orderBy, getDocs, onSnapshot } from '@/lib/trackedFirestore';
import { db } from '../lib/firebase';
import type { Vehicle, Company, Model, Party, Purchase, Sale, VehicleColor, BusinessProfile } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface GlobalDataState {
  vehicles: Vehicle[];
  companies: Company[];
  models: Model[];
  colors: VehicleColor[];
  businessProfile: BusinessProfile | null;
  updateBusinessProfile: (profile: BusinessProfile) => Promise<void>;
  parties: Party[];
  purchases: Purchase[];
  sales: Sale[];
  loading: boolean;
  debugStates?: any;
  subscriptionErrors?: string[];
  
  isVehiclesLoaded: boolean;
  isPurchasesLoaded: boolean;
  isSalesLoaded: boolean;
  isPartiesLoaded: boolean;
  
  loadVehicles: () => void;
  loadPurchases: () => void;
  loadSales: () => void;
  loadParties: () => void;
  loadProcessDocumentData: () => void;
}

const initialState: GlobalDataState = {
  vehicles: [],
  companies: [],
  models: [],
  colors: [],
  businessProfile: null,
  updateBusinessProfile: async () => {},
  parties: [],
  purchases: [],
  sales: [],
  loading: true,
  debugStates: {},
  subscriptionErrors: [],
  isVehiclesLoaded: false,
  isPurchasesLoaded: false,
  isSalesLoaded: false,
  isPartiesLoaded: false,
  loadVehicles: () => {},
  loadPurchases: () => {},
  loadSales: () => {},
  loadParties: () => {},
  loadProcessDocumentData: () => {},
};

const GlobalDataContext = createContext<GlobalDataState>(initialState);

export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<GlobalDataState>(initialState);
  const addError = useCallback((name: string, err: any) => {
    setData(prev => ({
      ...prev,
      subscriptionErrors: [...(prev.subscriptionErrors || []), `Failed to load ${name}: ${err?.message || err}`]
    }));
  }, []);

  const activeListeners = useRef<Set<string>>(new Set());
  const unsubsRef = useRef<Map<string, () => void>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
  
  const updateBusinessProfile = async (profile: BusinessProfile) => {
    try {
      const docRef = doc(db, 'settings', 'businessProfile');
      await setDoc(docRef, profile, { merge: true });
      setData(prev => ({ ...prev, businessProfile: profile }));
    } catch (err) {
      console.error('Failed to update business profile:', err);
      throw err;
    }
  };

  return (
) => {
      unsubsRef.current.forEach(unsub => unsub());
      unsubsRef.current.clear();
      activeListeners.current.clear();
    };
  }, []);

  const setupListener = useCallback((name: string, path: string, mapFunc?: (doc: any) => any, sortFunc?: (a: any, b: any) => number) => {
    if (activeListeners.current.has(name)) return;
    activeListeners.current.add(name);
    
    let isInitialSnapshot = true;

    try {
      const q = collection(db, path);
      const unsub = onSnapshot(q, (snapshot) => {
        let docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        if (mapFunc) docs = docs.map(mapFunc);
        if (sortFunc) docs = docs.sort(sortFunc);

        isInitialSnapshot = false;

        setData(prev => ({
          ...prev,
          [name]: docs,
          [`is${name.charAt(0).toUpperCase() + name.slice(1)}Loaded`]: true
        }));
      }, (err) => {
        console.error(`Error in subscription for ${name}:`, err);
        addError(name.toUpperCase(), err);
        setData(prev => ({ ...prev, [`is${name.charAt(0).toUpperCase() + name.slice(1)}Loaded`]: true }));
      });
      unsubsRef.current.set(name, unsub);
      return unsub;
    } catch (err) {
      console.error(`Failed to setup subscription for ${name}:`, err);
      addError(name.toUpperCase(), err);
      setData(prev => ({ ...prev, [`is${name.charAt(0).toUpperCase() + name.slice(1)}Loaded`]: true }));
    
  const updateBusinessProfile = async (profile: BusinessProfile) => {
    try {
      const docRef = doc(db, 'settings', 'businessProfile');
      await setDoc(docRef, profile, { merge: true });
      setData(prev => ({ ...prev, businessProfile: profile }));
    } catch (err) {
      console.error('Failed to update business profile:', err);
      throw err;
    }
  };

  return (
) => {};
    }
  }, [addError]);

  // Initial load for small reference collections
  useEffect(() => {
    let unsubs: (() => void)[] = [];
    

    // Load Business Profile
    const loadBusinessProfile = async () => {
      try {
        const docRef = doc(db, 'settings', 'businessProfile');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData(prev => ({ ...prev, businessProfile: docSnap.data() as BusinessProfile }));
        }
      } catch (err) {
        console.error('Failed to load business profile:', err);
      }
    };
    loadBusinessProfile();

    const smallCollections = [

      { name: 'companies', path: 'companies' },
      { name: 'models', path: 'models' },
      { name: 'colors', path: 'colors' }
    ];

    smallCollections.forEach(({ name, path }) => {
      const unsub = setupListener(name, path, d => d as any);
      if (unsub) unsubs.push(unsub);
    });

    // Mark global loading as false once initial setup is done
    // In a real app we might wait for these small collections to load
    setData(prev => ({ ...prev, loading: false }));

  
  const updateBusinessProfile = async (profile: BusinessProfile) => {
    try {
      const docRef = doc(db, 'settings', 'businessProfile');
      await setDoc(docRef, profile, { merge: true });
      setData(prev => ({ ...prev, businessProfile: profile }));
    } catch (err) {
      console.error('Failed to update business profile:', err);
      throw err;
    }
  };

  return (
) => {
      unsubs.forEach(u => u());
    };
  }, [setupListener]);

  const loadVehicles = useCallback(() => {
    setupListener('vehicles', 'vehicles', 
      d => ({ ...d, chassisNumber: d.id } as Vehicle),
      (a, b) => ((b.updatedAt as any)?.toMillis?.() || 0) - ((a.updatedAt as any)?.toMillis?.() || 0)
    );
  }, [setupListener]);

  const loadPurchases = useCallback(() => {
    setupListener('purchases', 'purchases', 
      d => d as Purchase,
      (a, b) => ((b.date as any)?.toMillis?.() || 0) - ((a.date as any)?.toMillis?.() || 0)
    );
  }, [setupListener]);

  const loadSales = useCallback(() => {
    setupListener('sales', 'sales', 
      d => d as Sale,
      (a, b) => ((b.date as any)?.toMillis?.() || 0) - ((a.date as any)?.toMillis?.() || 0)
    );
  }, [setupListener]);

  const loadParties = useCallback(() => {
    setupListener('parties', 'parties', d => d as Party);
  }, [setupListener]);

  const loadProcessDocumentData = useCallback(() => {
    loadSales();
    loadParties();
    loadVehicles();
  }, [loadSales, loadParties, loadVehicles]);


  const updateBusinessProfile = async (profile: BusinessProfile) => {
    try {
      const docRef = doc(db, 'settings', 'businessProfile');
      await setDoc(docRef, profile, { merge: true });
      setData(prev => ({ ...prev, businessProfile: profile }));
    } catch (err) {
      console.error('Failed to update business profile:', err);
      throw err;
    }
  };

  return (

    <GlobalDataContext.Provider value={{
      ...data,
      updateBusinessProfile,
      ...data,
      loadVehicles,
      loadPurchases,
      loadSales,
      loadParties,
      loadProcessDocumentData
    }}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export const useGlobalData = () => {
  return useContext(GlobalDataContext);
};
