'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Mail, Lock, Eye, EyeOff, Star } from 'lucide-react';
import toast from 'react-hot-toast';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const redirect = searchParams.get('redirect') || '/dashboard';

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email address';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      router.push(redirect);
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid credentials';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 max-w-2xl">
        <div className="w-full max-w-sm mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-12 group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Hostn</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
              Welcome back
            </h1>
            <p className="text-gray-500">Sign in to continue your luxury experience</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              placeholder="you@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="Enter your password"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus:outline-none text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="current-password"
            />

            <div className="flex justify-end">
              <a href="#" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                Forgot password?
              </a>
            </div>

            <Button type="submit" isLoading={loading} size="lg" className="w-full">
              Sign In
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>

      {/* Right: Premium visual panel */}
      <div className="hidden lg:block relative flex-1 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1000)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(160deg, rgba(26,14,46,0.92) 0%, rgba(59,21,120,0.82) 40%, rgba(109,40,217,0.65) 100%)',
          }}
        />

        {/* Decorative gold line */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-gold-400 via-gold-500/50 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-between p-12 xl:p-16 text-white">
          {/* Top: Brand tagline */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="gold-line mb-4" />
            <p className="text-sm font-medium text-white/60 uppercase tracking-widest">
              Luxury Stays in Saudi Arabia
            </p>
          </div>

          {/* Center: Testimonial */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-gold-400 text-gold-400" />
              ))}
            </div>
            <blockquote className="text-xl xl:text-2xl font-semibold leading-relaxed mb-5 max-w-md">
              &ldquo;Hostn made booking our family vacation effortless. The property was absolutely stunning.&rdquo;
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <span className="text-sm font-bold">NA</span>
              </div>
              <div>
                <p className="font-semibold text-sm">Nora A.</p>
                <p className="text-white/50 text-xs">Jeddah, Saudi Arabia</p>
              </div>
            </div>
          </div>

          {/* Bottom: Stats */}
          <div className="flex gap-8 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            {[
              { value: '1,200+', label: 'Properties' },
              { value: '4.9', label: 'Avg Rating' },
              { value: '15K+', label: 'Happy Guests' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-xl font-bold text-gold-300">{stat.value}</div>
                <div className="text-xs text-white/50">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>}>
      <LoginContent />
    </Suspense>
  );
}
