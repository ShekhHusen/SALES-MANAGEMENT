import re

with open('src/contexts/GlobalDataContext.tsx', 'r') as f:
    content = f.read()

# Add to imports
content = content.replace("import type { Vehicle, Company, Model, Party, Purchase, Sale, VehicleColor } from '../types';", "import type { Vehicle, Company, Model, Party, Purchase, Sale, VehicleColor, BusinessProfile } from '../types';\nimport { doc, getDoc, setDoc } from 'firebase/firestore';")

# Add to interface
content = content.replace("  colors: VehicleColor[];", "  colors: VehicleColor[];\n  businessProfile: BusinessProfile | null;\n  updateBusinessProfile: (profile: BusinessProfile) => Promise<void>;")

# Add to initialState
content = content.replace("  colors: [],", "  colors: [],\n  businessProfile: null,\n  updateBusinessProfile: async () => {},")

# Add to setup logic
setup_logic = """
    // Load Business Profile
    const loadBusinessProfile = async () => {
      try {
        const docRef = doc(db, 'settings', 'businessProfile');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData(prev => ({ ...prev, businessProfile: docSnap.data() as BusinessProfile }));
        }
      } catch (err) {
        console.error('Failed to load business profile:', err);
      }
    };
    loadBusinessProfile();

    const smallCollections = [
"""
content = content.replace("    const smallCollections = [", setup_logic)

update_func = """
  const updateBusinessProfile = async (profile: BusinessProfile) => {
    try {
      const docRef = doc(db, 'settings', 'businessProfile');
      await setDoc(docRef, profile, { merge: true });
      setData(prev => ({ ...prev, businessProfile: profile }));
    } catch (err) {
      console.error('Failed to update business profile:', err);
      throw err;
    }
  };

  return (
"""
content = content.replace("  return (", update_func)

provider_val = """    <GlobalDataContext.Provider value={{
      ...data,
      updateBusinessProfile,"""
content = content.replace("    <GlobalDataContext.Provider value={{", provider_val)

with open('src/contexts/GlobalDataContext.tsx', 'w') as f:
    f.write(content)
