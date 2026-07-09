import re

with open('src/pages/internal-accounts.tsx', 'r') as f:
    c = f.read()

c = c.replace("""                                                                await updateDoc(doc(db, 'internal_data', 'mappings'), 
                                                                    new FieldPath('mappings', accountName), deleteField()
                                                                );
                                                            } catch (err) {}""", """                                                                await updateDoc(doc(db, 'internal_data', 'mappings'), 
                                                                    new FieldPath('mappings', accountName), deleteField()
                                                                );
                                                                await refreshInternalData();
                                                            } catch (err) {}""")

c = c.replace("""                                                                        await updateDoc(doc(db, 'internal_data', 'mappings'), 
                                                                            new FieldPath('mappings', val), party.id
                                                                        );
                                                                    } catch (err: any) {""", """                                                                        await updateDoc(doc(db, 'internal_data', 'mappings'), 
                                                                            new FieldPath('mappings', val), party.id
                                                                        );
                                                                        await refreshInternalData();
                                                                    } catch (err: any) {""")

c = c.replace("""            if (e.code === 'not-found') {
                 try {
                     await setDoc(doc(db, 'internal_data', 'mappings'), { mappings: { [selectedAccount]: partyId } });
                     toast.success("Successfully mapped customer");
                 } catch (err) {""", """            if (e.code === 'not-found') {
                 try {
                     await setDoc(doc(db, 'internal_data', 'mappings'), { mappings: { [selectedAccount]: partyId } });
                     toast.success("Successfully mapped customer");
                     await refreshInternalData();
                 } catch (err) {""")

with open('src/pages/internal-accounts.tsx', 'w') as f:
    f.write(c)

