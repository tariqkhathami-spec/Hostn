import { I18nManager } from 'react-native';
import { appStorage } from './storage';

type Language = 'en' | 'ar';

const translations: Record<string, Record<Language, string>> = {
  // Auth
  'auth.welcome': { en: 'Welcome!', ar: 'مرحباً!' },
  'auth.phoneLabel': { en: 'Phone Number', ar: 'رقم الهاتف' },
  'auth.sendOtp': { en: 'Send OTP', ar: 'إرسال رمز التحقق' },
  'auth.verifyCode': { en: 'Enter verification code', ar: 'أدخل رمز التحقق' },
  'auth.resend': { en: 'Resend code', ar: 'إعادة إرسال الرمز' },
  'auth.logout': { en: 'Logout', ar: 'تسجيل الخروج' },

  // Tabs
  'tabs.search': { en: 'Search', ar: 'البحث' },
  'tabs.favorites': { en: 'Favorites', ar: 'المفضلة' },
  'tabs.bookings': { en: 'Bookings', ar: 'الحجوزات' },
  'tabs.messages': { en: 'Messages', ar: 'الرسائل' },
  'tabs.more': { en: 'More', ar: 'المزيد' },

  // Home
  'home.searchPlaceholder': { en: 'Where are you going?', ar: 'إلى أين تريد الذهاب؟' },
  'home.featured': { en: 'Featured', ar: 'مميزة' },
  'home.topRated': { en: 'Top Rated', ar: 'الأعلى تقييماً' },

  // Search
  'search.destination': { en: 'Select Destination', ar: 'اختر الوجهة' },
  'search.typeGuests': { en: 'Type & Guests', ar: 'النوع والضيوف' },
  'search.dates': { en: 'Select Dates', ar: 'اختر التواريخ' },
  'search.results': { en: 'Results', ar: 'النتائج' },
  'search.noResults': { en: 'No properties found', ar: 'لم يتم العثور على عقارات' },
  'search.adults': { en: 'Adults', ar: 'بالغين' },
  'search.children': { en: 'Children', ar: 'أطفال' },

  // Listing
  'listing.bookNow': { en: 'Book Now', ar: 'احجز الآن' },
  'listing.perNight': { en: '/night', ar: '/ليلة' },
  'listing.reviews': { en: 'Reviews', ar: 'التقييمات' },
  'listing.facilities': { en: 'Facilities', ar: 'المرافق' },
  'listing.contactHost': { en: 'Contact Host', ar: 'تواصل مع المضيف' },

  // Booking
  'booking.upcoming': { en: 'Upcoming', ar: 'القادمة' },
  'booking.previous': { en: 'Previous', ar: 'السابقة' },
  'booking.cancel': { en: 'Cancel Booking', ar: 'إلغاء الحجز' },
  'booking.confirmed': { en: 'Confirmed', ar: 'مؤكد' },
  'booking.pending': { en: 'Pending', ar: 'قيد الانتظار' },
  'booking.cancelled': { en: 'Cancelled', ar: 'ملغي' },
  'booking.completed': { en: 'Completed', ar: 'مكتمل' },

  // Checkout
  'checkout.title': { en: 'Checkout', ar: 'إتمام الحجز' },
  'checkout.confirm': { en: 'Confirm Booking', ar: 'تأكيد الحجز' },
  'checkout.priceBreakdown': { en: 'Price Breakdown', ar: 'تفاصيل السعر' },
  'checkout.subtotal': { en: 'Subtotal', ar: 'المجموع الفرعي' },
  'checkout.vat': { en: 'VAT (15%)', ar: 'ضريبة القيمة المضافة (15%)' },
  'checkout.total': { en: 'Total', ar: 'المجموع' },
  'checkout.coupon': { en: 'Discount Code', ar: 'رمز الخصم' },
  'checkout.paymentMethod': { en: 'Payment Method', ar: 'طريقة الدفع' },

  // Chat
  'chat.typeMessage': { en: 'Type a message...', ar: 'اكتب رسالة...' },
  'chat.noConversations': { en: 'No conversations yet', ar: 'لا توجد محادثات بعد' },

  // Account
  'account.profile': { en: 'Profile', ar: 'الملف الشخصي' },
  'account.wallet': { en: 'Wallet', ar: 'المحفظة' },
  'account.paymentMethods': { en: 'Payment Methods', ar: 'طرق الدفع' },
  'account.notifications': { en: 'Notifications', ar: 'الإشعارات' },
  'account.faq': { en: 'FAQ', ar: 'الأسئلة الشائعة' },
  'account.terms': { en: 'Terms of Service', ar: 'شروط الخدمة' },
  'account.privacy': { en: 'Privacy Policy', ar: 'سياسة الخصوصية' },
  'account.language': { en: 'Language', ar: 'اللغة' },
  'account.helpCenter': { en: 'Help Center', ar: 'مركز المساعدة' },

  // Host tabs
  'host.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'host.listings': { en: 'My Listings', ar: 'عقاراتي' },
  'host.bookings': { en: 'Bookings', ar: 'الحجوزات' },
  'host.messages': { en: 'Messages', ar: 'الرسائل' },
  'host.more': { en: 'More', ar: 'المزيد' },
  'host.earnings': { en: 'Earnings', ar: 'الأرباح' },
  'host.reviews': { en: 'Reviews', ar: 'التقييمات' },
  'host.addListing': { en: 'Add Listing', ar: 'إضافة عقار' },
  'host.properties': { en: 'Properties', ar: 'العقارات' },
  'host.activeBookings': { en: 'Active Bookings', ar: 'الحجوزات النشطة' },
  'host.totalEarnings': { en: 'Total Earnings', ar: 'إجمالي الأرباح' },
  'host.avgRating': { en: 'Avg Rating', ar: 'متوسط التقييم' },
  'host.becomeHost': { en: 'Become a Host', ar: 'كن مضيفاً' },
  'host.becomeHostDesc': { en: 'List your property and start earning', ar: 'أدرج عقارك وابدأ بالكسب' },

  // Role selection
  'role.selectTitle': { en: 'How would you like to continue?', ar: 'اختر كيف تريد المتابعة' },
  'role.guest': { en: 'Guest', ar: 'ضيف' },
  'role.host': { en: 'Host', ar: 'مضيف' },
  'role.admin': { en: 'Admin', ar: 'مشرف' },

  // Common
  'common.save': { en: 'Save', ar: 'حفظ' },
  'common.cancel': { en: 'Cancel', ar: 'إلغاء' },
  'common.confirm': { en: 'Confirm', ar: 'تأكيد' },
  'common.delete': { en: 'Delete', ar: 'حذف' },
  'common.loading': { en: 'Loading...', ar: 'جاري التحميل...' },
  'common.retry': { en: 'Retry', ar: 'إعادة المحاولة' },
  'common.error': { en: 'Something went wrong', ar: 'حدث خطأ ما' },
  'common.noInternet': { en: 'No internet connection', ar: 'لا يوجد اتصال بالإنترنت' },
  'common.sar': { en: 'SAR', ar: 'ر.س' },

  // Empty states
  'empty.favorites': { en: 'No favorites yet', ar: 'لا توجد مفضلات بعد' },
  'empty.bookings': { en: 'No bookings yet', ar: 'لا توجد حجوزات بعد' },
  'empty.notifications': { en: 'No notifications', ar: 'لا توجد إشعارات' },
};

let currentLanguage: Language = 'en';

export function initLanguage(): void {
  const stored = appStorage.getLanguage() as Language;
  currentLanguage = stored === 'ar' ? 'ar' : 'en';
  I18nManager.allowRTL(currentLanguage === 'ar');
  I18nManager.forceRTL(currentLanguage === 'ar');
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  appStorage.setLanguage(lang);
  I18nManager.allowRTL(lang === 'ar');
  I18nManager.forceRTL(lang === 'ar');
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function isRTL(): boolean {
  return currentLanguage === 'ar';
}

export function t(key: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[currentLanguage] || entry.en || key;
}

export default { t, initLanguage, setLanguage, getLanguage, isRTL };
