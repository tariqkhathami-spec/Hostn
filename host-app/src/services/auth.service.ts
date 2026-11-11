import api from './api';

export const authService = {
  sendOtp: (phone: string, method: 'sms' | 'whatsapp' = 'sms', lang: string = 'ar') =>
    api.post('/auth/send-otp', { phone, method, lang, role: 'host' }).then(r => r.data),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/verify-otp', { phone, otp, role: 'host' }).then(r => r.data),
  register: (data: { name: string; phone: string; email: string; nationalId: string }) =>
    api.post('/auth/register', { ...data, role: 'host' }).then(r => r.data),
  getOnboardingStatus: () => api.get('/host/onboarding/status').then(r => r.data),
  completeOnboarding: () => api.post('/host/onboarding/finish').then(r => r.data),
};
