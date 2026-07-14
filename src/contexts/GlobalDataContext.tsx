import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, orderBy, getDocs, onSnapshot } from '@/lib/trackedFirestore';
import { db } from '../lib/firebase';
import type { Vehicle, Company, Model, Party, Purchase, Sale, VehicleColor } from '../types';
import { toast } from 'sonner';

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
  const activeListeners = useRef<Set<string>>(new Set());

  const addError = useCallback((msg: string, e: any) => {
    setData(prev => ({
      ...prev,
      subscriptionErrors: [...(prev.subscriptionErrors || []), `${msg}: ${e.message || String(e)}`]
    }));
  }, []);

  const setupListener = useCallback((name: string, path: string, mapFunc?: (doc: any) => any, sortFunc?: (a: any, b: any) => number) => {
    if (activeListeners.current.has(name)) return;
    activeListeners.current.add(name);
    
    try {
      const q = collection(db, path);
      const unsub = onSnapshot(q, (snapshot) => {
        let docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        if (mapFunc) docs = docs.map(mapFunc);
        if (sortFunc) docs = docs.sort(sortFunc);

        if (!snapshot.metadata.hasPendingWrites) {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              const docData = change.doc.data();
              if (name === 'vehicles') toast.info(`🚗 New vehicle added: Chassis ${change.doc.id}`, { duration: 5000 });
              else if (name === 'purchases') toast.info(`🧾 New purchase: Invoice #${docData.invoiceNumber || change.doc.id}`, { duration: 5000 });
              else if (name === 'sales') toast.info(`💰 New sale for Chassis ${docData.chassisNumber || ''}`, { duration: 5000 });
              else if (name === 'parties') toast.info(`👤 New party: ${docData.name || ''}`, { duration: 5000 });
            } else if (change.type === 'modified') {
              if (name === 'vehicles') toast.info(`🔄 Vehicle ${change.doc.id} updated.`, { duration: 4000 });
              else if (name === 'sales') toast.info(`🔄 Sale status updated.`, { duration: 4000 });
            }
          });
        }

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
      return unsub;
    } catch (err) {
      console.error(`Failed to setup subscription for ${name}:`, err);
      addError(name.toUpperCase(), err);
      setData(prev => ({ ...prev, [`is${name.charAt(0).toUpperCase() + name.slice(1)}Loaded`]: true }));
      return () => {};
    }
  }, [addError]);

  // Initial load for small reference collections
  useEffect(() => {
    let unsubs: (() => void)[] = [];
    
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

    return () => {
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

  return (
    <GlobalDataContext.Provider value={{
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
