import { I18nManager } from 'react-native';

type TranslationKey = keyof typeof ar;

const ar = {
  // Bottom tabs
  'tab.home': 'الرئيسية',
  'tab.properties': 'العقار',
  'tab.calendar': 'التقويم',
  'tab.reservations': 'الحجوزات',
  'tab.more': 'المزيد',

  // Auth
  'auth.welcome': 'سجل و اجر عقارك معنا',
  'auth.register': 'سجل عقارك',
  'auth.login': 'سجل دخولك لتطبيق المضيفين',
  'auth.phone': 'رقم الجوال',
  'auth.otp': 'رمز التحقق',
  'auth.verify': 'تحقق',
  'auth.resend': 'إعادة الإرسال',
  'auth.next': 'التالي',

  // Dashboard
  'dashboard.title': 'لوحة المعلومات',
  'dashboard.reports': 'لوحة البيانات',
  'dashboard.recentBookings': 'آخر الحجوزات',
  'dashboard.upcomingGuests': 'الضيوف القادمون',
  'dashboard.recentTransfers': 'آخر الحوالات',
  'dashboard.recentReviews': 'آخر التقييمات',
  'dashboard.recentReports': 'آخر البلاغات',
  'dashboard.accountSummary': 'ملخص الحسابات',
  'dashboard.pricing': 'الأسعار',
  'dashboard.financial': 'المعاملات المالية',

  // Properties
  'properties.title': 'الخصائص والوحدات',
  'properties.listed': 'معروض',
  'properties.unlisted': 'غير معروض',
  'properties.edit': 'تعديل',
  'properties.save': 'حفظ',
  'properties.unitInfo': 'معلومات الوحدة',
  'properties.address': 'العنوان',
  'properties.map': 'الموقع على الخريطة',
  'properties.bookingTerms': 'شروط الحجز',
  'properties.suitability': 'لمن تناسب هذه الوحدة؟',
  'properties.familiesAndSingles': 'عوائل وعزاب',
  'properties.familiesOnly': 'عوائل فقط',
  'properties.singlesOnly': 'عزاب فقط',
  'properties.deposit': 'مبلغ التأمين',

  // Calendar
  'calendar.title': 'التقويم',
  'calendar.listedOnly': 'عرض الوحدات المعروضة فقط',

  // Reservations
  'reservations.title': 'الحجوزات',
  'reservations.recent': 'آخر الحجوزات',
  'reservations.upcoming': 'الضيوف القادمون',
  'reservations.confirmed': 'مؤكد',
  'reservations.inPayment': 'جاري السداد',
  'reservations.waiting': 'منتظر',
  'reservations.cancelled': 'ملغي',
  'reservations.noShow': 'عدم حضور',

  // Reviews
  'reviews.title': 'تقييم الضيف لك',
  'reviews.cleanliness': 'النظافة',
  'reviews.condition': 'الحالة',
  'reviews.information': 'المعلومات',
  'reviews.service': 'الخدمة',
  'reviews.reply': 'رد على تعليق الضيف',
  'reviews.send': 'إرسال',

  // More menu
  'more.profile': 'الملف الشخصي',
  'more.reviews': 'التقييمات',
  'more.financial': 'المعاملات المالية',
  'more.permits': 'نظام السياحة الجديد',
  'more.pricing': 'الأسعار',
  'more.protection': 'برنامج حماية المضيف',
  'more.settings': 'الإعدادات',
  'more.suggestions': 'مقترحات المضيفين',
  'more.articles': 'المقالات',
  'more.complaints': 'البلاغات والشكاوي',
  'more.changeRequests': 'طلبات التغيير',
  'more.referrals': 'رابط الإحالة',
  'more.discountCodes': 'أكواد الخصم',
  'more.onboarding': 'البرنامج التعريفي',
  'more.invoices': 'الفواتير وكشوف الحسابات',
  'more.terms': 'إتفاقية الإستخدام',
  'more.contact': 'تواصل معنا',
  'more.logout': 'تسجيل الخروج',

  // Common
  'common.loading': 'جاري التحميل...',
  'common.error': 'حدث خطأ',
  'common.retry': 'حاول مرة أخرى',
  'common.empty': 'لا توجد بيانات',
  'common.search': 'بحث',
  'common.cancel': 'إلغاء',
  'common.confirm': 'تأكيد',
  'common.ok': 'موافق',
  'common.sar': 'ريال',
  'common.night': 'ليلة',
  'common.all': 'الكل',

  // Notifications
  'notifications.title': 'الإشعارات',
  'notifications.all': 'الكل',
  'notifications.checkInToday': 'دخول اليوم',
  'notifications.checkOutToday': 'خروج اليوم',
  'notifications.confirmed': 'حجوزات مؤكدة',

  // Messages
  'messages.title': 'المحادثات',
  'messages.search': 'ابحث باسم الوحدة أو باسم الضيف',
  'messages.write': 'اكتب رسالتك',
  'messages.noConversations': 'لا يوجد محادثات حتى الآن',
  'messages.support': 'تحدث معنا - دعم المضيفين',

  // Onboarding
  'onboarding.title': 'البرنامج التعريفي للمضيف',
  'onboarding.topic1': 'السياحة في السعودية',
  'onboarding.topic2': 'طريقة استخدام المنصة',
  'onboarding.topic3': 'الخدمة الأساسية',
  'onboarding.congratulations': 'ألف مبروك',
  'onboarding.completed': 'تم اجتياز البرنامج التعريفي بنجاح',
  'onboarding.correctAnswer': 'إجابة صحيحة',
} as const;

