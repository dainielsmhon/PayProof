import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, LogIn, UserPlus, ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }
    const [rememberMe, setRememberMe] = useState(true);

    // Form Fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [mobile, setMobile] = useState('');

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        // setError(null); // Removed, now handled by toast

        try {
            if (isLogin) {
                // Sign In
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                // Sign Up
                const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;

                if (user && !user.identities?.length) {
                    showToast('משתמש זה כבר קיים במערכת. נסה להתחבר.', 'error');
                    return;
                }

                if (user) {
                    // Create Profile
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert([
                            {
                                id: user.id,
                                first_name: firstName,
                                last_name: lastName,
                                mobile: mobile,
                                email: email, // Save email for management view
                            }
                        ]);

                    if (profileError) {
                        console.error('Profile creation failed:', profileError);
                    }
                }

                // Check if session was created (if Confirm Email is on, session will be null)
                const { data: { session } } = await supabase.auth.getSession();
                if (!session && user) {
                    showToast('הרשמה בוצעה בהצלחה! נשלח מייל לאימות (נא לבדוק גם בתיקיית הספאם 📧).', 'success');
                    setIsLogin(true); // Switch back to login view
                    return; // Stop execution, don't redirect
                }

                showToast('הרשמה בוצעה בהצלחה! מתחבר...', 'success');
            }
            // Redirect to Dashboard on success only if we have a session
            navigate('/');
        } catch (err) {
            let msg = err.message;
            if (msg === 'Invalid login credentials') msg = 'אימייל או סיסמה שגויים';
            if (msg.includes('already registered')) msg = 'משתמש זה כבר קיים במערכת';
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            showToast('נא להזין כתובת אימייל לשחזור סיסמה', 'error');
            return;
        }
        try {
            setLoading(true);
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password',
            });
            if (error) throw error;
            showToast('נשלח קישור לאיפוס סיסמה לכתובת האימייל שלך', 'success');
        } catch (err) {
            showToast(err.message, 'error');
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

            {/* Abstract Background Shapes */}
            <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />

            {/* Main Card */}
            <div className="w-full max-w-md p-8 m-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative z-10">

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        PayProof
                    </h1>
                    <p className="text-gray-400 font-medium">
                        {isLogin ? 'ברוכים הבאים! שמחים לראות אתכם שוב' : 'הצטרפו אלינו והתחילו לנהל חכם'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-5">

                    {/* Sign Up Extra Fields */}
                    {!isLogin && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-gray-400 text-xs font-bold mr-1">שם פרטי</label>
                                <div className="relative">
                                    <User className="absolute right-4 top-3.5 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        required={!isLogin}
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pr-12 pl-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-black/30 transition-all font-medium"
                                        placeholder="ישראל"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-gray-400 text-xs font-bold mr-1">שם משפחה</label>
                                <div className="relative">
                                    <User className="absolute right-4 top-3.5 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        required={!isLogin}
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pr-12 pl-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-black/30 transition-all font-medium"
                                        placeholder="ישראלי"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {!isLogin && (
                        <div className="space-y-2">
                            <label className="text-gray-400 text-xs font-bold mr-1">טלפון נייד</label>
                            <div className="relative">
                                <Phone className="absolute right-4 top-3.5 text-gray-500" size={18} />
                                <input
                                    type="tel"
                                    required={!isLogin}
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                    className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pr-12 pl-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-black/30 transition-all font-medium"
                                    placeholder="050-0000000"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-gray-400 text-xs font-bold mr-1">אימייל</label>
                        <div className="relative">
                            <Mail className="absolute right-4 top-3.5 text-gray-500" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/20 border border-white/5 rounded-xl py-3 pr-12 pl-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-black/30 transition-all font-medium"
                                placeholder="email@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-gray-400 text-xs font-bold mr-1">סיסמה</label>
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

                    {/* Options: Remember Me & Forgot Password */}
                    {isLogin && (
                        <div className="flex items-center justify-between pt-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-600 bg-transparent text-blue-500 focus:ring-offset-0 focus:ring-0 checked:bg-blue-500 transition-all"
                                />
                                <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">זכור אותי</span>
                            </label>

                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                שכחתי סיסמה?
                            </button>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" />
                        ) : isLogin ? (
                            <>
                                <LogIn size={20} /> אמת פרטים וכנס
                            </>
                        ) : (
                            <>
                                <UserPlus size={20} /> צור חשבון חדש
                            </>
                        )}
                    </button>
                </form>

                {/* Toggle Mode */}
                <div className="mt-8 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-gray-400 hover:text-white transition-colors text-sm font-medium flex items-center justify-center gap-2 w-full"
                    >
                        {isLogin ? (
                            <>
                                אין לך עדיין חשבון? <span className="text-blue-400 font-bold">הירשם עכשיו</span>
                            </>
                        ) : (
                            <>
                                יש לך כבר חשבון? <span className="text-blue-400 font-bold">התחבר למערכת</span>
                            </>
                        )}
                    </button>
                </div>

            </div>

            {/* Footer / Copyright */}
            <div className="absolute bottom-6 text-center text-xs text-gray-600 font-medium">
                PayProof © 2026 Secured by Supabase
            </div>

        </div>
    );
};

export default Login;
