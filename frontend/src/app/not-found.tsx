import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="rtl">
      <div className="text-center max-w-md">
        <div className="relative w-40 h-40 mx-auto mb-8">
          <div className="absolute inset-0 bg-primary-100 rounded-full" />
          <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
            <span className="text-5xl font-extrabold text-primary-700" dir="ltr">404</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">الصفحة غير موجودة</h1>
        <p className="text-gray-500 mb-1">الرابط الذي فتحته غير صحيح أو أن الصفحة نُقلت.</p>
        <p className="text-gray-400 text-sm mb-8" dir="ltr">Page not found</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="btn-primary px-6 py-2.5 text-sm font-medium">
            الصفحة الرئيسية
          </Link>
          <Link
            href="/search"
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            تصفّح العقارات
          </Link>
        </div>
      </div>
    </div>
  );
}
