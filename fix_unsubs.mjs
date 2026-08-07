import fs from 'fs';
let code = fs.readFileSync('src/contexts/GlobalDataContext.tsx', 'utf8');

const replacement = `
  const activeListeners = useRef<Set<string>>(new Set());
  const unsubsRef = useRef<Map<string, () => void>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubsRef.current.forEach(unsub => unsub());
      unsubsRef.current.clear();
      activeListeners.current.clear();
    };
  }, []);

  const setupListener = useCallback((name: string, path: string, mapFunc?: (doc: any) => any, sortFunc?: (a: any, b: any) => number) => {
    if (activeListeners.current.has(name)) return;
    activeListeners.current.add(name);
    
    let isInitialSnapshot = true;

    try {
      const q = collection(db, path);
      const unsub = onSnapshot(q, (snapshot) => {
        let docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        if (mapFunc) docs = docs.map(mapFunc);
        if (sortFunc) docs = docs.sort(sortFunc);

        isInitialSnapshot = false;

        setData(prev => ({
          ...prev,
          [name]: docs,
          [\`is\${name.charAt(0).toUpperCase() + name.slice(1)}Loaded\`]: true
        }));
      }, (err) => {
        console.error(\`Error in subscription for \${name}:\`, err);
        addError(name.toUpperCase(), err);
        setData(prev => ({ ...prev, [\`is\${name.charAt(0).toUpperCase() + name.slice(1)}Loaded\`]: true }));
      });
      unsubsRef.current.set(name, unsub);
      return unsub;
`;

code = code.replace(/  const activeListeners = useRef<Set<string>>\(new Set\(\)\);[\s\S]*?return unsub;/, replacement.trim());
fs.writeFileSync('src/contexts/GlobalDataContext.tsx', code);
