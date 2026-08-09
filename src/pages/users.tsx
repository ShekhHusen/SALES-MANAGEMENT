import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from '@/lib/trackedFirestore';
import { db } from '@/lib/firebase';
import { useAuth, UserProfile, UserRole } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Search, 
  Trash2, 
  LayoutGrid, 
  Check, 
  X, 
  Shield, 
  BarChart3, 
  Car, 
  Users, 
  ShoppingCart, 
  BadgeDollarSign, 
  FileText, 
  Calculator, 
  Printer, 
  Settings as SettingsIcon,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

export const ALL_APP_TABS = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: BarChart3, defaultRoles: ['admin', 'sales_manager', 'inventory_clerk'] },
  { id: 'inventory', label: 'Inventory', path: '/inventory', icon: Car, defaultRoles: ['admin', 'sales_manager', 'inventory_clerk'] },
  { id: 'parties', label: 'Parties', path: '/parties', icon: Users, defaultRoles: ['admin', 'sales_manager'] },
  { id: 'purchases', label: 'Purchases', path: '/purchases', icon: ShoppingCart, defaultRoles: ['admin', 'inventory_clerk', 'sales_manager'] },
  { id: 'sales', label: 'Sales', path: '/sales', icon: BadgeDollarSign, defaultRoles: ['admin', 'sales_manager'] },
  { id: 'process_document', label: 'Process Document', path: '/process-document', icon: FileText, defaultRoles: ['admin', 'sales_manager'] },
  { id: 'emi_management', label: 'EMI Management', path: '/emi-management', icon: Calculator, defaultRoles: ['admin', 'sales_manager'] },
  { id: 'quotation', label: 'Print Quotation', path: '/quotation', icon: Printer, defaultRoles: ['admin'] },
  { id: 'users', label: 'User Mgmt', path: '/users', icon: Shield, defaultRoles: ['admin'] },
  { id: 'settings', label: 'Settings', path: '/settings', icon: SettingsIcon, defaultRoles: ['admin'] },
];

