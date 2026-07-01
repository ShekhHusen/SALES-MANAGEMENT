import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from '@/lib/trackedFirestore';
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
  isPurchasesLoaded: false,
  isSalesLoaded: false,
  isFollowupsLoaded: false,
  isProcessDocumentLoaded: false,
  loadPurchases: () => {},
  loadSales: () => {},
  loadFollowups: () => {},
  loadProcessDocumentData: () => {},
};

const GlobalDataContext = createContext<GlobalDataState>(initialState);

export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<GlobalDataState>(initialState);
  
  // Keep track of active subscriptions so we don't start them twice
  const subscriptions = React.useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    let active = true;
    
    // We track whether each collection has loaded at least once
    const loadedStates = {
      vehicles: false,
      companies: false,
      models: false,
      colors: false,
      parties: false,
    };

    const checkLoading = () => {
      setData(prev => ({ ...prev, debugStates: { ...loadedStates } }));
      if (
        loadedStates.vehicles &&
        loadedStates.companies &&
        loadedStates.models &&
        loadedStates.colors &&
        loadedStates.parties
      ) {
        if (active) {
          setData(prev => ({ ...prev, loading: false }));
        }
      }
    };
    checkLoading();

    // Fallback: force finish loading after 5 seconds 
    // to prevent infinite loading spinner if a collection lacks permissions or is stuck
    const fallbackTimeout = setTimeout(() => {
        if (active) {
            console.warn("GlobalData context loading timed out. Forcing loading: false.", loadedStates);
            setData(prev => ({ ...prev, loading: false }));
        }
    }, 5000);

    const addError = (msg: string, e: any) => {
        setData(prev => ({
            ...prev,
            subscriptionErrors: [...(prev.subscriptionErrors || []), `${msg}: ${e.message || String(e)}`]
        }));
    };

    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (s) => {
      if(active) {
        const sorted = s.docs.map(d => ({ ...d.data(), id: d.id, chassisNumber: d.id } as Vehicle)).sort((a, b) => {
          const tA = (a.updatedAt as any)?.toMillis?.() || 0;
          const tB = (b.updatedAt as any)?.toMillis?.() || 0;
          return tB - tA;
        });
        setData(prev => ({ ...prev, vehicles: sorted }));
        loadedStates.vehicles = true;
        checkLoading();
      }
    }, (error) => {
      console.error("Vehicles subscription error", error);
      if(active) { addError("Vehicles", error); loadedStates.vehicles = true; checkLoading(); }
    });
    const unsubCompanies = onSnapshot(collection(db, 'companies'), (s) => {
      if(active) {
        setData(prev => ({ ...prev, companies: s.docs.map(d => ({ ...d.data(), id: d.id } as Company)) }));
        loadedStates.companies = true;
        checkLoading();
      }
    }, (error) => {
      console.error("Companies subscription error", error);
      if(active) { addError("Companies", error); loadedStates.companies = true; checkLoading(); }
    });
    const unsubModels = onSnapshot(collection(db, 'models'), (s) => {
      if(active) {
        setData(prev => ({ ...prev, models: s.docs.map(d => ({ ...d.data(), id: d.id } as Model)) }));
        loadedStates.models = true;
        checkLoading();
      }
    }, (error) => {
      console.error("Models subscription error", error);
      if(active) { addError("Models", error); loadedStates.models = true; checkLoading(); }
    });
    const unsubColors = onSnapshot(collection(db, 'colors'), (s) => {
      if(active) {
        setData(prev => ({ ...prev, colors: s.docs.map(d => ({ ...d.data(), id: d.id } as VehicleColor)) }));
        loadedStates.colors = true;
        checkLoading();
      }
    }, (error) => {
      console.error("Colors subscription error", error);
      if(active) { addError("Colors", error); loadedStates.colors = true; checkLoading(); }
    });
    const unsubParties = onSnapshot(collection(db, 'parties'), (s) => {
      if(active) {
        setData(prev => ({ ...prev, parties: s.docs.map(d => ({ ...d.data(), id: d.id } as Party)) }));
        loadedStates.parties = true;
        checkLoading();
      }
    }, (error) => {
      console.error("Parties subscription error", error);
      if(active) { addError("Parties", error); loadedStates.parties = true; checkLoading(); }
    });

    return () => {
      active = false;
      clearTimeout(fallbackTimeout);
      unsubVehicles(); unsubCompanies(); unsubModels(); unsubColors(); unsubParties();
    };
  }, []);

  const loadPurchases = () => {
    if (subscriptions.current['purchases']) return;
    subscriptions.current['purchases'] = true;
    onSnapshot(collection(db, 'purchases'), (s) => {
      const sorted = s.docs.map(d => ({ ...d.data(), id: d.id } as Purchase)).sort((a, b) => {
        const tA = (a.date as any)?.toMillis?.() || 0;
        const tB = (b.date as any)?.toMillis?.() || 0;
        return tB - tA;
      });
      setData(prev => ({ ...prev, purchases: sorted, isPurchasesLoaded: true }));
    }, (error) => {
      console.error("Purchases subscription error", error);
    });
  };

  const loadSales = () => {
    if (subscriptions.current['sales']) return;
    subscriptions.current['sales'] = true;
    onSnapshot(collection(db, 'sales'), (s) => {
      const sorted = s.docs.map(d => ({ ...d.data(), id: d.id } as Sale)).sort((a, b) => {
        const tA = (a.date as any)?.toMillis?.() || 0;
        const tB = (b.date as any)?.toMillis?.() || 0;
        return tB - tA;
      });
      setData(prev => ({ ...prev, sales: sorted, isSalesLoaded: true }));
    }, (error) => {
      console.error("Sales subscription error", error);
    });
  };

  const loadFollowups = () => {
    if (subscriptions.current['followups']) return;
    subscriptions.current['followups'] = true;
    onSnapshot(query(collection(db, 'followups'), orderBy('createdAt', 'desc')), (s) => {
      setData(prev => ({ ...prev, followups: s.docs.map(d => ({ id: d.id, ...d.data() })), isFollowupsLoaded: true }));
    }, (error) => {
      console.error("Followups subscription error", error);
    });
  };

  const loadProcessDocumentData = () => {
    if (subscriptions.current['processDocument']) return;
    subscriptions.current['processDocument'] = true;
    // Process document data is primarily sales data in this app
    onSnapshot(collection(db, 'sales'), (s) => {
      const sorted = s.docs.map(d => ({ ...d.data(), id: d.id } as Sale)).sort((a, b) => {
        const tA = (a.date as any)?.toMillis?.() || 0;
        const tB = (b.date as any)?.toMillis?.() || 0;
        return tB - tA;
      });
      setData(prev => ({ ...prev, sales: sorted, isProcessDocumentLoaded: true, isSalesLoaded: true }));
    }, (error) => {
      console.error("Process Document subscription error", error);
    });
  };

  // Bind the load functions to the context state
  useEffect(() => {
    setData(prev => ({
      ...prev,
      loadPurchases,
      loadSales,
      loadFollowups,
      loadProcessDocumentData
    }));
  }, []);

  return (
    <GlobalDataContext.Provider value={data}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export const useGlobalData = () => {
  return useContext(GlobalDataContext);
};
