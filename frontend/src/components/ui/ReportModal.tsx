'use client';

import { useState } from 'react';
import { reportsApi } from '@/lib/api';
import { ReportTargetType, ReportReason } from '@/types';
import { X, Flag, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const reasonLabels: Record<ReportReason, string> = {
  inappropriate_content: 'Inappropriate Content',
  fraud: 'Fraud or Scam',
  harassment: 'Harassment',
  misleading_listing: 'Misleading Listing',
  safety_concern: 'Safety Concern',
  discrimination: 'Discrimination',
  spam: 'Spam',
  property_damage: 'Property Damage',
  noise_violation: 'Noise Violation',
  cancellation_abuse: 'Cancellation Abuse',
  policy_violation: 'Policy Violation',
  other: 'Other',
};

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetName?: string;
  relatedBooking?: string;
}

export default function ReportModal({ isOpen, onClose, targetType, targetId, targetName, relatedBooking }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>('other');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return toast.error('Please describe the issue');
    setSubmitting(true);
    try {
      await reportsApi.createReport({
        targetType,
        targetId,
        reason,
        description: description.trim(),
        relatedBooking,
      });
      toast.success('Report submitted successfully');
      onClose();
      setReason('other');
      setDescription('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit report';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <Flag className="w-4 h-4 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              Report {targetType === 'property' ? 'Property' : targetType === 'user' ? 'User' : 'Review'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {targetName && (
          <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-600">Reporting: <span className="font-medium">{targetName}</span></p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value as ReportReason)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {Object.entries(reasonLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              rows={4}
              placeholder="Please describe the issue in detail..."
              required
              maxLength={1000}
            />
            <p className="text-xs text-gray-400 mt-1">{description.length}/1000</p>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2.5 text-sm font-medium bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition">
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
