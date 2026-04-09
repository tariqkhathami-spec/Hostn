'use client';

import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { Settings, Trash2, AlertTriangle, X } from 'lucide-react';
import { authApi } from '@/lib/api';
import { usePageTitle } from '@/lib/usePageTitle';

const labels: Record<string, Record<string, string>> = {
  title: { en: 'Settings', ar: 'الإعدادات' },
  dangerZone: { en: 'Danger Zone', ar: 'منطقة الخطر' },
  deleteAccount: { en: 'Delete Account', ar: 'حذف الحساب' },
  deleteDescription: {
    en: 'Once you delete your account, all your data including listings and bookings will be permanently removed. This action cannot be undone.',
    ar: 'بمجرد حذف حسابك، ستتم إزالة جميع بياناتك بما في ذلك العقارات والحجوزات بشكل دائم. لا يمكن التراجع عن هذا الإجراء.',
  },
  deleteButton: { en: 'Delete My Account', ar: 'حذف حسابي' },
  confirmTitle: { en: 'Are you sure?', ar: 'هل أنت متأكد؟' },
  confirmMessage: {
    en: 'This will permanently delete your account, all your listings, and all associated data. Type "DELETE" below to confirm.',
    ar: 'سيؤدي هذا إلى حذف حسابك وجميع عقاراتك وجميع البيانات المرتبطة بشكل دائم. اكتب "DELETE" أدناه للتأكيد.',
  },
  typeDelete: { en: 'Type DELETE to confirm', ar: 'اكتب DELETE للتأكيد' },
  cancel: { en: 'Cancel', ar: 'إلغاء' },
  confirmDelete: { en: 'Permanently Delete', ar: 'حذف نهائي' },
  deleting: { en: 'Deleting...', ar: 'جاري الحذف...' },
  errorGeneric: { en: 'Failed to delete account. Please try again or contact support.', ar: 'فشل حذف الحساب. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.' },
  profileSection: { en: 'Profile Settings', ar: 'إعدادات الملف الشخصي' },
  profileDesc: { en: 'Manage your personal information and preferences.', ar: 'إدارة معلوماتك الشخصية وتفضيلاتك.' },
  comingSoon: { en: 'More settings coming soon', ar: 'المزيد من الإعدادات قريباً' },
};

export default function HostSettingsPage() {
  const { language } = useLanguage();
  const { user, logout } = useAuth();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'إعدادات المضيف' : 'Host Settings');

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    setError('');
    try {
      await authApi.deleteAccount();
      localStorage.removeItem('hostn_user');
      window.location.href = '/';
    } catch {
      setError(labels.errorGeneric[lang]);
      setDeleting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{labels.title[lang]}</h1>

      {/* Profile settings placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Settings className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-700">{labels.profileSection[lang]}</h2>
        </div>
        <p className="text-sm text-gray-400">{labels.profileDesc[lang]}</p>
        <p className="text-xs text-gray-300 mt-2">{labels.comingSoon[lang]}</p>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border-2 border-red-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-700">{labels.dangerZone[lang]}</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{labels.deleteAccount[lang]}</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md">{labels.deleteDescription[lang]}</p>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4 inline ltr:mr-1.5 rtl:ml-1.5 -mt-0.5" />
            {labels.deleteButton[lang]}
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-gray-900">{labels.confirmTitle[lang]}</h3>
              </div>
              <button onClick={() => { setShowConfirm(false); setConfirmText(''); setError(''); }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">{labels.confirmMessage[lang]}</p>

            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={labels.typeDelete[lang]}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setConfirmText(''); setError(''); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                {labels.cancel[lang]}
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? labels.deleting[lang] : labels.confirmDelete[lang]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
