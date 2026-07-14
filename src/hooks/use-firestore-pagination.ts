import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, where, QueryConstraint, getCountFromServer, DocumentData } from '@/lib/trackedFirestore';
import { db } from '@/lib/firebase';

export function useFirestorePagination<T>(
  collectionName: string,
  baseConstraints: QueryConstraint[],
  itemsPerPage: number | 'all',
  dependencies: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [cursors, setCursors] = useState<any[]>([null]);
  const [totalPages, setTotalPages] = useState(1);
  
  // Track dependency changes to reset
  const initialFetchDone = useRef(false);

  const fetchPage = useCallback(async (pageIndex: number, currentItemsPerPage: number | 'all') => {
    setLoading(true);
    setError(null);
    try {
      if (pageIndex === 1) {
        try {
          const countSnap = await getCountFromServer(query(collection(db, collectionName), ...baseConstraints));
          setTotalItems(countSnap.data().count);
        } catch (e) {
          console.warn("Could not get count", e);
        }
      }

      let q = query(collection(db, collectionName), ...baseConstraints);
      if (currentItemsPerPage !== 'all') {
        q = query(q, limit(currentItemsPerPage));
      }

      const cursor = cursors[pageIndex - 1];
      if (cursor && currentItemsPerPage !== 'all') {
        q = query(collection(db, collectionName), ...baseConstraints, startAfter(cursor), limit(currentItemsPerPage));
      }

      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as T));
      setData(fetched);

      if (currentItemsPerPage === 'all') {
        setTotalPages(1);
      } else {
        if (snapshot.docs.length === currentItemsPerPage) {
          const lastVisible = snapshot.docs[snapshot.docs.length - 1];
          setCursors(prev => {
            const newCursors = [...prev];
            newCursors[pageIndex] = lastVisible;
            return newCursors;
          });
          setTotalPages(Math.max(totalPages, pageIndex + 1));
        } else {
          setTotalPages(pageIndex);
        }
      }
    } catch (err: any) {
      console.error(`Error fetching ${collectionName}:`, err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [collectionName, cursors, totalPages, ...dependencies]);

  // Reset when dependencies change
  useEffect(() => {
    setCurrentPage(1);
    setCursors([null]);
    setTotalPages(1);
    setData([]);
    fetchPage(1, itemsPerPage);
  }, [...dependencies, itemsPerPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchPage(newPage, itemsPerPage);
  };

  return {
    data,
    loading,
    error,
    totalItems,
    currentPage,
    totalPages,
    handlePageChange,
    itemsPerPage
  };
}
