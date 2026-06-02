import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    useEffect(() => {
        // Ensure the user is authenticated (link does this automatically via fragment)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                // If no session, the link might be invalid or expired
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
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden text-right" dir="rtl">

            {/* Custom Toast Notification */}
            {toast && (
                <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border animate-fade-in-down ${toast.type === 'error'
                        ? 'bg-red-500/20 border-red-500/50 text-red-200'
                        : 'bg-green-500/20 border-green-500/50 text-green-200'
                    }`}>
                    {toast.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
                    <span className="font-bold text-lg">{toast.message}</span>
                </div>
            )}

            {/* Background Shapes */}
            <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />

            {/* Main Card */}
            <div className="w-full max-w-md p-8 m-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative z-10">

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        איפוס סיסמה
                    </h1>
                    <p className="text-gray-400 font-medium">
                        אנא בחר סיסמה חדשה לחשבונך במערכת
                    </p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-gray-400 text-xs font-bold mr-1">סיסמה חדשה</label>
                        <div className="relative">
                            <Lock className="absolute right-4 top-3.5 text-gray-500" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pr-12 pl-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-black/30 transition-all font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-gray-400 text-xs font-bold mr-1">אימות סיסמה חדשה</label>
                        <div className="relative">
                            <Lock className="absolute right-4 top-3.5 text-gray-500" size={18} />
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pr-12 pl-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-black/30 transition-all font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                <Save size={20} /> עדכן סיסמה
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 text-center text-xs text-gray-600 font-medium">
                PayProof © 2026 Secured by Supabase
            </div>
        </div>
    );
};

export default ResetPassword;
