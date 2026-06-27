import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, onSnapshot, getCountFromServer, query, where, Timestamp } from '@/lib/trackedFirestore';
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
  loadedScopes?: Record<string, 'none' | '1-week' | 'all'>;
  cardTotals?: {
    totalInventory: number;
    totalProcurement: number;
    totalSales: number;
    inStock: number;
  };
  loadAllCollection?: (col: 'vehicles' | 'purchases' | 'sales' | 'parties') => void;
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
  loadedScopes: {
    dashboard: 'none',
    vehicles: 'none',
    purchases: 'none',
    sales: 'none',
    parties: 'none',
  }
};

const GlobalDataContext = createContext<GlobalDataState>(initialState);

export const GlobalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<GlobalDataState>(initialState);
  const location = useLocation();
  const listenersRef = useRef<Record<string, () => void>>({});
  const loadedScopesRef = useRef<Record<string, 'none' | '1-week' | 'all'>>({
    dashboard: 'none',
    vehicles: 'none',
    purchases: 'none',
    sales: 'none',
    parties: 'none',
  });

  const addError = (msg: string, e: any) => {
    setData(prev => ({
      ...prev,
      subscriptionErrors: [...(prev.subscriptionErrors || []), `${msg}: ${e.message || String(e)}`]
    }));
  };

  // 1. App Load: ONLY load Brand (companies), Variant (models), Color (colors) immediately
  useEffect(() => {
    let active = true;
    const loadedStates = { companies: false, models: false, colors: false };

    const checkLoading = () => {
      setData(prev => ({ ...prev, debugStates: { ...loadedStates } }));
      if (loadedStates.companies && loadedStates.models && loadedStates.colors) {
        if (active) setData(prev => ({ ...prev, loading: false }));
      }
    };

    const fallbackTimeout = setTimeout(() => {
      if (active) {
        setData(prev => ({ ...prev, loading: false }));
      }
    }, 4000);

    const unsubCompanies = onSnapshot(collection(db, 'companies'), (s) => {
      if (active) {
        setData(prev => ({ ...prev, companies: s.docs.map(d => ({ ...d.data(), id: d.id } as Company)) }));
        loadedStates.companies = true;
        checkLoading();
      }
    }, (err) => { addError("Companies", err); loadedStates.companies = true; checkLoading(); });

    const unsubModels = onSnapshot(collection(db, 'models'), (s) => {
      if (active) {
        setData(prev => ({ ...prev, models: s.docs.map(d => ({ ...d.data(), id: d.id } as Model)) }));
        loadedStates.models = true;
        checkLoading();
      }
    }, (err) => { addError("Models", err); loadedStates.models = true; checkLoading(); });

    const unsubColors = onSnapshot(collection(db, 'colors'), (s) => {
      if (active) {
        setData(prev => ({ ...prev, colors: s.docs.map(d => ({ ...d.data(), id: d.id } as VehicleColor)) }));
        loadedStates.colors = true;
        checkLoading();
      }
    }, (err) => { addError("Colors", err); loadedStates.colors = true; checkLoading(); });

    return () => {
      active = false;
      clearTimeout(fallbackTimeout);
      unsubCompanies(); unsubModels(); unsubColors();
      Object.values(listenersRef.current).forEach(unsub => unsub());
    };
  }, []);

  // 2. Dynamic On-Demand Loader (1-Week vs All)
  const loadCollection = (col: 'vehicles' | 'purchases' | 'sales' | 'parties', targetScope: '1-week' | 'all') => {
    const current = loadedScopesRef.current[col];
    if (current === 'all') return;
    if (current === '1-week' && targetScope === '1-week') return;

    if (listenersRef.current[col]) {
      listenersRef.current[col]();
      delete listenersRef.current[col];
    }

    loadedScopesRef.current[col] = targetScope;
    setData(prev => ({
      ...prev,
      loadedScopes: { ...loadedScopesRef.current }
    }));

    const oneWeekAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    let q: any = collection(db, col);

    if (targetScope === '1-week') {
      if (col === 'vehicles') q = query(collection(db, col), where('updatedAt', '>=', oneWeekAgo));
      else if (col === 'sales' || col === 'purchases') q = query(collection(db, col), where('createdAt', '>=', oneWeekAgo));
    }

    const unsub = onSnapshot(q, (s) => {
      let items = s.docs.map(d => ({ ...d.data(), id: d.id, ...(col === 'vehicles' ? { chassisNumber: d.id } : {}) }));
      
      if (col === 'vehicles') {
        items.sort((a: any, b: any) => ((b.updatedAt as any)?.toMillis?.() || 0) - ((a.updatedAt as any)?.toMillis?.() || 0));
      } else if (col === 'purchases' || col === 'sales') {
        items.sort((a: any, b: any) => ((b.date || b.createdAt as any)?.toMillis?.() || 0) - ((a.date || a.createdAt as any)?.toMillis?.() || 0));
      }
      
      setData(prev => ({ ...prev, [col]: items as any }));
    }, (err) => {
      console.error(`${col} subscription error:`, err);
      addError(col, err);
    });

    listenersRef.current[col] = unsub;
  };

  const ensureDashboardLoaded = async () => {
    if (loadedScopesRef.current.dashboard !== 'none') return;
    loadedScopesRef.current.dashboard = '1-week';

    loadCollection('vehicles', '1-week');
    loadCollection('sales', '1-week');
    loadCollection('purchases', '1-week');
    loadCollection('parties', 'all');

    try {
      const [vehSnap, salesSnap, inStockSnap] = await Promise.all([
        getCountFromServer(collection(db, 'vehicles')),
        getCountFromServer(collection(db, 'sales')),
        getCountFromServer(query(collection(db, 'vehicles'), where('status', '==', 'in-stock')))
      ]);
      const vehCount = vehSnap.data().count;
      setData(prev => ({
        ...prev,
        cardTotals: {
          totalInventory: vehCount,
          totalProcurement: vehCount,
          totalSales: salesSnap.data().count,
          inStock: inStockSnap.data().count
        }
      }));
    } catch (err) {
      console.error("Dashboard backend aggregation error:", err);
    }
  };

  // 3. Dispatch data load when tab/page entry occurs
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      ensureDashboardLoaded();
    } else if (path === '/inventory') {
      loadCollection('vehicles', '1-week');
      loadCollection('purchases', '1-week');
      loadCollection('sales', '1-week');
      loadCollection('parties', 'all');
    } else if (path === '/sales' || path === '/process-document' || path === '/quotation') {
      loadCollection('sales', '1-week');
      loadCollection('vehicles', '1-week');
      loadCollection('parties', 'all');
    } else if (path === '/purchases') {
      loadCollection('purchases', '1-week');
      loadCollection('vehicles', '1-week');
      loadCollection('parties', 'all');
    } else if (path === '/parties' || path === '/internal-accounts' || path === '/follow-ups') {
      loadCollection('parties', 'all');
      loadCollection('sales', '1-week');
      loadCollection('purchases', '1-week');
    } else if (path === '/analyzer') {
      loadCollection('vehicles', '1-week');
      loadCollection('sales', '1-week');
      loadCollection('purchases', '1-week');
      loadCollection('parties', 'all');
    }
  }, [location.pathname]);

  const loadAllCollection = (col: 'vehicles' | 'purchases' | 'sales' | 'parties') => {
    loadCollection(col, 'all');
  };

  return (
    <GlobalDataContext.Provider value={{ ...data, loadAllCollection }}>
      {children}
    </GlobalDataContext.Provider>
  );
};

export const useGlobalData = () => {
  return useContext(GlobalDataContext);
};

