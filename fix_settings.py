import re

with open('src/pages/settings.tsx', 'r') as f:
    content = f.read()

import_pattern = "import { Company, Model } from '@/types';"
content = content.replace(import_pattern, "import { Company, Model, BusinessProfile } from '@/types';")

state_add = """  const [newColor, setNewColor] = useState('');
  
  const { businessProfile, updateBusinessProfile } = useGlobalData();
  const [editingProfile, setEditingProfile] = useState<BusinessProfile>({
    name: '',
    address: '',
    contactNumber: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    if (businessProfile) {
      setEditingProfile(businessProfile);
    }
  }, [businessProfile]);

  const handleSaveProfile = async () => {
    try {
      await updateBusinessProfile(editingProfile);
      toast.success('Business profile updated');
      setIsEditingProfile(false);
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };
"""
content = content.replace("  const [newColor, setNewColor] = useState('');", state_add)

profile_ui = """
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mb-8">
        <div className="bg-slate-50 dark:bg-[#0f172a] px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Business Profile</h2>
              <p className="text-sm text-slate-500">Update system contact number, address, and business name used in statements and PDFs.</p>
            </div>
          </div>
          {!isViewer && (
            <Button 
              variant={isEditingProfile ? "default" : "outline"}
              onClick={() => {
                if (isEditingProfile) {
                  handleSaveProfile();
                } else {
                  setIsEditingProfile(true);
                }
              }}
              className={isEditingProfile ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {isEditingProfile ? "Save Profile" : "Edit Profile"}
            </Button>
          )}
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Business Name</label>
              {isEditingProfile ? (
                <Input 
                  value={editingProfile.name}
                  onChange={(e) => setEditingProfile({...editingProfile, name: e.target.value})}
                  placeholder="e.g. Vehicle Management System"
                />
              ) : (
                <p className="font-semibold text-slate-900 dark:text-slate-100">{businessProfile?.name || 'Not set'}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Contact Number</label>
              {isEditingProfile ? (
                <Input 
                  value={editingProfile.contactNumber}
                  onChange={(e) => setEditingProfile({...editingProfile, contactNumber: e.target.value})}
                  placeholder="e.g. +977 9800000000"
                />
              ) : (
                <p className="font-semibold text-slate-900 dark:text-slate-100">{businessProfile?.contactNumber || 'Not set'}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Address</label>
              {isEditingProfile ? (
                <Input 
                  value={editingProfile.address}
                  onChange={(e) => setEditingProfile({...editingProfile, address: e.target.value})}
                  placeholder="e.g. 123 Business Street, Auto Market"
                />
              ) : (
                <p className="font-semibold text-slate-900 dark:text-slate-100">{businessProfile?.address || 'Not set'}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
"""
content = content.replace('      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">', profile_ui, 1)

with open('src/pages/settings.tsx', 'w') as f:
    f.write(content)
