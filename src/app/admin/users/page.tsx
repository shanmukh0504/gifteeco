'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import { FaSearch, FaUser } from 'react-icons/fa';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Users</h1>
        <p className="text-neutral-600">Manage your store users</p>
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" className="py-12">
                    <p className="text-neutral-500">No users found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#FFE5E7] rounded-full flex items-center justify-center">
                          <FaUser className="text-[#FF9AA2]" />
                        </div>
                        <span className="font-medium text-neutral-900">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-neutral-700">{user.email}</span>
                    </TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <Badge variant="error">Admin</Badge>
                      ) : (
                        <Badge variant="default">User</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-neutral-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

