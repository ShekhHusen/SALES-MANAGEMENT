import re

# Update internal-accounts.tsx
with open('src/pages/internal-accounts.tsx', 'r') as f:
    c = f.read()

c = c.replace("""const [users, setUsers] = useState<UserProfile[]>([]);""", "")
c = c.replace("""const { userProfile } = useAuth();""", """const { userProfile } = useAuth();
    const { users } = useGlobalData();""")
c = c.replace("""                getDocs(collection(db, 'users')),
                getDocs(collection(db, 'account_metadata')),""", """                getDocs(collection(db, 'account_metadata')),""")
c = c.replace("""            const usersSnap = results[0];
            const metadataSnap = results[1];
            const mappingsSnap = results[2];
            
            setUsers(usersSnap.docs.map((d: any) => ({ ...(d.data() as UserProfile), uid: d.id })));
            setAccountMetadata(metadataSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as AccountMetadata)));""", """            const metadataSnap = results[0];
            const mappingsSnap = results[1];
            
            setAccountMetadata(metadataSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as AccountMetadata)));""")

c = c.replace("""            if (needsFullLoad) {
                const openingsSnap = results[3];
                const transactionsSnap = results[4];""", """            if (needsFullLoad) {
                const openingsSnap = results[2];
                const transactionsSnap = results[3];""")

with open('src/pages/internal-accounts.tsx', 'w') as f:
    f.write(c)


# Update follow-ups.tsx
with open('src/pages/follow-ups.tsx', 'r') as f:
    c = f.read()

c = c.replace("""    const [users, setUsers] = useState<UserProfile[]>([]);
    
    useEffect(() => {
        getDocs(collection(db, 'users')).then(snap => {
            setUsers(snap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id })));
        }).catch(e => console.error("Error fetching users:", e));
    }, []);""", "")
c = c.replace("""const { followups, refreshFollowups } = useGlobalData();""", """const { followups, refreshFollowups, users } = useGlobalData();""")

with open('src/pages/follow-ups.tsx', 'w') as f:
    f.write(c)


# Update FollowUpNotifier.tsx
with open('src/components/FollowUpNotifier.tsx', 'r') as f:
    c = f.read()

c = c.replace("""    const [users, setUsers] = useState<UserProfile[]>([]);
    useEffect(() => {
        getDocs(collection(db, 'users')).then(snap => {
            setUsers(snap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id })));
        });
    }, []);""", "")
c = c.replace("""const { followups, refreshFollowups } = useGlobalData();""", """const { followups, refreshFollowups, users } = useGlobalData();""")
if "import { useGlobalData" not in c:
    c = c.replace("import { useAuth }", "import { useAuth }\nimport { useGlobalData } from '@/contexts/GlobalDataContext';")

with open('src/components/FollowUpNotifier.tsx', 'w') as f:
    f.write(c)

