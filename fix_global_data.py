import re

with open('src/contexts/GlobalDataContext.tsx', 'r') as f:
    c = f.read()

# Add users to state
c = c.replace("interface GlobalDataState {", """import type { UserProfile } from '@/types';\ninterface GlobalDataState {
  users: UserProfile[];""")

c = c.replace("""const initialState: GlobalDataState = {""", """const initialState: GlobalDataState = {
  users: [],""")

c = c.replace("""  refreshFollowups: () => Promise<void>;
}""", """  refreshFollowups: () => Promise<void>;
  
  // Local merge operations
  addLocal: (collectionName: string, item: any) => void;
  updateLocal: (collectionName: string, id: string, item: any) => void;
  removeLocal: (collectionName: string, id: string) => void;
}""")

c = c.replace("""  refreshFollowups: async () => {},
};""", """  refreshFollowups: async () => {},
  addLocal: () => {},
  updateLocal: () => {},
  removeLocal: () => {},
};""")

c = c.replace("""  const refreshFollowups = useCallback(async () => {
    try {
      const s = await getDocs(query(collection(db, 'followups'), orderBy('createdAt', 'desc')));
      setData(prev => ({ ...prev, followups: s.docs.map(d => ({ id: d.id, ...d.data() })) }));
    } catch (e) {
      console.error(e);
      addError("Followups", e);
    }
  }, [addError]);""", """  const refreshFollowups = useCallback(async () => {
    try {
      const s = await getDocs(query(collection(db, 'followups'), orderBy('createdAt', 'desc')));
      setData(prev => ({ ...prev, followups: s.docs.map(d => ({ id: d.id, ...d.data() })) }));
    } catch (e) {
      console.error(e);
      addError("Followups", e);
    }
  }, [addError]);

  const addLocal = useCallback((collectionName: keyof GlobalDataState, item: any) => {
    setData(prev => {
      const current = (prev[collectionName] as any[]) || [];
      return { ...prev, [collectionName]: [...current, item] };
    });
  }, []);

  const updateLocal = useCallback((collectionName: keyof GlobalDataState, id: string, item: any) => {
    setData(prev => {
      const current = (prev[collectionName] as any[]) || [];
      const updated = current.map(x => x.id === id ? { ...x, ...item } : x);
      return { ...prev, [collectionName]: updated };
    });
  }, []);

  const removeLocal = useCallback((collectionName: keyof GlobalDataState, id: string) => {
    setData(prev => {
      const current = (prev[collectionName] as any[]) || [];
      const updated = current.filter(x => x.id !== id);
      return { ...prev, [collectionName]: updated };
    });
  }, []);""")

c = c.replace("""        const [veh, comp, mod, col, part, pur, sal, fol] = await Promise.all([
          getDocs(collection(db, 'vehicles')),
          getDocs(collection(db, 'companies')),
          getDocs(collection(db, 'models')),
          getDocs(collection(db, 'colors')),
          getDocs(collection(db, 'parties')),
          getDocs(collection(db, 'purchases')),
          getDocs(collection(db, 'sales')),
          getDocs(query(collection(db, 'followups'), orderBy('createdAt', 'desc')))
        ]);""", """        const [veh, comp, mod, col, part, pur, sal, fol, usrs] = await Promise.all([
          getDocs(collection(db, 'vehicles')),
          getDocs(collection(db, 'companies')),
          getDocs(collection(db, 'models')),
          getDocs(collection(db, 'colors')),
          getDocs(collection(db, 'parties')),
          getDocs(collection(db, 'purchases')),
          getDocs(collection(db, 'sales')),
          getDocs(query(collection(db, 'followups'), orderBy('createdAt', 'desc'))),
          getDocs(collection(db, 'users'))
        ]);""")

c = c.replace("""            sales: sortedSales,
            followups: fol.docs.map(d => ({ id: d.id, ...d.data() })),
            loading: false""", """            sales: sortedSales,
            followups: fol.docs.map(d => ({ id: d.id, ...d.data() })),
            users: usrs.docs.map((d: any) => ({ ...(d.data() as UserProfile), uid: d.id })),
            loading: false""")

c = c.replace("""      refreshSales,
      refreshFollowups
    }}>""", """      refreshSales,
      refreshFollowups,
      addLocal,
      updateLocal,
      removeLocal
    }}>""")

with open('src/contexts/GlobalDataContext.tsx', 'w') as f:
    f.write(c)

