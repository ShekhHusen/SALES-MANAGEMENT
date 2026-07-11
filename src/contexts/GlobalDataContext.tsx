import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, getDocs } from '@/lib/trackedFirestore';
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
  followups: any[];
  loading: boolean;
  debugStates?: any;
  subscriptionErrors?: string[];
  isPurchasesLoaded: boolean;
  isSalesLoaded: boolean;
  isFollowupsLoaded: boolean;
  isProcessDocumentLoaded: boolean;
  loadPurchases: () => void;
  loadSales: () => void;
  loadFollowups: () => void;
  loadProcessDocumentData: () => void;
  refreshVehicles: () => Promise<void>;
  refreshParties: () => Promise<void>;
  refreshPurchases: () => Promise<void>;
  refreshSales: () => Promise<void>;
  refreshFollowups: () => Promise<void>;
}

const initialState: GlobalDataState = {
  vehicles: [],
  companies: [],
  models: [],
  colors: [],
  parties: [],
  purchases: [],
  sales: [],
  followups: [],
  loading: true,
  debugStates: {},
  subscriptionErrors: [],
  isPurchasesLoaded: true,
  isSalesLoaded: true,
  isFollowupsLoaded: true,
  isProcessDocumentLoaded: true,
  loadPurchases: () => {},
  loadSales: () => {},
  loadFollowups: () => {},
  loadProcessDocumentData: () => {},
  refreshVehicles: async () => {},
  refreshParties: async () => {},
  refreshPurchases: async () => {},
  refreshSales: async () => {},
  refreshFollowups: async () => {},
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

  const refreshFollowups = useCallback(async () => {
    try {
      const s = await getDocs(query(collection(db, 'followups'), orderBy('createdAt', 'desc')));
      setData(prev => ({ ...prev, followups: s.docs.map(d => ({ id: d.id, ...d.data() })) }));
    } catch (e) {
      console.error(e);
      addError("Followups", e);
    }
  }, [addError]);

  useEffect(() => {
    let active = true;
    
    const loadAll = async () => {
      try {
        const [veh, comp, mod, col, part, pur, sal, fol] = await Promise.all([
          getDocs(collection(db, 'vehicles')),
          getDocs(collection(db, 'companies')),
          getDocs(collection(db, 'models')),
          getDocs(collection(db, 'colors')),
          getDocs(collection(db, 'parties')),
          getDocs(collection(db, 'purchases')),
          getDocs(collection(db, 'sales')),
          getDocs(query(collection(db, 'followups'), orderBy('createdAt', 'desc')))
        ]);

        if (active) {
          const sortedVehicles = veh.docs.map(d => ({ ...d.data(), id: d.id, chassisNumber: d.id } as Vehicle)).sort((a, b) => {
            const tA = (a.updatedAt as any)?.toMillis?.() || 0;
            const tB = (b.updatedAt as any)?.toMillis?.() || 0;
            return tB - tA;
          });

          const sortedPurchases = pur.docs.map(d => ({ ...d.data(), id: d.id } as Purchase)).sort((a, b) => {
            const tA = (a.date as any)?.toMillis?.() || 0;
            const tB = (b.date as any)?.toMillis?.() || 0;
            return tB - tA;
          });

          const sortedSales = sal.docs.map(d => ({ ...d.data(), id: d.id } as Sale)).sort((a, b) => {
            const tA = (a.date as any)?.toMillis?.() || 0;
            const tB = (b.date as any)?.toMillis?.() || 0;
            return tB - tA;
          });

          setData(prev => ({
            ...prev,
            vehicles: sortedVehicles,
            companies: comp.docs.map(d => ({ ...d.data(), id: d.id } as Company)),
            models: mod.docs.map(d => ({ ...d.data(), id: d.id } as Model)),
            colors: col.docs.map(d => ({ ...d.data(), id: d.id } as VehicleColor)),
            parties: part.docs.map(d => ({ ...d.data(), id: d.id } as Party)),
            purchases: sortedPurchases,
            sales: sortedSales,
            followups: fol.docs.map(d => ({ id: d.id, ...d.data() })),
            loading: false
          }));
        }
      } catch (e) {
        console.error("Error loading global data", e);
        if (active) {
          addError("Global Load", e);
          setData(prev => ({ ...prev, loading: false }));
        }
      }
    };

    loadAll();

    return () => {
      active = false;
    };
  }, [addError]);

  return (
    <GlobalDataContext.Provider value={{
      ...data,
      refreshVehicles,
      refreshParties,
      refreshPurchases,
      refreshSales,
      refreshFollowups
    }}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export const useGlobalData = () => {
  return useContext(GlobalDataContext);
};
