import re

for file in ['src/components/FollowUpNotifier.tsx', 'src/pages/internal-accounts.tsx', 'src/pages/follow-ups.tsx']:
    with open(file, 'r') as f:
        c = f.read()
    
    if 'getDocs' not in c:
        c = c.replace("import { collection, onSnapshot", "import { collection, onSnapshot, getDocs")

    c = re.sub(r'onSnapshot\(collection\(db, \'users\'\), \(?snap\)? => {.*?setUsers\(snap\.docs\.map.*?\}\);', 
               "getDocs(collection(db, 'users')).then(snap => setUsers(snap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id }))));", c, flags=re.DOTALL)
    
    c = re.sub(r'onSnapshot\(collection\(db, \'users\'\), \(snap\) => setUsers\(snap\.docs\.map\(d => \(\{ \.\.\.\(d\.data\(\) as UserProfile\), uid: d\.id \}\)\)\), \(e\) => console\.error\("Users error:", e\)\),?', 
               "getDocs(collection(db, 'users')).then(snap => setUsers(snap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id })))).catch(e => console.error('Users error:', e)),", c)

    with open(file, 'w') as f:
        f.write(c)

