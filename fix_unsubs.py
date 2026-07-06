with open('src/pages/internal-accounts.tsx', 'r') as f:
    c = f.read()

c = c.replace("const unsubs = [\n                                                                                    getDocs(collection(db, 'users')).then(snap => setUsers(snap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id })))).catch(e => console.error('Users error:', e)),\n                        onSnapshot", "getDocs(collection(db, 'users')).then(snap => setUsers(snap.docs.map(d => ({ ...(d.data() as UserProfile), uid: d.id })))).catch(e => console.error('Users error:', e));\n        const unsubs = [\n            onSnapshot")

with open('src/pages/internal-accounts.tsx', 'w') as f:
    f.write(c)

