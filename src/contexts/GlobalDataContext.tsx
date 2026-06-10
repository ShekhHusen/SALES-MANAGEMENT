import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
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
  subscriptionErrors: []
};

const GlobalDataContext = createContext<GlobalDataState>(initialState);

export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<GlobalDataState>(initialState);

  useEffect(() => {
    let active = true;
    
    // We track whether each collection has loaded at least once
    const loadedStates = {
      vehicles: false,
      companies: false,
      models: false,
      colors: false,
      parties: false,
      purchases: false,
      sales: false,
    };

    const checkLoading = () => {
      setData(prev => ({ ...prev, debugStates: { ...loadedStates } }));
      if (
        loadedStates.vehicles &&
        loadedStates.companies &&
        loadedStates.models &&
        loadedStates.colors &&
        loadedStates.parties &&
        loadedStates.purchases &&
        loadedStates.sales
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
    const unsubPurchases = onSnapshot(collection(db, 'purchases'), (s) => {
      if(active) {
        const sorted = s.docs.map(d => ({ ...d.data(), id: d.id } as Purchase)).sort((a, b) => {
          const tA = (a.date as any)?.toMillis?.() || 0;
          const tB = (b.date as any)?.toMillis?.() || 0;
          return tB - tA;
        });
        setData(prev => ({ ...prev, purchases: sorted }));
        loadedStates.purchases = true;
        checkLoading();
      }
    }, (error) => {
      console.error("Purchases subscription error", error);
      if(active) { addError("Purchases", error); loadedStates.purchases = true; checkLoading(); }
    });
    const unsubSales = onSnapshot(collection(db, 'sales'), (s) => {
      if(active) {
        const sorted = s.docs.map(d => ({ ...d.data(), id: d.id } as Sale)).sort((a, b) => {
          const tA = (a.date as any)?.toMillis?.() || 0;
          const tB = (b.date as any)?.toMillis?.() || 0;
          return tB - tA;
        });
        setData(prev => ({ ...prev, sales: sorted }));
        loadedStates.sales = true;
        checkLoading();
      }
    }, (error) => {
      console.error("Sales subscription error", error);
      if(active) { addError("Sales", error); loadedStates.sales = true; checkLoading(); }
    });

    return () => {
      active = false;
      clearTimeout(fallbackTimeout);
      unsubVehicles(); unsubCompanies(); unsubModels(); unsubColors(); unsubParties(); unsubPurchases(); unsubSales();
    };
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
