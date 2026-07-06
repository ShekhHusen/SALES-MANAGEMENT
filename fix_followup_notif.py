with open('src/components/FollowUpNotifier.tsx', 'r') as f:
    c = f.read()

prefix = c[:c.find('    useEffect(() => {')]
suffix = c[c.find('        Object.entries(byParty).forEach'):]

correct_middle = """    useEffect(() => {
        getDocs(collection(db, 'users')).then(snap => {
            setUsers(snap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id })));
        });
    }, []);

    // Request notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Due Follow-ups logic
    const dueFollowups = useMemo(() => {
        const now = new Date();
        const myDue: { party: Party, followup: FollowUp }[] = [];
        const globalDue: { party: Party, followup: FollowUp }[] = [];
        
        // Group by party ID
        const byParty: Record<string, FollowUp[]> = {};
        followups.forEach(f => {
            if (!byParty[f.partyId]) byParty[f.partyId] = [];
            byParty[f.partyId].push(f);
        });

"""

with open('src/components/FollowUpNotifier.tsx', 'w') as f:
    f.write(prefix + correct_middle + suffix)

