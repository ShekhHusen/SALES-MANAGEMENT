import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth, UserProfile, UserRole } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

export function UserManagement() {
  const { userProfile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(query(collection(db, 'users')));
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchUsers();
    }
  }, [userProfile]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      if (userId === userProfile?.uid) {
        toast.error('You cannot change your own role.');
        return;
      }
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      toast.success('User role updated');
      setUsers(users.map(u => u.uid === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error('Failed to update role');
    }
  };

  if (authLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></div>;

  if (userProfile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-800">Access Denied</h2>
        <p className="text-slate-500 font-medium">You need Administrator privileges to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">User Management</h1>
        <p className="text-sm text-slate-500 font-medium">Control access and assigned roles for platform users.</p>
      </div>

      <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-lg">Platform Users</CardTitle>
          <CardDescription>All authenticated users in the system.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
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
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500 font-medium">
                       No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.uid} className="hover:bg-slate-50/50">
                      <TableCell className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {u.displayName || 'Unknown'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-slate-600">
                        {u.email}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                         <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                            u.role === 'admin' ? 'bg-red-100 text-red-700' :
                            u.role === 'sales_manager' ? 'bg-blue-100 text-blue-700' :
                            'bg-emerald-100 text-emerald-700'
                         }`}>
                           {u.role.replace('_', ' ')}
                         </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Select 
                          value={u.role} 
                          onValueChange={(val) => handleRoleChange(u.uid, val as UserRole)}
                          disabled={u.uid === userProfile.uid}
                        >
                          <SelectTrigger className="h-9 w-[180px]">
                            <SelectValue placeholder="Change Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inventory_clerk">Inventory Clerk</SelectItem>
                            <SelectItem value="sales_manager">Sales Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
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
