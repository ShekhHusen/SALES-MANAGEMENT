import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Vehicle, Company, Model, Party, Purchase, Sale } from '../types';

interface GlobalDataState {
  vehicles: Vehicle[];
  companies: Company[];
  models: Model[];
  parties: Party[];
  purchases: Purchase[];
  sales: Sale[];
  loading: boolean;
}

const initialState: GlobalDataState = {
  vehicles: [],
  companies: [],
  models: [],
  parties: [],
  purchases: [],
  sales: [],
  loading: true
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
      parties: false,
      purchases: false,
      sales: false,
    };

    const checkLoading = () => {
      if (
        loadedStates.vehicles &&
        loadedStates.companies &&
        loadedStates.models &&
        loadedStates.parties &&
        loadedStates.purchases &&
        loadedStates.sales
      ) {
        if (active) {
          setData(prev => ({ ...prev, loading: false }));
        }
      }
    };

    const unsubVehicles = onSnapshot(query(collection(db, 'vehicles'), orderBy('updatedAt', 'desc')), (s) => {
      if(active) {
        setData(prev => ({ ...prev, vehicles: s.docs.map(d => ({ ...d.data(), chassisNumber: d.id } as Vehicle)) }));
        loadedStates.vehicles = true;
        checkLoading();
      }
    });
    const unsubCompanies = onSnapshot(collection(db, 'companies'), (s) => {
      if(active) {
        setData(prev => ({ ...prev, companies: s.docs.map(d => ({ ...d.data(), id: d.id } as Company)) }));
        loadedStates.companies = true;
        checkLoading();
      }
    });
    const unsubModels = onSnapshot(collection(db, 'models'), (s) => {
      if(active) {
        setData(prev => ({ ...prev, models: s.docs.map(d => ({ ...d.data(), id: d.id } as Model)) }));
        loadedStates.models = true;
        checkLoading();
      }
    });
    const unsubParties = onSnapshot(collection(db, 'parties'), (s) => {
      if(active) {
        setData(prev => ({ ...prev, parties: s.docs.map(d => ({ ...d.data(), id: d.id } as Party)) }));
        loadedStates.parties = true;
        checkLoading();
      }
    });
    const unsubPurchases = onSnapshot(query(collection(db, 'purchases'), orderBy('date', 'desc')), (s) => {
      if(active) {
        setData(prev => ({ ...prev, purchases: s.docs.map(d => ({ ...d.data(), id: d.id } as Purchase)) }));
        loadedStates.purchases = true;
        checkLoading();
      }
    });
    const unsubSales = onSnapshot(query(collection(db, 'sales'), orderBy('date', 'desc')), (s) => {
      if(active) {
        setData(prev => ({ ...prev, sales: s.docs.map(d => ({ ...d.data(), id: d.id } as Sale)) }));
        loadedStates.sales = true;
        checkLoading();
      }
    });

    return () => {
      active = false;
      unsubVehicles(); unsubCompanies(); unsubModels(); unsubParties(); unsubPurchases(); unsubSales();
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
