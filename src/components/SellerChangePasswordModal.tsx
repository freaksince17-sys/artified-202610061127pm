import React, { useState } from 'react';
import { Lock, KeyRound, Check, X, ShieldAlert, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { 
  validateSellerPassword, 
  validateSellerPasswordAsync,
  setCustomSellerPasswordAsync, 
  isCustomPasswordSet,
  resetSellerPasswordToDefaultAsync 
} from '../utils/sellerAuthService';

interface SellerChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SellerChangePasswordModal: React.FC<SellerChangePasswordModalProps> = ({
  isOpen,
  onClose
}) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const hasCustom = isCustomPasswordSet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsSaving(true);

    try {
      // 1. Verify current password
      const isCurrentValid = validateSellerPassword(currentPass) || (await validateSellerPasswordAsync(currentPass));
      if (!isCurrentValid) {
        setErrorMsg('Current password is incorrect.');
        setIsSaving(false);
        return;
      }

      // 2. Validate new password
      if (newPass.trim().length < 4) {
        setErrorMsg('New password must be at least 4 characters long.');
        setIsSaving(false);
        return;
      }

      // 3. Confirm matches
      if (newPass !== confirmPass) {
        setErrorMsg('New password and confirmation do not match.');
        setIsSaving(false);
        return;
      }

      // 4. Save new password with SHA-256 hash
      const result = await setCustomSellerPasswordAsync(newPass);
      if (!result.success) {
        setErrorMsg(result.error || 'Failed to update password.');
        setIsSaving(false);
        return;
      }

      setSuccessMsg('Seller Studio password successfully updated & hashed to Firebase!');
      setTimeout(() => {
        onClose();
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        setSuccessMsg('');
        setIsSaving(false);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error updating password');
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset Seller Studio password back to the default (1234)?')) {
      await resetSellerPasswordToDefaultAsync();
      setSuccessMsg('Password reset to default (1234).');
      setTimeout(() => {
        onClose();
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        setSuccessMsg('');
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#FAF8F5] border border-[#E8DFD8] rounded-2xl shadow-2xl p-6 sm:p-7 z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1C1B1A] text-[#D4AF37] flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-[#1C1B1A]">
                Change Studio Password
              </h3>
              <p className="text-[11px] text-[#736C65] tracking-wide uppercase font-medium">
                {hasCustom ? 'Update Secure Passcode' : 'Set Your First Custom Passcode'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#736C65] hover:text-[#1C1B1A] hover:bg-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#5E5955] leading-relaxed mb-4">
          Set a secure private password to protect your store editing privileges, product pricing, and order management.
        </p>

        {errorMsg && (
          <div className="mb-3.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Current Password */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#1C1B1A] mb-1">
              Current Passcode {hasCustom ? '' : '(Default is 1234)'}
            </label>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                required
                placeholder={hasCustom ? 'Enter current password' : 'Enter 1234'}
                className="w-full pl-9 pr-9 py-2 bg-white border border-[#E8DFD8] focus:border-[#C5A880] text-xs rounded-xl focus:outline-none text-[#1C1B1A]"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#1C1B1A]"
              >
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#1C1B1A] mb-1">
              New Secure Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
                placeholder="At least 4 characters"
                className="w-full pl-9 pr-9 py-2 bg-white border border-[#E8DFD8] focus:border-[#C5A880] text-xs rounded-xl focus:outline-none text-[#1C1B1A]"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7A6B] hover:text-[#1C1B1A]"
              >
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#1C1B1A] mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-[#8C7A6B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
                placeholder="Re-enter new password"
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#E8DFD8] focus:border-[#C5A880] text-xs rounded-xl focus:outline-none text-[#1C1B1A]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-[#1C1B1A] text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-[#34312F] transition-colors shadow-xs"
            >
              Save New Password
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 border border-[#E8DFD8] bg-white text-xs font-semibold uppercase tracking-wider text-[#5E5955] rounded-xl hover:text-[#1C1B1A] transition-colors"
            >
              Cancel
            </button>
          </div>

          {hasCustom && (
            <div className="text-center pt-1 border-t border-[#E8DFD8]/60">
              <button
                type="button"
                onClick={handleReset}
                className="text-[10px] text-[#A69E96] hover:text-rose-600 transition-colors"
              >
                Reset to default password (1234)
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
