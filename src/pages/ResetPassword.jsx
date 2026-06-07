import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, Save, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    // Ensure the user is authenticated (link does this automatically via fragment)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        showToast('קישור לא תקין או שפג תוקפו', 'error');
        setTimeout(() => navigate('/login'), 3000);
      }
    });
  }, [navigate]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      showToast('הסיסמה חייבת להכיל לפחות 6 תווים', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('הסיסמאות אינן תואמות', 'error');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      showToast('הסיסמה עודכנה בהצלחה! מעביר אותך לדף הבית...', 'success');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      showToast('שגיאה בעדכון הסיסמה: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-pp-bg relative overflow-hidden text-right p-4" dir="rtl">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border animate-slide-up ${
          toast.type === 'error'
            ? 'bg-red-500/20 border-red-500/50 text-red-200'
            : 'bg-green-500/20 border-green-500/50 text-green-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Aurora Ambient Lighting Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-pp-violet/10 blur-[120px] animate-aurora-slow" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-pp-cyan/10 blur-[120px] animate-aurora-slow" style={{ animationDelay: '-4s' }} />
      </div>

      {/* Main Glass Card */}
      <div className="w-full max-w-md p-8 rounded-3xl pp-glass border border-white/10 shadow-2xl relative z-10 animate-slide-up">
        
        {/* Logo Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pp-violet to-pp-cyan p-0.5 shadow-lg shadow-pp-violet/20 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-[#050914] flex items-center justify-center">
              <Lock className="text-pp-cyan" size={24} />
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-black text-white mb-2">
            איפוס סיסמה
          </h1>
          <p className="text-pp-text-secondary text-sm font-medium">
            בחר סיסמה חדשה ומאובטחת כדי לקבל גישה מחדש לחשבונך
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-white text-xs font-bold mr-1">סיסמה חדשה</label>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-pp-text-muted" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-xl py-3.5 pr-12 pl-12 text-white placeholder-gray-500 focus:outline-none focus:border-pp-violet/50 focus:bg-black/30 transition-all font-medium pp-focus"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-pp-text-muted hover:text-white transition-colors cursor-pointer"
                aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="text-white text-xs font-bold mr-1">אימות סיסמה חדשה</label>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-pp-text-muted" size={18} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-xl py-3.5 pr-12 pl-12 text-white placeholder-gray-500 focus:outline-none focus:border-pp-violet/50 focus:bg-black/30 transition-all font-medium pp-focus"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-pp-text-muted hover:text-white transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-6 pp-btn-primary cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-pp-violet/20"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Save size={18} />
                עדכן סיסמה
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center text-xs text-pp-text-muted font-medium z-10">
        PayProof © 2026 Secured by Supabase
      </div>
    </div>
  );
};

export default ResetPassword;
