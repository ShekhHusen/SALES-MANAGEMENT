import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from '@/lib/trackedFirestore';
import { db } from '@/lib/firebase';
import { useAuth, UserProfile, UserRole } from '@/hooks/use-auth';
import { logAction } from '@/lib/audit';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

export function UserManagement() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      
      if (user) {
        logAction(user.uid, user.email || '', 'UPDATE', 'User', targetUser.uid, {
          targetEmail: targetUser.email,
          previousRole: targetUser.role,
          newRole: newRole
        });
      }
      
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
        
        if (user) {
          logAction(user.uid, user.email || '', 'DELETE', 'User', targetUser.uid, {
            targetEmail: targetUser.email,
            role: targetUser.role
          });
        }
        
        toast.success('User deleted successfully');
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error('Failed to delete user');
      }
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
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-slate-50/50 dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Platform Users</CardTitle>
              <CardDescription>All authenticated users in the system.</CardDescription>
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
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3 w-1/4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                       <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500 font-medium">
                       No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => (
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
                        <div className="flex items-center gap-2">
                          <Select 
                            value={u.role} 
                            onValueChange={(val) => handleRoleChange(u, val as UserRole)}
                            disabled={u.uid === userProfile.uid || u.email === 'husnailalam06@gmail.com'}
                          >
                            <SelectTrigger className="h-9 w-[180px]">
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
                             className="h-9 w-9 bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700"
                             disabled={u.uid === userProfile.uid || u.email === 'husnailalam06@gmail.com'}
                             onClick={() => handleDeleteUser(u)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
