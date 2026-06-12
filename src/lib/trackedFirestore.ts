import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as firestore from 'firebase/firestore';
import { db } from './firebase';

export const useUsageStore = create<any>()(
  persist(
    (set, get) => ({
      reads: 0,
      writes: 0,
      deletes: 0,
      lastResetDate: new Date().toLocaleDateString(),
      incrementReads: (count = 1) => {
        const state = get();
        if (state.lastResetDate !== new Date().toLocaleDateString()) {
          set({ reads: count, writes: 0, deletes: 0, lastResetDate: new Date().toLocaleDateString() });
        } else {
          set({ reads: state.reads + count });
        }
      },
      incrementWrites: (count = 1) => {
        const state = get();
        if (state.lastResetDate !== new Date().toLocaleDateString()) {
          set({ reads: 0, writes: count, deletes: 0, lastResetDate: new Date().toLocaleDateString() });
        } else {
          set({ writes: state.writes + count });
        }
      },
      incrementDeletes: (count = 1) => {
        const state = get();
        if (state.lastResetDate !== new Date().toLocaleDateString()) {
          set({ reads: 0, writes: 0, deletes: count, lastResetDate: new Date().toLocaleDateString() });
        } else {
          set({ deletes: state.deletes + count });
        }
      },
      reset: () => set({ reads: 0, writes: 0, deletes: 0, lastResetDate: new Date().toLocaleDateString() })
    }),
    {
      name: 'firebase-usage-storage',
    }
  )
);

// We proxy the most common firestore functions to track usage

export const getDoc = async (...args: Parameters<typeof firestore.getDoc>) => {
  const result = await firestore.getDoc(...args);
  useUsageStore.getState().incrementReads(1);
  return result;
};

export const getDocs = async (...args: Parameters<typeof firestore.getDocs>) => {
  const result = await firestore.getDocs(...args);
  // getDocs counts 1 read per document returned, minimum 1 if empty
  useUsageStore.getState().incrementReads(Math.max(1, result.size));
  return result;
};

export const onSnapshot = (...args: Parameters<typeof firestore.onSnapshot>) => {
  // Overload resolution is tricky with proxy, let's just cast
  const originalOnSnapshot = firestore.onSnapshot as any;
  const callbackIndex = args.findIndex(arg => typeof arg === 'function');
  
  if (callbackIndex !== -1) {
    const originalCallback = args[callbackIndex] as Function;
    args[callbackIndex] = (snapshot: any) => {
      // For query snapshots
      if ('docChanges' in snapshot && typeof snapshot.docChanges === 'function') {
        const changes = snapshot.docChanges();
        if (changes.length > 0) {
          useUsageStore.getState().incrementReads(changes.length);
        }
      } else {
        // Document snapshot
        useUsageStore.getState().incrementReads(1);
      }
      return originalCallback(snapshot);
    };
  }
  return originalOnSnapshot(...args);
};

export const setDoc = async (...args: Parameters<typeof firestore.setDoc>) => {
  const result = await firestore.setDoc(...args);
  useUsageStore.getState().incrementWrites(1);
  return result;
};

export const updateDoc = async (...args: Parameters<typeof firestore.updateDoc>) => {
  const result = await (firestore.updateDoc as any)(...args);
  useUsageStore.getState().incrementWrites(1);
  return result;
};

export const addDoc = async (...args: Parameters<typeof firestore.addDoc>) => {
  const result = await firestore.addDoc(...args);
  useUsageStore.getState().incrementWrites(1);
  return result;
};

export const deleteDoc = async (...args: Parameters<typeof firestore.deleteDoc>) => {
  const result = await firestore.deleteDoc(...args);
  useUsageStore.getState().incrementDeletes(1);
  return result;
};

export const writeBatch = (db: firestore.Firestore) => {
  const batch = firestore.writeBatch(db);
  let writes = 0;
  let deletes = 0;
  
  const originalSet = batch.set.bind(batch);
  batch.set = (...args: any[]) => {
    writes++;
    return originalSet(...args as [any, any]);
  };
  
  const originalUpdate = batch.update.bind(batch);
  batch.update = (...args: any[]) => {
    writes++;
    return originalUpdate(...args as [any, any]);
  };
  
  const originalDelete = batch.delete.bind(batch);
  batch.delete = (ref: any) => {
    deletes++;
    return originalDelete(ref);
  };
  
  const originalCommit = batch.commit.bind(batch);
  batch.commit = async () => {
    const result = await originalCommit();
    if (writes > 0) useUsageStore.getState().incrementWrites(writes);
    if (deletes > 0) useUsageStore.getState().incrementDeletes(deletes);
    return result;
  };
  
  return batch;
};

export const runTransaction = async (...args: Parameters<typeof firestore.runTransaction>) => {
  // Too complex to intercept perfectly, but we'll try to wrap the transaction object if possible
  // For simplicity, we'll just track it as 1 read 1 write initially, or let it slide.
  const result = await firestore.runTransaction(...args);
  return result;
};

// Re-export EVERYTHING ELSE from firestore directly
export * from 'firebase/firestore';
