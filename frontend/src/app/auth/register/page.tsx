'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Mail, Lock, User, Phone, Eye, EyeOff, Shield, Star, Award, Briefcase, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const { t } = useLanguage();

  const defaultRole = searchParams.get('role') || 'guest';

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: defaultRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: form.role,
      });
      toast.success('Account created successfully!');
      router.push('/dashboard');
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };�6��u77v�&B��W�T�fb6�74��S�'r�B��B"����W�R6�74��S�'r�B��B"��Т��'WGF���Т��Ė�W@��&V�׷B�vWF��6��f�&�77v�&D�&V�r�ТG�S�'77v�&B �f�VS׶f�&��6��f�&�77v�&GТ��6��vSײ�R���WFFR�v6��f�&�77v�&Br�R�F&vWB�f�VR�ТW'&�#׶W'&�'2�6��f�&�77v�&GТ�6V���FW#׷B�vWF��6��f�&�77v�&E�6V���FW"r�Т�VgD�6��׳���6�6�74��S�'r�B��B"��Т�ࠢ�6�74��S�'FW�Bׇ2FW�B�w&��S#�B�vWF��w&VUFW&�2r����ࠢ�'WGF��G�S�'7V&֗B"�4��F��s׶��F��w�6��S�&�r"6�74��S�'r�gV��#��B�vWF��6�v�W'WGF��r�Т��'WGF�����f�&�ࠢ�6�74��S�&�B�bFW�B�6V�FW"FW�B�6�FW�B�w&��c#��B�vWF��fT66�V�Br�ײrwТ�Ɩ��&Vc�"�WF����v��"6�74��S�&f��B�6V֖&��BFW�B�&��'��c��fW#�FW�B�&��'��sG&�6�F����6���'2#��B�vWF��6�v��Ɩ�r�Т��Ɩ�������F�c���F�cࠢ��&�v�C�&V֗V�f�7V��V���Т�F�b6�74��S�&��FFV��s�&��6�&V�F�fRf�W���fW&f��rֆ�FFV�#��F�`�6�74��S�&'6��WFR��6WB�&r�6�fW"&r�6V�FW"66�R�R �7G��S׷��&6�w&�V�D��vS�wW&�GG3�����vW2�V�7�6��6�����F��c3C�C�3Ssb�vfFSc66C��s��r���Т���F�`�6�74��S�&'6��WFR��6WB� �7G��S׷��&6�w&�V�C�vƖ�V"�w&F�V�B�cFVr�&v&�#b�B�Cb��"�R�&v&�S��#�#��"�CR�&v&���C�#r��cR�R�r���Т�ࠢ��FV6�&F�fRv��BƖ�R��Т�F�b6�74��S�&'6��WFRF���G#��VgB�'Fç&�v�B�r���gV��&r�w&F�V�B�F��"g&���v��B�Cf��v��B�S�SF��G&�7&V�B"�ࠢ�F�b6�74��S�&'6��WFR��6WB�f�W�f�W��6���W7F�g��&WGvVV��"�ç�bFW�B�v��FR#���F���Т�F�b6�74��S�&��FR�fFR֖��W"7G��S׷���F���FV���s�'2r����F�b6�74��S�&v��B�Ɩ�R�"�B"���6�74��S�'FW�B�6�f��B��VF�V�FW�B�v��FR�cWW&66RG&6���r�v�FW7B#��B�vWF���W&�W�7F'G2r�Т�����F�cࠢ��6V�FW#�fVGW&W2��Т�F�b6�74��S�'76Rג�b��FR�fFR֖��W"7G��S׷���F���FV���s�G2r��������6��6��V�B�F�F�S�B�vWF��fW&�f�VE&�W'F�W2r��FW63�B�vWF��fW&�f�VDFW62r������6��7F"�F�F�S�B�vWF��&V֗V�W�W&�V�6W2r��FW63�B�vWF��&V֗V�FW62r������6��v&B�F�F�S�B�vWF��FVF�6FVE7W�'Br��FW63�B�vWF��FVF�6FVDFW62r�����������6���6���F�F�R�FW62Ғ�����F�b�W�׷F�F�W�6�74��S�&f�W��FV�2�7F'Bv�B#��F�b6�74��S�'r���&r�v��FR�&�V�FVB׆�f�W��FV�2�6V�FW"�W7F�g��6V�FW"&6�G&��&�W"�6�f�W��6�&���#�Ė6��6�74��S�'r�R��RFW�B�v��B�C"����F�c��F�c��6�74��S�&f��B�6V֖&��BFW�B�6�#�F�F�W�����6�74��S�'FW�B�v��FR�SFW�Bׇ2�B��R#�FW67������F�c���F�c���Т��F�cࠢ��&�GF�Ӣ�Ff�&���v�Ɩv�G2��Т�F�b6�74��S�&w&�Bw&�B�6��2�"v�B��FR�fFR֖��W"7G��S׷���F���FV���s�g2r�������f�VS�B�vWF��6V7W&U��V�G2r���&Vârr����f�VS�B�vWF��fW&�f�VDƗ7F��w2r���&Vârr����f�VS�B�vWF��6VF�f�'7Br���&Vârr����f�VS�B�vWF��7W�'C#Crr���&Vârr��������7FB��������F�b�W�׶��6�74��S�&&r�v��FR�&6�G&��&�W"�6�&�V�FVB׆��B&�&FW"&�&FW"�v��FR�R#��F�b6�74��S�'FW�B�6�f��B�&��BFW�B�v��B�3#�7FB�f�VW���F�c���F�c���Т��F�c���F�c���F�c���F�c����Р�W��'BFVfV�BgV�7F���&Vv�7FW%vR����&WGW&����7W7V�6Rf��&6�׳�F�b6�74��S�&֖�ւ�67&VV�f�W��FV�2�6V�FW"�W7F�g��6V�FW"#��F�b6�74��S�&��FR�V�6RFW�B�w&��C#���F��r�����F�c���F�c����&Vv�7FW$6��FV�B����7W7V�6S�����
