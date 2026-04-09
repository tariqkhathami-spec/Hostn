'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Search, Loader2, ShieldOff, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  adminRole?: string | null;
  isSuspended?: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { language } = useLanguage();
  const { user: currentUser } = useAuth();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'المستخدمين' : 'Users');
  const isSuperAdmin = currentUser?.role === 'admin' && (currentUser?.adminRole || 'super') === 'super';

  const roleLabels: Record<string, { en: string; ar: string }> = {
    guest: { en: 'Guest', ar: 'ضيف' },
    host: { en: 'Host', ar: 'مضيف' },
    admin: { en: 'Admin', ar: 'مشرف' },
  };

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({ search: search || undefined, page });
      const data = res.data;
      setUsers(data.data || data.users || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10) || 1);
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646' : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, page, isAr]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleSuspend = async (user: UserItem) => {
    setToggling(user._id);
    try {
      await adminApi.updateUser(user._id, { isSuspended: !user.isSuspended });
      toast.success(
        user.isSuspended
          ? (isAr ? '\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062a\u0639\u0644\u064a\u0642' : 'User unsuspended')
          : (isAr ? '\u062a\u0645 \u062a\u0639\u0644\u064a\u0642 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645' : 'User suspended')
      );
      loadUsers();
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645' : 'Failed to update user');
    } finally {
      setToggling(null);
    }
  };

  const changeAdminRole = async (userId: string, adminRole: string) => {
    try {
      await adminApi.updateUser(userId, { action: 'set_admin_role', adminRole });
      toast.success(isAr ? 'تم تغيير دور المشرف' : `Admin role changed to ${adminRole}`);
      loadUsers();
    } catch {
      toast.error(isAr ? 'فشل في تغيير الدور' : 'Failed to change admin role');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAr ? '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646' : 'User Management'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAr ? '\u0639\u0631\u0636 \u0648\u0625\u062f\u0627\u0631\u0629 \u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646' : 'View and manage all users'}
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? '\u0628\u062d\u062b \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0627\u0644\u0628\u0631\u064a\u062f...' : 'Search by name or email...'}
            className="w-full ps-10 pe-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            {isAr ? '\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646' : 'No users found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u0627\u0633\u0645' : 'Name'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600 hidden md:table-cell">{isAr ? '\u0627\u0644\u0628\u0631\u064a\u062f' : 'Email'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u062f\u0648\u0631' : 'Role'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u062d\u0627\u0644\u0629' : 'Status'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">{isAr ? '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645' : 'Joined'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0625\u062c\u0631\u0627\u0621' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-primary-50 text-primary-700 capitalize">
                        {roleLabels[user.role]?.[language] || user.role}
                      </span>
                      {user.role === 'admin' && isSuperAdmin && user._id !== currentUser?._id ? (
                        <select
                          value={user.adminRole || 'super'}
                          onChange={(e) => changeAdminRole(user._id, e.target.value)}
                          className="ms-2 text-xs border border-gray-200 rounded px-1 py-0.5"
                        >
                          <option value="super">Super</option>
                          <option value="support">Support</option>
                          <option value="finance">Finance</option>
                        </select>
                      ) : user.role === 'admin' && user.adminRole ? (
                        <span className="ms-2 text-xs text-gray-500">({user.adminRole})</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          user.isSuspended
                            ? 'bg-red-50 text-red-700'
                            : 'bg-green-50 text-green-700'
                        }`}
                      >
                        {user.isSuspended
                          ? (isAr ? '\u0645\u0639\u0644\u0642' : 'Suspended')
                          : (isAr ? '\u0646\u0634\u0637' : 'Active')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {new Date(user.createdAt).toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-US')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSuspend(user)}
                        disabled={toggling === user._id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                          user.isSuspended
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {toggling === user._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : user.isSuspended ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : (
                          <ShieldOff className="w-3 h-3" />
                        )}
                        {user.isSuspended
                          ? (isAr ? '\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062a\u0639\u0644\u064a\u0642' : 'Unsuspend')
                          : (isAr ? '\u062a\u0639\u0644\u064a\u0642' : 'Suspend')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
