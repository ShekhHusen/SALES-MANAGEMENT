import re

with open('src/pages/internal-accounts.tsx', 'r') as f:
    c = f.read()

c = c.replace("""                                                                            if (err.code === 'not-found') {
                                                                                await setDoc(doc(db, 'internal_data', 'mappings'), { mappings: { [val]: party.id } });
                                                                            }""", """                                                                            if (err.code === 'not-found') {
                                                                                await setDoc(doc(db, 'internal_data', 'mappings'), { mappings: { [val]: party.id } });
                                                                            }
                                                                            await refreshInternalData();""")

c = c.replace("""                                                                    if (err.code === 'not-found') {
                                                                        await setDoc(ref, { mappings: {}, hiddenParties: [party.id] });
                                                                    }""", """                                                                    if (err.code === 'not-found') {
                                                                        await setDoc(ref, { mappings: {}, hiddenParties: [party.id] });
                                                                    }
                                                                    await refreshInternalData();""")

c = c.replace("""                                                                        await updateDoc(doc(db, 'internal_data', 'mappings'), 
                                                                            { [`mappings.${account.name}`]: deleteField() }
                                                                        );
                                                                    }
                                                                }}
                                                                className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                            >""", """                                                                        await updateDoc(doc(db, 'internal_data', 'mappings'), 
                                                                            { [`mappings.${account.name}`]: deleteField() }
                                                                        );
                                                                        await refreshInternalData();
                                                                    }
                                                                }}
                                                                className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                            >""")

with open('src/pages/internal-accounts.tsx', 'w') as f:
    f.write(c)

