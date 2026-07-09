import re

with open('src/pages/internal-accounts.tsx', 'r') as f:
    c = f.read()

bad_block = """                                                                try {
                                                                    if (hiddenParties.includes(party.id)) {
                                                                        await updateDoc(ref, { hiddenParties: arrayRemove(party.id) });
                                                                    }
                                                                    await refreshInternalData(); else {
                                                                        await updateDoc(ref, { hiddenParties: arrayUnion(party.id) });
                                                                    }
                                                                    await refreshInternalData();
                                                                } catch (err: any) {
                                                                    if (err.code === 'not-found') {
                                                                        await setDoc(ref, { mappings: {}, hiddenParties: [party.id] });
                                                                    }
                                                                    await refreshInternalData();
                                                                }"""

good_block = """                                                                try {
                                                                    if (hiddenParties.includes(party.id)) {
                                                                        await updateDoc(ref, { hiddenParties: arrayRemove(party.id) });
                                                                    } else {
                                                                        await updateDoc(ref, { hiddenParties: arrayUnion(party.id) });
                                                                    }
                                                                } catch (err: any) {
                                                                    if (err.code === 'not-found') {
                                                                        await setDoc(ref, { mappings: {}, hiddenParties: [party.id] });
                                                                    }
                                                                }
                                                                await refreshInternalData();"""

c = c.replace(bad_block, good_block)

with open('src/pages/internal-accounts.tsx', 'w') as f:
    f.write(c)

