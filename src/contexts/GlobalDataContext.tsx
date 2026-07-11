import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, getDocs, onSnapshot } from '@/lib/trackedFirestore';
import { db } from '../lib/firebase';
import type { Vehicle, Company, Model, Party, Purchase, Sale, VehicleColor } from '../types';

interface GlobalDataState {
  vehicles: Vehicle[];
  companies: Company[];
  models: Model[];
  colors: VehicleColor[];
  parties: Party[];
  purchases: Purchase[];
  sales: Sale[];
  loading: boolean;
  debugStates?: any;
  subscriptionErrors?: string[];
  isPurchasesLoaded: boolean;
  isSalesLoaded: boolean;
  isProcessDocumentLoaded: boolean;
  loadPurchases: () => void;
  loadSales: () => void;
  loadProcessDocumentData: () => void;
  refreshVehicles: () => Promise<void>;
  refreshParties: () => Promise<void>;
  refreshPurchases: () => Promise<void>;
  refreshSales: () => Promise<void>;
}

const initialState: GlobalDataState = {
  vehicles: [],
  companies: [],
  models: [],
  colors: [],
  parties: [],
  purchases: [],
  sales: [],
  loading: true,
  debugStates: {},
  subscriptionErrors: [],
  isPurchasesLoaded: true,
  isSalesLoaded: true,
  isProcessDocumentLoaded: true,
  loadPurchases: () => {},
  loadSales: () => {},
  loadProcessDocumentData: () => {},
  refreshVehicles: async () => {},
  refreshParties: async () => {},
  refreshPurchases: async () => {},
  refreshSales: async () => {},
};

const GlobalDataContext = createContext<GlobalDataState>(initialState);

export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<GlobalDataState>(initialState);

  const addError = useCallback((msg: string, e: any) => {
    setData(prev => ({
      ...prev,
      subscriptionErrors: [...(prev.subscriptionErrors || []), `${msg}: ${e.message || String(e)}`]
    }));
  }, []);

  const refreshVehicles = useCallback(async () => {
    try {
      const s = await getDocs(collection(db, 'vehicles'));
      const sorted = s.docs.map(d => ({ ...d.data(), id: d.id, chassisNumber: d.id } as Vehicle)).sort((a, b) => {
        const tA = (a.updatedAt as any)?.toMillis?.() || 0;
        const tB = (b.updatedAt as any)?.toMillis?.() || 0;
        return tB - tA;
      });
      setData(prev => ({ ...prev, vehicles: sorted }));
    } catch (e) {
      console.error(e);
      addError("Vehicles", e);
    }
  }, [addError]);

  const refreshParties = useCallback(async () => {
    try {
      const s = await getDocs(collection(db, 'parties'));
      setData(prev => ({ ...prev, parties: s.docs.map(d => ({ ...d.data(), id: d.id } as Party)) }));
    } catch (e) {
      console.error(e);
      addError("Parties", e);
    }
  }, [addError]);

  const refreshPurchases = useCallback(async () => {
    try {
      const s = await getDocs(collection(db, 'purchases'));
      const sorted = s.docs.map(d => ({ ...d.data(), id: d.id } as Purchase)).sort((a, b) => {
        const tA = (a.date as any)?.toMillis?.() || 0;
        const tB = (b.date as any)?.toMillis?.() || 0;
        return tB - tA;
      });
      setData(prev => ({ ...prev, purchases: sorted }));
    } catch (e) {
      console.error(e);
      addError("Purchases", e);
    }
  }, [addError]);

  const refreshSales = useCallback(async () => {
    try {
      const s = await getDocs(collection(db, 'sales'));
      const sorted = s.docs.map(d => ({ ...d.data(), id: d.id } as Sale)).sort((a, b) => {
        const tA = (a.date as any)?.toMillis?.() || 0;
        const tB = (b.date as any)?.toMillis?.() || 0;
        return tB - tA;
      });
      setData(prev => ({ ...prev, sales: sorted }));
    } catch (e) {
      console.error(e);
      addError("Sales", e);
    }
  }, [addError]);

  useEffect(() => {
    let active = true;
    const unsubscribes: (() => void)[] = [];

    const collectionsToListen = [
      { name: 'vehicles' as const, path: 'vehicles' },
      { name: 'companies' as const, path: 'companies' },
      { name: 'models' as const, path: 'models' },
      { name: 'colors' as const, path: 'colors' },
      { name: 'parties' as const, path: 'parties' },
      { name: 'purchases' as const, path: 'purchases' },
      { name: 'sales' as const, path: 'sales' }
    ];

    const initialLoaded = {
      vehicles: false,
      companies: false,
      models: false,
      colors: false,
      parties: false,
      purchases: false,
      sales: false
    };

    const checkLoadingFinished = () => {
      if (
        initialLoaded.vehicles &&
        initialLoaded.companies &&
        initialLoaded.models &&
        initialLoaded.colors &&
        initialLoaded.parties &&
        initialLoaded.purchases &&
        initialLoaded.sales
      ) {
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    collectionsToListen.forEach(({ name, path }) => {
      try {
        const q = collection(db, path);
        const unsub = onSnapshot(q, (snapshot) => {
          if (!active) return;

          let sortedDocs: any[] = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

          if (name === 'vehicles') {
            sortedDocs = snapshot.docs.map(d => ({ ...d.data(), id: d.id, chassisNumber: d.id } as Vehicle)).sort((a, b) => {
              const tA = (a.updatedAt as any)?.toMillis?.() || 0;
              const tB = (b.updatedAt as any)?.toMillis?.() || 0;
              return tB - tA;
            });
          } else if (name === 'purchases') {
            sortedDocs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Purchase)).sort((a, b) => {
              const tA = (a.date as any)?.toMillis?.() || 0;
              const tB = (b.date as any)?.toMillis?.() || 0;
              return tB - tA;
            });
          } else if (name === 'sales') {
            sortedDocs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Sale)).sort((a, b) => {
              const tA = (a.date as any)?.toMillis?.() || 0;
              const tB = (b.date as any)?.toMillis?.() || 0;
              return tB - tA;
            });
          } else if (name === 'companies') {
            sortedDocs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Company));
          } else if (name === 'models') {
            sortedDocs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Model));
          } else if (name === 'colors') {
            sortedDocs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as VehicleColor));
          } else if (name === 'parties') {
            sortedDocs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Party));
          }

          setData(prev => ({
            ...prev,
            [name]: sortedDocs
          }));

          initialLoaded[name] = true;
          checkLoadingFinished();
        }, (err) => {
          console.error(`Error in real-time subscription for ${name}:`, err);
          addError(name.toUpperCase(), err);
          
          initialLoaded[name] = true;
          checkLoadingFinished();
        });

        unsubscribes.push(unsub);
      } catch (err) {
        console.error(`Failed to setup subscription for ${name}:`, err);
        addError(name.toUpperCase(), err);
        initialLoaded[name] = true;
        checkLoadingFinished();
      }
    });

    return () => {
      active = false;
      unsubscribes.forEach(unsub => unsub());
    };
  }, [addError]);

  return (
    <GlobalDataContext.Provider value={{
      ...data,
      refreshVehicles,
      refreshParties,
      refreshPurchases,
      refreshSales
    }}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export const useGlobalData = () => {
  return useContext(GlobalDataContext);
};
