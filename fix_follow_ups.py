with open('src/pages/follow-ups.tsx', 'r') as f:
    c = f.read()

prefix = c[:c.find('    useEffect(() => {\n        const unsubs = [\n            getDocs(collection(db, \'users\'))')]
suffix = c[c.find('    const allAccountNames = useMemo(() => {'):]

middle = """    useEffect(() => {
        getDocs(collection(db, 'users')).then(snap => {
            setUsers(snap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id })));
        });
    }, []);

"""
with open('src/pages/follow-ups.tsx', 'w') as f:
    f.write(prefix + middle + suffix)

