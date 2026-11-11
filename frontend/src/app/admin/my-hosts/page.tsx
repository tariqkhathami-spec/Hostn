'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { usePageTitle } from '@/lib/usePageTitle';
import toast from 'react-hot-toast';

interface Overview {
  hosts: number;
  properties: number;
  pendingProperties: number;
  pendingLicenses: number;
  openTickets: number;
  upcomingBookings: number;
  pendingBookings: number;
}

interface HostRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  joinedAt: string;
  isSuspended: boolean;
  properties: number;
  activeProperties: number;
  pendingProperties: number;
  openTickets: number;
}

export default function MyHostsPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  usePageTitle(isAr ? 'مضيفيّ' : 'My Hosts');

  const [overview, setOverview] = useState<Overview | null>(null);
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, hostsRes] = await Promise.all([adminApi.managerOverview(), adminApi.managerHosts()]);
      setOverview(overviewRes.data.data || null);
      setHosts(hostsRes.data.data || []);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setOverview(null);
      setHosts([]);
      toast.error(message || (isAr ? 'تعذّر تحميل المضيفين' : 'Could not load hosts'));
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => { load(); }, [load]);

  const cards: { label: string; value: number; alert?: boolean }[] = overview ? [
    { label: isAr ? 'مضيفيّ' : 'My hosts', value: overview.hosts },
    { label: isAr ? 'العقارات' : 'Properties', value: overview.properties },
    { label: isAr ? 'عقارات بانتظار الاعتماد' : 'Properties awaiting approval', value: overview.pendingProperties, alert: true },
    { label: isAr ? 'تصاريح بانتظار المراجعة' : 'Permits awaiting review', value: overview.pendingLicenses, alert: true },
    { label: isAr ? 'تذاكر مفتوحة' : 'Open tickets', value: overview.openTickets, alert: true },
    { label: isAr ? 'حجوزات قادمة مؤكدة' : 'Upcoming confirmed bookings', value: overview.upcomingBookings },
    { label: isAr ? 'حجوزات بانتظار قبول المضيف' : 'Bookings awaiting host acceptance', value: overview.pendingBookings },
  ] : [];

  const th = { textAlign: 'start' as const, padding: '12px 16px', fontWeight: 600, color: '#475569' };
  const td = { padding: '12px 16px', color: '#1e293b', verticalAlign: 'top' as const };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>{isAr ? 'مضيفيّ' : 'My Hosts'}</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
          {isAr ? 'المضيفون المسندون إليك وما يحتاج إلى متابعتك' : 'The hosts assigned to you and what needs your attention'}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>{isAr ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : (
        <>
          {cards.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
              {cards.map((card) => (
                <div key={card.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{card.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: card.alert && card.value > 0 ? '#d97706' : '#1e293b' }}>
                    {card.value.toLocaleString('en')}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {hosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
              {isAr ? 'لم يُسند إليك مضيفون بعد' : 'No hosts have been assigned to you yet'}
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={th}>{isAr ? 'المضيف' : 'Host'}</th>
                    <th style={th}>{isAr ? 'الجوال' : 'Phone'}</th>
                    <th style={th}>{isAr ? 'العقارات' : 'Properties'}</th>
                    <th style={th}>{isAr ? 'بانتظار الاعتماد' : 'Awaiting approval'}</th>
                    <th style={th}>{isAr ? 'تذاكر مفتوحة' : 'Open tickets'}</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {hosts.map((host) => (
                    <tr key={host.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={td}>
                        <Link href={`/admin/my-hosts/${host.id}`} style={{ fontWeight: 600, color: '#1e293b', textDecoration: 'none' }}>
                          {host.name || '—'}
                        </Link>
                        {host.isSuspended ? (
                          <span style={{ marginInlineStart: 8, fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#fef2f2', color: '#dc2626' }}>
                            {isAr ? 'موقوف' : 'Suspended'}
                          </span>
                        ) : null}
                      </td>
                      <td style={{ ...td, direction: 'ltr', textAlign: 'start' }}>{host.phone || '—'}</td>
                      <td style={td}>
                        {host.properties}
                        <span style={{ color: '#64748b' }}> ({isAr ? `${host.activeProperties} نشط` : `${host.activeProperties} active`})</span>
                      </td>
                      <td style={{ ...td, color: host.pendingProperties > 0 ? '#d97706' : '#1e293b', fontWeight: host.pendingProperties > 0 ? 600 : 400 }}>
                        {host.pendingProperties}
                      </td>
                      <td style={{ ...td, color: host.openTickets > 0 ? '#d97706' : '#1e293b', fontWeight: host.openTickets > 0 ? 600 : 400 }}>
                        {host.openTickets}
                      </td>
                      <td style={td}>
                        <Link href={`/admin/my-hosts/${host.id}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                          {isAr ? 'عرض' : 'View'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
