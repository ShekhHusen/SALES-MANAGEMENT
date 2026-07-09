import re

with open('src/pages/internal-accounts.tsx', 'r') as f:
    c = f.read()

# Add to handleVerifyBalance
c = c.replace("""                toast.success('Balance verified');
            }
        } catch (error) {""", """                toast.success('Balance verified');
                await refreshInternalData();
            }
        } catch (error) {""")

# Add to handleImportOpenings
c = c.replace("""                await Promise.all(promises);
                toast.success(`Imported ${newOpenings.length} opening balances`);
            } catch (error) {""", """                await Promise.all(promises);
                toast.success(`Imported ${newOpenings.length} opening balances`);
                await refreshInternalData();
            } catch (error) {""")

# Add to handleImportTransactions
c = c.replace("""                await Promise.all(promises);
                toast.success(`Imported ${validTxns.length} transactions` + (newOpeningsToCreate.length ? ` and created ${newOpeningsToCreate.length} new accounts` : ''));
            } catch (error) {""", """                await Promise.all(promises);
                toast.success(`Imported ${validTxns.length} transactions` + (newOpeningsToCreate.length ? ` and created ${newOpeningsToCreate.length} new accounts` : ''));
                await refreshInternalData();
            } catch (error) {""")

# Add to handleMapCustomer
c = c.replace("""            toast.success('Account mapped to customer successfully');
            setIsPartySelectorOpen(false);
            setPartySearch('');
        } catch (error) {""", """            toast.success('Account mapped to customer successfully');
            setIsPartySelectorOpen(false);
            setPartySearch('');
            await refreshInternalData();
        } catch (error) {""")

# Add to handleUnmapCustomer
c = c.replace("""            toast.success('Account unmapped successfully');
        } catch (error) {""", """            toast.success('Account unmapped successfully');
            await refreshInternalData();
        } catch (error) {""")

# Add to handleEditMetadata
c = c.replace("""            toast.success('Account metadata saved');
            setMetaForm(null);
        } catch (error) {""", """            toast.success('Account metadata saved');
            setMetaForm(null);
            await refreshInternalData();
        } catch (error) {""")

# Add to Account Item hide party
c = c.replace("""                                                                        await updateDoc(ref, { hiddenParties: arrayUnion(party.id) });
                                                                    }""", """                                                                        await updateDoc(ref, { hiddenParties: arrayUnion(party.id) });
                                                                    }
                                                                    await refreshInternalData();""")

# Add to Account Item unhide party
c = c.replace("""                                                                        await updateDoc(ref, { hiddenParties: arrayRemove(party.id) });
                                                                    }""", """                                                                        await updateDoc(ref, { hiddenParties: arrayRemove(party.id) });
                                                                    }
                                                                    await refreshInternalData();""")


with open('src/pages/internal-accounts.tsx', 'w') as f:
    f.write(c)

