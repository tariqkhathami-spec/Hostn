'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authApi } from '@/lib/api';
import Button from '@/components/ui/Button';
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Save,
  Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  const tabs = [
    { id: 'profile', label: language === 'ar' ? 'الملف الشخصي' : 'Profile', icon: User },
    { id: 'notifications', label: language === 'ar' ? 'الإشعارات' : 'Notifications', icon: Bell },
    { id: 'security', label: language === 'ar' ? 'الأمان' : 'Security', icon: Shield },
    { id: 'payments', label: language === 'ar' ? 'المدفوعات' : 'Payments', icon: CreditCard },
    { id: 'preferences', label: language === 'ar' ? 'التفضيلات' : 'Preferences', icon: Globe },
  ];

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authApi.updateProfile({
        name: profile.name,
        phone: profile.phone,
      });
      if (res.data?.user) {
        updateUser(res.data.user);
      } else if (user) {
        updateUser({ ...user, name: profile.name, phone: profile.phone });
      }
      toast.success(language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved');
    } catch {
      toast.error(language === 'ar' ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error(language === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success(language === 'ar' ? 'تم تغيير كلمة المرور' : 'Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch {
      toast.error(language === 'ar' ? 'فشل تغيير كلمة المرور — تأكد من كلمة المرور الحالية' : 'Failed to change password — check your current password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {language === 'ar' ? 'الإعدادات' : 'Settings'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {language === 'ar' ? 'إدارة حسابك وتفضيلاتك' : 'Manage your account and preferences'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs */}
        <div className="lg:col-span-1">
          <nav className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${activeTab === id ? 'text-primary-600' : 'text-gray-400'}`} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">
                  {language === 'ar' ? 'معلومات الملف الشخصي' : 'Profile Information'}
                </h2>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center">
                    <span className="text-primary-600 font-bold text-2xl">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <button className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700">
                      <Camera className="w-4 h-4" />
                      {language === 'ar' ? 'تغيير الصورة' : 'Change photo'}
                    </button>
                    <p className="text-xs text-gray-400 mt-1">
                      {language === 'ar' ? 'JPG, PNG. حد أقصى 5 ميجا' : 'JPG, PNG. Max 5MB.'}
                    </p>
                  </div>
                </div>

                {/* Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {language === 'ar' ? 'رقم الجوال' : 'Phone'}
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+966 50 000 0000"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                </div>

                <div className="flex ltr:justify-end rtl:justify-start">
                  <Button onClick={handleSave} isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                    {language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">
                  {language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Preferences'}
                </h2>
                {[
                  { label: language === 'ar' ? 'طلبات الحجز الجديدة' : 'New booking requests', desc: language === 'ar' ? 'إشعار عند حجز ضيف لعقارك' : 'Get notified when a guest books your property', default: true },
                  { label: language === 'ar' ? 'تأكيدات الحجز' : 'Booking confirmations', desc: language === 'ar' ? 'إشعارات للحجوزات المؤكدة' : 'Notifications for confirmed bookings', default: true },
                  { label: language === 'ar' ? 'رسائل الضيوف' : 'Guest messages', desc: language === 'ar' ? 'تنبيهات للرسائل الجديدة' : 'Receive alerts for new messages', default: true },
                  { label: language === 'ar' ? 'التقييمات الجديدة' : 'New reviews', desc: language === 'ar' ? 'إشعار عند ترك ضيف لتقييم' : 'Get notified when guests leave reviews', default: true },
                  { label: language === 'ar' ? 'تحديثات المدفوعات' : 'Payment updates', desc: language === 'ar' ? 'تنبيهات للتحويلات والمعاملات' : 'Alerts for payouts and transactions', default: true },
                  { label: language === 'ar' ? 'رسائل تسويقية' : 'Marketing emails', desc: language === 'ar' ? 'نصائح وتحديثات من هوستن' : 'Tips and updates from Hostn', default: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={item.default} className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
                    </label>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">
                  {language === 'ar' ? 'الأمان' : 'Security'}
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-900">
                      {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {language === 'ar' ? 'حدّث كلمة المرور للحفاظ على أمان حسابك' : 'Update your password to keep your account secure'}
                    </p>
                    {!showPasswordForm ? (
                      <button
                        onClick={() => setShowPasswordForm(true)}
                        className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        {language === 'ar' ? 'تحديث كلمة المرور' : 'Update password'}
                      </button>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <input
                          type="password"
                          placeholder={language === 'ar' ? 'كلمة المرور الحالية' : 'Current password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                        <input
                          type="password"
                          placeholder={language === 'ar' ? 'كلمة المرور الجديدة' : 'New password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                        <input
                          type="password"
                          placeholder={language === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleChangePassword} isLoading={changingPassword} size="sm">
                            {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                          </Button>
                          <button
                            onClick={() => { setShowPasswordForm(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                          >
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">
                  {language === 'ar' ? 'إعدادات المدفوعات' : 'Payment Settings'}
                </h2>
                <div className="p-6 bg-gray-50 rounded-xl text-center">
                  <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    {language === 'ar' ? 'لم يتم إعداد طرق الدفع بعد' : 'No payment methods configured'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {language === 'ar' ? 'أضف حساب بنكي أو طريقة دفع لاستلام المدفوعات' : 'Add a bank account or payment method to receive payouts'}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900">
                  {language === 'ar' ? 'التفضيلات' : 'Preferences'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {language === 'ar' ? 'العملة' : 'Currency'}
                    </label>
                    <select className="w-full max-w-xs px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                      <option value="SAR">{language === 'ar' ? 'ر.س - ريال سعودي' : 'SAR - Saudi Riyal'}</option>
                      <option value="USD">{language === 'ar' ? 'دولار أمريكي' : 'USD - US Dollar'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {language === 'ar' ? 'المنطقة الزمنية' : 'Timezone'}
                    </label>
                    <select className="w-full max-w-xs px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400">
                      <option value="Asia/Riyadh">{language === 'ar' ? 'آسيا/الرياض (UTC+3)' : 'Asia/Riyadh (UTC+3)'}</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
