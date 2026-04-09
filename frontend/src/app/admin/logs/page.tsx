'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/usePageTitle';

interface LogItem {
  _id: string;
  user?: { name: string; email: string };
  userName?: string;
  action: string;
  details?: string;
  ip?: string;
  createdAt: string;
}

export default function AdminLogsPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'سجل النشاط' : 'Activity Logs');

  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const actionTranslations: Record<string, string> = isAr ? {
    payment_initiated: 'بدء الدفع',
    payment_completed: 'اكتمال الدفع',
    payment_failed: 'فشل الدفع',
    booking_created: 'إنشاء حجز',
    booking_confirmed: 'تأكيد حجز',
    booking_cancelled: 'إلغاء حجز',
    booking_completed: 'اكتمال حجز',
    property_approved: 'موافقة على عقار',
    property_rejected: 'رفض عقار',
    property_removed: 'إزالة عقار',
    user_suspended: 'تعليق مستخدم',
    user_activated: 'تفعيل مستخدم',
    user_verified: 'توثيق مستخدم',
    role_changed: 'تغيير الدور',
    refund_processed: 'معالجة استرداد',
    admin_login: 'تسجيل دخول مشرف',
  } : {};

  const translateAction = (action: string) => {
    if (!isAr) return action;
    return actionTranslations[action] || action.replace(/_/g, ' ');
  };

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getLogs({ page });
      const data = res.data;
      setLogs(data.data || data.logs || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 20) || 1);
    } catch {
      toast.error(isAr ? '\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0633\u062c\u0644\u0627\u062a' : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [page, isAr]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAr ? '\u0633\u062c\u0644 \u0627\u0644\u0646\u0634\u0627\u0637\u0627\u062a' : 'Activity Logs'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAr ? '\u0633\u062c\u0644 \u0627\u0644\u0623\u0646\u0634\u0637\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0635\u0629' : 'Platform activity history'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            {isAr ? '\u0644\u0627 \u064a\u0648\u062c\u062f \u0633\u062c\u0644\u0627\u062a' : 'No logs found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u0648\u0642\u062a' : 'Timestamp'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645' : 'User'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u0625\u062c\u0631\u0627\u0621' : 'Action'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{isAr ? '\u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644' : 'Details'}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString(isAr ? 'ar-u-nu-latn' : 'en-US', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {log.user?.name || log.userName || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-primary-50 text-primary-700">
                        {translateAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {log.details || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {log.ip || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
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