const en: Record<TranslationKey, string> = {
  'tab.home': 'Home',
  'tab.properties': 'Properties',
  'tab.calendar': 'Calendar',
  'tab.reservations': 'Reservations',
  'tab.more': 'More',

  'auth.welcome': 'Register and rent your property with us',
  'auth.register': 'Register your property',
  'auth.login': 'Log in to Host app',
  'auth.phone': 'Phone number',
  'auth.otp': 'Verification code',
  'auth.verify': 'Verify',
  'auth.resend': 'Resend',
  'auth.next': 'Next',

  'dashboard.title': 'Dashboard',
  'dashboard.reports': 'Data Dashboard',
  'dashboard.recentBookings': 'Recent Bookings',
  'dashboard.upcomingGuests': 'Upcoming Guests',
  'dashboard.recentTransfers': 'Recent Transfers',
  'dashboard.recentReviews': 'Recent Reviews',
  'dashboard.recentReports': 'Recent Reports',
  'dashboard.accountSummary': 'Account Summary',
  'dashboard.pricing': 'Pricing',
  'dashboard.financial': 'Financial Transactions',

  'properties.title': 'Properties & Units',
  'properties.listed': 'Listed',
  'properties.unlisted': 'Unlisted',
  'properties.edit': 'Edit',
  'properties.save': 'Save',
  'properties.unitInfo': 'Unit Information',
  'properties.address': 'Address',
  'properties.map': 'Location on Map',
  'properties.bookingTerms': 'Booking Terms',
  'properties.suitability': 'Who is this unit suitable for?',
  'properties.familiesAndSingles': 'Families & Singles',
  'properties.familiesOnly': 'Families Only',
  'properties.singlesOnly': 'Singles Only',
  'properties.deposit': 'Security Deposit',

  'calendar.title': 'Calendar',
  'calendar.listedOnly': 'Show listed units only',

  'reservations.title': 'Reservations',
  'reservations.recent': 'Recent Bookings',
  'reservations.upcoming': 'Upcoming Guests',
  'reservations.confirmed': 'Confirmed',
  'reservations.inPayment': 'In Payment',
  'reservations.waiting': 'Waiting',
  'reservations.cancelled': 'Cancelled',
  'reservations.noShow': 'No Show',

  'reviews.title': 'Guest Reviews',
  'reviews.cleanliness': 'Cleanliness',
  'reviews.condition': 'Condition',
  'reviews.information': 'Information',
  'reviews.service': 'Service',
  'reviews.reply': 'Reply to guest comment',
  'reviews.send': 'Send',

  'more.profile': 'Profile',
  'more.reviews': 'Reviews',
  'more.financial': 'Financial Transactions',
  'more.permits': 'Tourism Permits',
  'more.pricing': 'Pricing',
  'more.protection': 'Host Protection Program',
  'more.settings': 'Settings',
  'more.suggestions': 'Host Suggestions',
  'more.articles': 'Articles',
  'more.complaints': 'Reports & Complaints',
  'more.changeRequests': 'Change Requests',
  'more.referrals': 'Referral Links',
  'more.discountCodes': 'Discount Codes',
  'more.onboarding': 'Introduction Program',
  'more.invoices': 'Invoices & Statements',
  'more.terms': 'Terms of Use',
  'more.contact': 'Contact Us',
  'more.logout': 'Log Out',

  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
  'common.retry': 'Try again',
  'common.empty': 'No data',
  'common.search': 'Search',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.ok': 'OK',
  'common.sar': 'SAR',
  'common.night': 'night',
  'common.all': 'All',

  'notifications.title': 'Notifications',
  'notifications.all': 'All',
  'notifications.checkInToday': 'Check-in Today',
  'notifications.checkOutToday': 'Check-out Today',
  'notifications.confirmed': 'Confirmed Bookings',

  'messages.title': 'Conversations',
  'messages.search': 'Search by unit or guest name',
  'messages.write': 'Write a message',
  'messages.noConversations': 'No conversations yet',
  'messages.support': 'Host Support',

  'onboarding.title': 'Host Introduction Program',
  'onboarding.topic1': 'Tourism in Saudi Arabia',
  'onboarding.topic2': 'How to use the platform',
  'onboarding.topic3': 'Basic service standards',
  'onboarding.congratulations': 'Congratulations!',
  'onboarding.completed': 'Program completed successfully',
  'onboarding.correctAnswer': 'Correct answer',
};

export type Locale = 'ar' | 'en';

let currentLocale: Locale = 'ar';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: TranslationKey): string {
  const translations = currentLocale === 'ar' ? ar : en;
  return translations[key] || key;
}
