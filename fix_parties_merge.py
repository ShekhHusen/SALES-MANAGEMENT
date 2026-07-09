import re

with open('src/pages/parties.tsx', 'r') as f:
    c = f.read()

# Add addLocal, updateLocal, removeLocal to useGlobalData
c = c.replace("""const { parties, refreshParties } = useGlobalData();""", """const { parties, refreshParties, addLocal, updateLocal, removeLocal } = useGlobalData();""")

# Replace refreshParties in update
c = c.replace("""        await updateDoc(doc(db, 'parties', editingParty.id), {
          ...values,
          updatedAt: Timestamp.now(),
        });
        await refreshParties();""", """        await updateDoc(doc(db, 'parties', editingParty.id), {
          ...values,
          updatedAt: Timestamp.now(),
        });
        updateLocal('parties', editingParty.id, values);""")

# Replace refreshParties in create
c = c.replace("""        await addDoc(collection(db, 'parties'), {
          ...values,
          createdAt: Timestamp.now(),
        });
        await refreshParties();""", """        const docRef = await addDoc(collection(db, 'parties'), {
          ...values,
          createdAt: Timestamp.now(),
        });
        addLocal('parties', { ...values, id: docRef.id });""")

# Replace refreshParties in delete
c = c.replace("""      await deleteDoc(doc(db, 'parties', partyToDelete.id));
      await refreshParties();""", """      await deleteDoc(doc(db, 'parties', partyToDelete.id));
      removeLocal('parties', partyToDelete.id);""")

with open('src/pages/parties.tsx', 'w') as f:
    f.write(c)

