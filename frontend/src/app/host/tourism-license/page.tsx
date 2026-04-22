'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { hostApi, uploadApi } from '@/lib/api';
import { usePageTitle } from '@/lib/usePageTitle';
import {
  Loader2, ChevronDown, ChevronUp, ShieldCheck, Plus,
  Building2, X, AlertTriangle, FileCheck, Trash2, Pencil,
  Upload, FileText, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────

interface LicenseData {
  workType?: 'individual' | 'company';
  licenseNumber: string;
  nationalId?: string;
  commercialRegister?: string;
  documentUrl?: string;
  issueDate?: string;
  expiryDate?: string;
  status: 'pending' | 'active' | 'expired' | 'rejected';
}

interface LicenseUnit {
  unitId: string;
  nameEn: string;
  nameAr: string;
  thumbnail: string | null;
  license: LicenseData | null;
}

interface LicenseProperty {
  propertyId: string;
  propertyTitle: string;
  propertyTitleAr: string;
  unitCount: number;
  units: LicenseUnit[];
  location?: { city?: string; district?: string };
}

// ── Translations ──────────────────────────────────────────────────────

const t: Record<string, Record<string, string>> = {
  title: { en: 'Ministry of Tourism License', ar: 'رخصة وزارة السياحة' },
  helpTitle: { en: 'Need help?', ar: 'تريد مساعدة؟' },
  helpDesc: { en: 'Learn how to issue your tourism permit from the Ministry of Tourism', ar: 'كيفية إصدار التصريح' },
  addPermit: { en: 'Add Permit', ar: 'اضف تصريح' },
  addLicense: { en: 'Add License', ar: 'اضف الرخصة' },
  editPermit: { en: 'Edit', ar: 'تعديل' },
  deletePermit: { en: 'Remove', ar: 'حذف' },
  save: { en: 'Save', ar: 'حفظ' },
  cancel: { en: 'Cancel', ar: 'إلغاء' },
  units: { en: 'units', ar: 'وحدات' },
  unit: { en: 'unit', ar: 'وحدة' },
  noProperties: { en: 'No properties found', ar: 'لا توجد عقارات' },
  noPropertiesDesc: { en: 'Create a listing to manage tourism licenses', ar: 'أنشئ إعلاناً لإدارة رخص السياحة' },
  active: { en: 'Active', ar: 'فعالة' },
  pending: { en: 'Pending', ar: 'قيد المراجعة' },
  expired: { en: 'Expired', ar: 'منتهية' },
  rejected: { en: 'Rejected', ar: 'مرفوضة' },
  saveSuccess: { en: 'License saved successfully', ar: 'تم حفظ الرخصة بنجاح' },
  deleteSuccess: { en: 'License removed successfully', ar: 'تم إزالة الرخصة بنجاح' },
  deleteConfirm: { en: 'Are you sure you want to remove this license?', ar: 'هل تريد إزالة هذه الرخصة؟' },
  warningTitle: { en: 'Units without permits', ar: 'وحدات بدون تصريح' },
  warningDesc: { en: 'Units without a tourism permit may be hidden from search results', ar: 'الوحدات بدون تصريح سياحي قد تكون مخفية من نتائج البحث' },
  required: { en: 'This field is required', ar: 'هذا الحقل مطلوب' },
  addLicenseTitle: { en: 'Add Tourism License', ar: 'إضافة رخصة سياحة' },
  editLicenseTitle: { en: 'Edit Tourism License', ar: 'تعديل رخصة السياحة' },
  expires: { en: 'Expires', ar: 'ينتهي' },
  licenseNo: { en: 'License #', ar: 'رقم الرخصة' },

  // Work type
  workType: { en: 'Work Type', ar: 'نوع العمل' },
  individual: { en: 'Individual', ar: 'فرد' },
  company: { en: 'Company', ar: 'شركة' },

  // Individual fields
  motPermitNumber: { en: 'MOT Permit Number', ar: 'رقم تصريح وزارة السياحة' },
  nationalId: { en: 'National ID Number', ar: 'رقم الهوية الوطنية' },
  enterMotPermit: { en: 'Enter MOT permit number', ar: 'ادخل رقم تصريح وزارة السياحة' },
  enterNationalId: { en: 'Enter national ID number', ar: 'ادخل رقم الهوية الوطنية' },

  // Company fields
  licenseNumber: { en: 'License Number', ar: 'رقم الرخصة' },
  commercialRegister: { en: 'Commercial Register Number', ar: 'رقم السجل التجاري' },
  enterLicenseNumber: { en: 'Enter license number', ar: 'ادخل رقم الرخصة' },
  enterCommRegister: { en: 'Enter commercial register number', ar: 'ادخل رقم السجل التجاري' },

  // Document upload
  uploadPdf: { en: 'Upload PDF Document', ar: 'رفع ملف PDF' },
  chooseFile: { en: 'Choose file', ar: 'اختيار ملف' },
  uploading: { en: 'Uploading...', ar: 'جاري الرفع...' },
  uploaded: { en: 'File uploaded', ar: 'تم رفع الملف' },
  pdfOnly: { en: 'PDF format only, max 10MB', ar: 'صيغة PDF فقط، الحد الأقصى 10 ميجابايت' },
  removeFile: { en: 'Remove file', ar: 'حذف الملف' },
};

// ── Status Badge ──────────────────────────────────────────────────────

function StatusBadge({ status, lang }: { status: string; lang: 'en' | 'ar' }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    expired: 'bg-red-50 text-red-700 border-red-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };
  const labels: Record<string, Record<string, string>> = {
    active: t.active,
    pending: t.pending,
    expired: t.expired,
    rejected: t.rejected,
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
      colors[status] || colors.pending
    )}>
      {status === 'active' && <FileCheck className="w-3 h-3" />}
      {labels[status]?.[lang] || status}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function TourismLicensePage() {
  const { language } = useLanguage();
  const lang = language as 'en' | 'ar';
  const isAr = lang === 'ar';
  usePageTitle(isAr ? 'رخصة وزارة السياحة' : 'Tourism License');

  const [properties, setProperties] = useState<LicenseProperty[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<LicenseUnit | null>(null);
  const [formData, setFormData] = useState({
    workType: 'individual' as 'individual' | 'company',
    licenseNumber: '',
    nationalId: '',
    commercialRegister: '',
    documentUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<LicenseUnit | null>(null);

  // Count unlicensed units
  const unlicensedCount = properties.reduce((sum, p) =>
    sum + p.units.filter((u) => !u.license).length, 0
  );

  // ── Load data ─────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const res = await hostApi.getLicenseOverview();
      setProperties(res.data?.data || []);
    } catch {
      toast.error(isAr ? 'فشل في تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Toggle accordion ──────────────────────────────────────────────

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Open modal ────────────────────────────────────────────────────

  const openAddModal = (unit: LicenseUnit) => {
    setEditingUnit(unit);
    setFormData({
      workType: 'individual',
      licenseNumber: '',
      nationalId: '',
      commercialRegister: '',
      documentUrl: '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (unit: LicenseUnit) => {
    setEditingUnit(unit);
    setFormData({
      workType: unit.license?.workType || 'individual',
      licenseNumber: unit.license?.licenseNumber || '',
      nationalId: unit.license?.nationalId || '',
      commercialRegister: unit.license?.commercialRegister || '',
      documentUrl: unit.license?.documentUrl || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  // ── File upload handler ───────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error(isAr ? 'يرجى اختيار ملف PDF' : 'Please select a PDF file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(isAr ? 'حجم الملف يتجاوز 10 ميجابايت' : 'File size exceeds 10MB');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('document', file);
      const res = await uploadApi.uploadDocument(fd, 'tourism-licenses');
      const url = res.data?.data?.url;
      if (url) {
        setFormData((prev) => ({ ...prev, documentUrl: url }));
        toast.success(isAr ? 'تم رفع الملف بنجاح' : 'File uploaded successfully');
      }
    } catch {
      toast.error(isAr ? 'فشل في رفع الملف' : 'Failed to upload file');
    } finally {
      setUploading(false);
      // Reset the input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Save license ──────────────────────────────────────────────────

  const handleSave = async () => {
    const errors: Record<string, boolean> = {};
    if (!formData.licenseNumber.trim()) errors.licenseNumber = true;
    if (formData.workType === 'individual' && !formData.nationalId.trim()) errors.nationalId = true;
    if (formData.workType === 'company' && !formData.commercialRegister.trim()) errors.commercialRegister = true;
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!editingUnit) return;
    setSubmitting(true);

    try {
      await hostApi.upsertLicense(editingUnit.unitId, {
        workType: formData.workType,
        licenseNumber: formData.licenseNumber.trim(),
        nationalId: formData.workType === 'individual' ? formData.nationalId.trim() : undefined,
        commercialRegister: formData.workType === 'company' ? formData.commercialRegister.trim() : undefined,
        documentUrl: formData.documentUrl || undefined,
      });
      toast.success(t.saveSuccess[lang]);
      setShowModal(false);
      await loadData();
    } catch {
      toast.error(isAr ? 'فشل في حفظ الرخصة' : 'Failed to save license');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete license ────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await hostApi.deleteLicense(deleteTarget.unitId);
      toast.success(t.deleteSuccess[lang]);
      setDeleteTarget(null);
      await loadData();
    } catch {
      toast.error(isAr ? 'فشل في حذف الرخصة' : 'Failed to remove license');
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.title[lang]}</h1>

      {/* Help banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">{t.helpTitle[lang]}</p>
          <p className="text-xs text-amber-600 mt-0.5">{t.helpDesc[lang]}</p>
        </div>
      </div>

      {/* Warning banner for unlicensed units */}
      {unlicensedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">{t.warningTitle[lang]}</p>
            <p className="text-xs text-red-600 mt-0.5">{t.warningDesc[lang]}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {properties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t.noProperties[lang]}</p>
          <p className="text-sm text-gray-400 mt-1">{t.noPropertiesDesc[lang]}</p>
        </div>
      ) : (
        /* Property accordion list */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {properties.map((prop) => (
            <div key={prop.propertyId}>
              {/* Accordion header */}
              <button
                onClick={() => toggleExpand(prop.propertyId)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-start"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {expandedIds.has(prop.propertyId)
                    ? <ChevronUp className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {isAr && prop.propertyTitleAr ? prop.propertyTitleAr : prop.propertyTitle}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {prop.unitCount} {prop.unitCount === 1 ? t.unit[lang] : t.units[lang]}
                    </p>
                  </div>
                </div>
                {/* Summary: how many licensed */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {prop.units.every((u) => u.license?.status === 'active') ? (
                    <span className="text-xs text-emerald-600 font-medium">✓</span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">
                      {prop.units.filter((u) => !u.license).length} {isAr ? 'بدون تصريح' : 'unlicensed'}
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded unit list */}
              {expandedIds.has(prop.propertyId) && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  {prop.units.map((unit) => (
                    <div
                      key={unit.unitId}
                      className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 last:border-b-0"
                    >
                      {/* Thumbnail */}
                      <div className="w-11 h-11 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                        {unit.thumbnail ? (
                          <img src={unit.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Unit info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {isAr && unit.nameAr ? unit.nameAr : unit.nameEn || unit.nameAr}
                        </p>
                        {unit.license && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {t.licenseNo[lang]}: {unit.license.licenseNumber}
                            {unit.license.workType && (
                              <> · {unit.license.workType === 'individual' ? t.individual[lang] : t.company[lang]}</>
                            )}
                          </p>
                        )}
                      </div>

                      {/* License action */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {unit.license ? (
                          <>
                            <StatusBadge status={unit.license.status} lang={lang} />
                            <button
                              onClick={() => openEditModal(unit)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title={t.editPermit[lang]}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(unit)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title={t.deletePermit[lang]}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openAddModal(unit)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {t.addPermit[lang]}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── License Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingUnit?.license ? t.editLicenseTitle[lang] : t.addLicenseTitle[lang]}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Unit name */}
            {editingUnit && (
              <p className="text-sm text-gray-500 mb-4 -mt-2">
                {isAr && editingUnit.nameAr ? editingUnit.nameAr : editingUnit.nameEn || editingUnit.nameAr}
              </p>
            )}

            {/* Form */}
            <div className="space-y-4">
              {/* Work Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.workType[lang]}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, workType: 'individual' })}
                    className={cn(
                      'px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all',
                      formData.workType === 'individual'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {t.individual[lang]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, workType: 'company' })}
                    className={cn(
                      'px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all',
                      formData.workType === 'company'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {t.company[lang]}
                  </button>
                </div>
              </div>

              {/* === Individual Fields === */}
              {formData.workType === 'individual' && (
                <>
                  {/* MOT Permit Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.motPermitNumber[lang]} *
                    </label>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => {
                        setFormData({ ...formData, licenseNumber: e.target.value });
                        setFormErrors({ ...formErrors, licenseNumber: false });
                      }}
                      className={cn(
                        'w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                        formErrors.licenseNumber ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      )}
                      placeholder={t.enterMotPermit[lang]}
                    />
                    {formErrors.licenseNumber && (
                      <p className="text-xs text-red-500 mt-1">{t.required[lang]}</p>
                    )}
                  </div>

                  {/* National ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.nationalId[lang]} *
                    </label>
                    <input
                      type="text"
                      value={formData.nationalId}
                      onChange={(e) => {
                        setFormData({ ...formData, nationalId: e.target.value });
                        setFormErrors({ ...formErrors, nationalId: false });
                      }}
                      className={cn(
                        'w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                        formErrors.nationalId ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      )}
                      placeholder={t.enterNationalId[lang]}
                    />
                    {formErrors.nationalId && (
                      <p className="text-xs text-red-500 mt-1">{t.required[lang]}</p>
                    )}
                  </div>
                </>
              )}

              {/* === Company Fields === */}
              {formData.workType === 'company' && (
                <>
                  {/* License Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.licenseNumber[lang]} *
                    </label>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => {
                        setFormData({ ...formData, licenseNumber: e.target.value });
                        setFormErrors({ ...formErrors, licenseNumber: false });
                      }}
                      className={cn(
                        'w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                        formErrors.licenseNumber ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      )}
                      placeholder={t.enterLicenseNumber[lang]}
                    />
                    {formErrors.licenseNumber && (
                      <p className="text-xs text-red-500 mt-1">{t.required[lang]}</p>
                    )}
                  </div>

                  {/* Commercial Register Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.commercialRegister[lang]} *
                    </label>
                    <input
                      type="text"
                      value={formData.commercialRegister}
                      onChange={(e) => {
                        setFormData({ ...formData, commercialRegister: e.target.value });
                        setFormErrors({ ...formErrors, commercialRegister: false });
                      }}
                      className={cn(
                        'w-full border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                        formErrors.commercialRegister ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      )}
                      placeholder={t.enterCommRegister[lang]}
                    />
                    {formErrors.commercialRegister && (
                      <p className="text-xs text-red-500 mt-1">{t.required[lang]}</p>
                    )}
                  </div>
                </>
              )}

              {/* PDF Document Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.uploadPdf[lang]}</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {formData.documentUrl ? (
                  /* File uploaded state */
                  <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-emerald-800">{t.uploaded[lang]}</p>
                      <p className="text-xs text-emerald-600 truncate">{t.pdfOnly[lang]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, documentUrl: '' })}
                      className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title={t.removeFile[lang]}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Upload button */
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl px-4 py-4 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-all disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t.uploading[lang]}
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>{t.chooseFile[lang]}</span>
                      </>
                    )}
                  </button>
                )}
                {!formData.documentUrl && !uploading && (
                  <p className="text-xs text-gray-400 mt-1.5">{t.pdfOnly[lang]}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={submitting || uploading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.save[lang]}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t.cancel[lang]}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10 text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-4">{t.deleteConfirm[lang]}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                {t.deletePermit[lang]}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t.cancel[lang]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
