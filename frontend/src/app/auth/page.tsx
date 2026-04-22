'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, getRoleRedirect } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { Phone, ArrowLeft, ChevronDown, Globe } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';

const GCC_COUNTRIES = [
  { code: '+966', flag: '\u{1F1F8}\u{1F1E6}', en: 'Saudi Arabia', ar: '\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629', digits: 9, startsWith: '5' },
  { code: '+971', flag: '\u{1F1E6}\u{1F1EA}', en: 'UAE', ar: '\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A', digits: 9, startsWith: '5' },
  { code: '+973', flag: '\u{1F1E7}\u{1F1ED}', en: 'Bahrain', ar: '\u0627\u0644\u0628\u062D\u0631\u064A\u0646', digits: 8, startsWith: '' },
  { code: '+965', flag: '\u{1F1F0}\u{1F1FC}', en: 'Kuwait', ar: '\u0627\u0644\u0643\u0648\u064A\u062A', digits: 8, startsWith: '' },
  { code: '+968', flag: '\u{1F1F4}\u{1F1F2}', en: 'Oman', ar: '\u0639\u064F\u0645\u0627\u0646', digits: 8, startsWith: '' },
  { code: '+974', flag: '\u{1F1F6}\u{1F1E6}', en: 'Qatar', ar: '\u0642\u0637\u0631', digits: 8, startsWith: '' },
];

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>}>
      <AuthContent />
    </Suspense>
  );
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const { loginWithOtp } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';

  // Country picker
  const [selectedCountry, setSelectedCountry] = useState(GCC_COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);

  // Phone + OTP
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpMethod, setOtpMethod] = useState<'sms' | 'whatsapp'>('sms');
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus phone input
  useEffect(() => {
    if (!otpSent && phoneInputRef.current) {
      setTimeout(() => phoneInputRef.current?.focus(), 100);
    }
  }, [otpSent]);

  // Auto-focus OTP input
  useEffect(() => {
    if (otpSent && otpInputRef.current) {
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, [otpSent]);

  // Close country picker on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setShowCountryPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const startCountdown = () => {
    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const validatePhone = () => {
    const { digits, startsWith } = selectedCountry;
    if (!phone || phone.length !== digits) {
      return isAr ? `\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D (${digits} \u0623\u0631\u0642\u0627\u0645)` : `Invalid phone number (${digits} digits)`;
    }
    if (startsWith && !phone.startsWith(startsWith)) {
      return isAr ? `\u0627\u0644\u0631\u0642\u0645 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0628\u062F\u0623 \u0628\u0640 ${startsWith}` : `Number must start with ${startsWith}`;
    }
    return null;
  };

  const handleSendOtp = async (method: 'sms' | 'whatsapp' = otpMethod) => {
    const error = validatePhone();
    if (error) {
      setErrors({ phone: error });
      return;
    }
    setErrors({});
    setOtpLoading(true);
    setOtpMethod(method);
    try {
      await authApi.sendOtp({ phone, countryCode: selectedCountry.code, method, lang });
      setOtpSent(true);
      startCountdown();
      toast.success(isAr ? '\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'OTP sent successfully');
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (isAr ? '\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632' : 'Failed to send OTP'));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 4) {
      setErrors({ otp: isAr ? '\u0623\u062F\u062E\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'Enter the verification code' });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await loginWithOtp(phone, otpCode);
      toast.success(isAr ? '\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643!' : 'Welcome!');
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        const storedUser = localStorage.getItem('hostn_user');
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        router.push(getRoleRedirect(parsedUser?.role));
      }
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || (isAr ? '\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D' : 'Invalid verification code'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Top row: logo + language toggle */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors">
            Hostn
          </Link>
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle language"
          >
            <Globe className="w-4 h-4" />
            {isAr ? 'English' : '\u0627\u0644\u0639\u0631\u0628\u064A\u0629'}
          </button>
        </div>

        {/* Welcome heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {isAr ? '\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643 \u0641\u064A Hostn' : 'Welcome to Hostn'}
          </h1>
          <p className="mt-2 text-gray-500">
            {isAr ? '\u0633\u062C\u0644 \u062F\u062E\u0648\u0644\u0643 \u0623\u0648 \u0623\u0646\u0634\u0626 \u062D\u0633\u0627\u0628\u0643 \u0628\u0631\u0642\u0645 \u0647\u0627\u062A\u0641\u0643' : 'Sign in or create your account with your phone number'}
          </p>
        </div>

        {/* Phone + OTP Form */}
        <form onSubmit={handleVerifyOtp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5 select-none">
          {!otpSent ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {isAr ? '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641' : 'Phone Number'}
                </label>
                <div className="flex gap-2" dir="ltr">
                  {/* Country code picker */}
                  <div className="relative" ref={countryRef}>
                    <button
                      type="button"
                      onClick={() => setShowCountryPicker(!showCountryPicker)}
                      className="flex items-center gap-1.5 px-3 h-full bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 font-medium hover:bg-gray-100 transition-colors min-w-[105px]"
                    >
                      <span className="text-lg leading-none">{selectedCountry.flag}</span>
                      <span>{selectedCountry.code}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showCountryPicker ? 'rotate-180' : ''}`} />
                    </button>

                    {showCountryPicker && (
                      <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[220px]">
                        {GCC_COUNTRIES.map((country) => (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(country);
                              setShowCountryPicker(false);
                              setPhone('');
                              phoneInputRef.current?.focus();
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                              selectedCountry.code === country.code ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                            }`}
                          >
                            <span className="text-lg leading-none">{country.flag}</span>
                            <span className="flex-1 text-start">{isAr ? country.ar : country.en}</span>
                            <span className="text-gray-400 font-mono text-xs">{country.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phone input */}
                  <Input
                    ref={phoneInputRef}
                    type="tel"
                    placeholder={selectedCountry.startsWith ? `${selectedCountry.startsWith}XXXXXXXX` : 'XXXXXXXX'}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, selectedCountry.digits))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendOtp(); } }}
                    leftIcon={<Phone className="w-4 h-4" />}
                    error={errors.phone}
                    className="flex-1"
                    dir="ltr"
                    autoFocus
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={() => handleSendOtp()}
                isLoading={otpLoading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-400"
                size="lg"
              >
                {isAr ? '\u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'Send Verification Code'}
              </Button>
            </>
          ) : (
            <>
              <div className="text-center mb-2">
                <p className="text-sm text-gray-600">
                  {isAr ? '\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0625\u0644\u0649' : 'Verification code sent to'}
                </p>
                <p className="text-sm font-bold text-gray-900 mt-1" dir="ltr">
                  {selectedCountry.code} {phone}
                </p>
              </div>
              <Input
                ref={otpInputRef}
                label={isAr ? '\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642' : 'Verification Code'}
                type="text"
                inputMode="numeric"
                placeholder="0000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                error={errors.otp}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                dir="ltr"
                autoFocus
              />
              <Button
                type="submit"
                isLoading={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-400"
                size="lg"
              >
                {isAr ? '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644' : 'Sign In'}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtpCode(''); }}
                  className="text-primary-600 font-medium hover:underline"
                >
                  {isAr ? '\u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0631\u0642\u0645' : 'Change number'}
                </button>
                {countdown > 0 ? (
                  <span className="text-gray-400">
                    {isAr ? `\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 (${countdown}\u062B)` : `Resend (${countdown}s)`}
                  </span>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSendOtp('sms')}
                      className="text-primary-600 font-medium hover:underline"
                    >
                      {isAr ? '\u0625\u0639\u0627\u062F\u0629 \u0639\u0628\u0631 SMS' : 'Resend SMS'}
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleSendOtp('whatsapp')}
                      className="text-green-600 font-medium hover:underline"
                    >
                      {isAr ? '\u0639\u0628\u0631 \u0648\u0627\u062A\u0633\u0627\u0628' : 'WhatsApp'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </form>

        {/* Back */}
        <div className="mt-6 text-sm text-gray-400 text-center">
          <Link href="/" className="hover:text-gray-600 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5 inline rtl:rotate-180" /> {isAr ? '\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