export function UserManagement() {
  const { userProfile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Tab Access Modal State
  const [selectedUserForTabs, setSelectedUserForTabs] = useState<UserProfile | null>(null);
  const [tempAllowedTabs, setTempAllowedTabs] = useState<string[]>([]);
  const [isSavingTabs, setIsSavingTabs] = useState(false);

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      setLoading(true);
      const q = query(collection(db, 'users'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          ...(doc.data() as UserProfile),
          uid: doc.id
        }));
        setUsers(usersData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching users:", error);
        toast.error('Failed to load users');
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [userProfile]);

  const handleRoleChange = async (targetUser: UserProfile, newRole: UserRole) => {
    try {
      if (targetUser.uid === userProfile?.uid) {
        toast.error('You cannot change your own role.');
        return;
      }
      if (targetUser.email === 'husnailalam06@gmail.com') {
        toast.error('Cannot change the role of the primary administrator.');
        return;
      }
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, { role: newRole });
      
      toast.success('User role updated');
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error('Failed to update role');
    }
  };

  const handleDeleteUser = async (targetUser: UserProfile) => {
    if (targetUser.uid === userProfile?.uid) {
      toast.error('You cannot delete yourself.');
      return;
    }
    if (targetUser.email === 'husnailalam06@gmail.com') {
      toast.error('Cannot delete the primary administrator.');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete user ${targetUser.email}? They will need to request access again upon next login.`)) {
      try {
        const userRef = doc(db, 'users', targetUser.uid);
        await deleteDoc(userRef);
        
        toast.success('User deleted successfully');
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error('Failed to delete user');
      }
    }
  };

  // Open Tab Access Dialog
  const handleOpenTabAccess = (targetUser: UserProfile) => {
    setSelectedUserForTabs(targetUser);
    if (targetUser.allowedTabs && Array.isArray(targetUser.allowedTabs)) {
      setTempAllowedTabs([...targetUser.allowedTabs]);
    } else {
      // Default to role-based tabs if not explicitly set
      const defaultTabs = ALL_APP_TABS.filter(t => t.defaultRoles.includes(targetUser.role)).map(t => t.path);
      setTempAllowedTabs(defaultTabs);
    }
  };

  const handleToggleTab = (path: string) => {
    setTempAllowedTabs(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleGrantAllTabs = () => {
    setTempAllowedTabs(ALL_APP_TABS.map(t => t.path));
  };

  const handleSetDefaultRoleTabs = () => {
    if (!selectedUserForTabs) return;
    const defaultTabs = ALL_APP_TABS.filter(t => t.defaultRoles.includes(selectedUserForTabs.role)).map(t => t.path);
    setTempAllowedTabs(defaultTabs);
  };

  const handleClearAllTabs = () => {
    setTempAllowedTabs([]);
  };

  const handleSaveTabAccess = async () => {
    if (!selectedUserForTabs) return;
    setIsSavingTabs(true);
    try {
      const userRef = doc(db, 'users', selectedUserForTabs.uid);
      await updateDoc(userRef, { allowedTabs: tempAllowedTabs });
      toast.success(`Tab permissions updated for ${selectedUserForTabs.displayName || selectedUserForTabs.email}`);
      setSelectedUserForTabs(null);
    } catch (error) {
      console.error("Error saving tab permissions:", error);
      toast.error('Failed to update tab permissions');
    } finally {
      setIsSavingTabs(false);
    }
  };

  const filteredUsers = users.filter(u => 
    !searchQuery || 
    (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></div>;

  if (userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">User Management</h1>
        <p className="text-slate-500 text-sm">Manage user roles and tab access permissions across the platform.</p>
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-slate-50/50 dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Platform Users</CardTitle>
              <CardDescription>Configure user roles and tab visibility for each team member.</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                 placeholder="Search user..."
                 className="pl-9 h-10 w-full"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-[#0f172a]">
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">User</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">Email</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">Current Role</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3">Tab Access</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3 w-1/4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                       <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500 font-medium">
                       No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => {
                    const userTabs = u.allowedTabs && Array.isArray(u.allowedTabs)
                      ? u.allowedTabs
                      : ALL_APP_TABS.filter(t => t.defaultRoles.includes(u.role)).map(t => t.path);

                    const tabCount = userTabs.length;

                    return (
                      <TableRow key={u.uid} className="hover:bg-slate-200 dark:hover:bg-slate-800">
                        <TableCell className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {u.displayName || 'Unknown'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                          {u.email}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                           <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                              u.role === 'admin' ? 'bg-red-100 text-red-700' :
                              u.role === 'sales_manager' ? 'bg-blue-100 text-blue-700' :
                              u.role === 'pending' ? 'bg-amber-100 text-amber-700' :
                              'bg-emerald-100 text-emerald-700'
                           }`}>
                             {u.role.replace('_', ' ')}
                           </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                            onClick={() => handleOpenTabAccess(u)}
                          >
                            <LayoutGrid className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-semibold text-xs">{tabCount} / {ALL_APP_TABS.length} Tabs Allowed</span>
                          </Button>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Select 
                              value={u.role} 
                              onValueChange={(val) => handleRoleChange(u, val as UserRole)}
                              disabled={u.uid === userProfile.uid || u.email === 'husnailalam06@gmail.com'}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Change Role" />
                              </SelectTrigger>
                              <SelectContent>
                                {u.role === 'pending' && <SelectItem value="pending">Pending</SelectItem>}
                                <SelectItem value="inventory_clerk">Inventory Clerk</SelectItem>
                                <SelectItem value="sales_manager">Sales Manager</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Button 
                               variant="destructive" 
                               size="icon"
                               className="h-9 w-9 bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 shrink-0"
                               disabled={u.uid === userProfile.uid || u.email === 'husnailalam06@gmail.com'}
                               onClick={() => handleDeleteUser(u)}
                               title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tab Access Dialog */}
      <Dialog open={!!selectedUserForTabs} onOpenChange={(open) => !open && setSelectedUserForTabs(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-6 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4" />
              Tab Access Control
            </div>
            <DialogTitle className="text-xl font-bold">
              {selectedUserForTabs?.displayName || selectedUserForTabs?.email || 'User'} Permissions
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select which navigation tabs this user is permitted to view and access.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 flex flex-wrap gap-2 items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Selected: <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ml-1">{tempAllowedTabs.length} of {ALL_APP_TABS.length} Tabs</Badge>
            </span>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleGrantAllTabs}>
                Grant All
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600" onClick={handleSetDefaultRoleTabs}>
                Default Role
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={handleClearAllTabs}>
                Clear
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] pr-1">
            {ALL_APP_TABS.map((tab) => {
              const Icon = tab.icon;
              const isAllowed = tempAllowedTabs.includes(tab.path);

              return (
                <div
                  key={tab.id}
                  onClick={() => handleToggleTab(tab.path)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                    isAllowed 
                      ? 'bg-blue-50/70 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/60 shadow-sm' 
                      : 'bg-slate-50/50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isAllowed ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{tab.label}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{tab.path}</div>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isAllowed ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-300 dark:border-slate-600'
                  }`}>
                    {isAllowed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-row items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedUserForTabs(null)}>
              Cancel
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSavingTabs} onClick={handleSaveTabAccess}>
              {isSavingTabs ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
              Save Tab Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
