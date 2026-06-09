import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, LogIn, UserPlus, Loader2, AlertCircle, CheckCircle, Zap, Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [rememberMe, setRememberMe] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

    // Form fields
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
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { data: { user }, error: signUpError } = await supabase.auth.signUp({ email, password });
                if (signUpError) throw signUpError;

                if (user && !user.identities?.length) {
                    showToast('משתמש זה כבר קיים במערכת. נסה להתחבר.', 'error');
                    return;
                }

                if (user) {
                    await supabase.from('profiles').insert([{
                        id: user.id,
                        first_name: firstName,
                        last_name: lastName,
                        mobile,
                        email,
                    }]);
                }

                const { data: { session } } = await supabase.auth.getSession();
                if (!session && user) {
                    showToast('הרשמה בוצעה! נשלח מייל לאימות 📧', 'success');
                    setIsLogin(true);
                    return;
                }

                showToast('הרשמה בוצעה בהצלחה! מתחבר...', 'success');
            }
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
        if (!email) { showToast('נא להזין כתובת אימייל לשחזור סיסמה', 'error'); return; }
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

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin },
            });
            if (error) throw error;
        } catch (err) {
            showToast('שגיאה בהתחברות עם גוגל: ' + err.message, 'error');
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
            style={{ background: 'var(--pp-bg)' }}
            dir="rtl"
        >
            {/* Aurora Background */}
            <div className="pp-aurora" aria-hidden="true" />

            {/* Extra glow orbs */}
            <div
                className="absolute top-1/4 right-0 w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none"
                style={{ background: 'var(--pp-violet)' }}
                aria-hidden="true"
            />
            <div
                className="absolute bottom-1/4 left-0 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none"
                style={{ background: 'var(--pp-cyan)' }}
                aria-hidden="true"
            />

            {/* Toast */}
            {toast && (
                <div
                    className={`
                        fixed top-5 left-1/2 -translate-x-1/2 z-50
                        flex items-center gap-3 px-5 py-3.5 rounded-2xl
                        border backdrop-blur-xl shadow-2xl
                        animate-fade-in-down
                        ${toast.type === 'error'
                            ? 'bg-pp-coral/15 border-pp-coral/40 text-white'
                            : 'bg-pp-mint/15 border-pp-mint/40 text-white'
                        }
                    `}
                    role="alert"
                    aria-live="assertive"
                >
                    {toast.type === 'error'
                        ? <AlertCircle size={18} className="text-pp-coral shrink-0" />
                        : <CheckCircle size={18} className="text-pp-mint shrink-0" />
                    }
                    <span className="text-sm font-medium">{toast.message}</span>
                </div>
            )}

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                <div
                    className="pp-glass p-8 animate-bounce-in"
                    style={{ animationDelay: '0ms' }}
                >

                    {/* Logo Header */}
                    <div className="text-center mb-8">
                        {/* Logo Icon */}
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 overflow-hidden border border-white/10 shadow-glow-violet animate-float bg-pp-bg">
                            <img src="/apple-touch-icon.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="text-3xl font-display font-black pp-gradient-text mb-1">PayProof</h1>
                        <p className="text-pp-text-secondary text-sm font-medium">
                            {isLogin ? 'ברוכים הבאים! שמחים לראות אתכם שוב' : 'הצטרפו ונהלו את הכספים שלכם חכם'}
                        </p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <button
                            id="tab-login"
                            type="button"
                            onClick={() => setIsLogin(true)}
                            aria-pressed={isLogin}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${isLogin ? 'bg-pp-violet text-white shadow-glow-violet' : 'text-pp-text-secondary hover:text-white'}`}
                        >
                            כניסה
                        </button>
                        <button
                            id="tab-register"
                            type="button"
                            onClick={() => setIsLogin(false)}
                            aria-pressed={!isLogin}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${!isLogin ? 'bg-pp-violet text-white shadow-glow-violet' : 'text-pp-text-secondary hover:text-white'}`}
                        >
                            הרשמה
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleAuth} className="space-y-4">

                        {/* Sign Up Extra Fields */}
                        {!isLogin && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label htmlFor="firstName" className="block text-xs font-semibold text-pp-text-secondary">שם פרטי</label>
                                        <div className="relative">
                                            <User className="absolute right-3 top-1/2 -translate-y-1/2 text-pp-text-muted" size={15} aria-hidden="true" />
                                            <input
                                                id="firstName"
                                                type="text"
                                                required={!isLogin}
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="pp-input pp-input-icon-right pp-focus text-sm"
                                                placeholder="ישראל"
                                                autoComplete="given-name"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="lastName" className="block text-xs font-semibold text-pp-text-secondary">שם משפחה</label>
                                        <div className="relative">
                                            <User className="absolute right-3 top-1/2 -translate-y-1/2 text-pp-text-muted" size={15} aria-hidden="true" />
                                            <input
                                                id="lastName"
                                                type="text"
                                                required={!isLogin}
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="pp-input pp-input-icon-right pp-focus text-sm"
                                                placeholder="ישראלי"
                                                autoComplete="family-name"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="mobile" className="block text-xs font-semibold text-pp-text-secondary">טלפון נייד</label>
                                    <div className="relative">
                                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-pp-text-muted" size={15} aria-hidden="true" />
                                        <input
                                            id="mobile"
                                            type="tel"
                                            required={!isLogin}
                                            value={mobile}
                                            onChange={(e) => setMobile(e.target.value)}
                                            className="pp-input pp-input-icon-right pp-focus text-sm"
                                            placeholder="050-0000000"
                                            autoComplete="tel"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="block text-xs font-semibold text-pp-text-secondary">אימייל</label>
                            <div className="relative">
                                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-pp-text-muted" size={15} aria-hidden="true" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pp-input pp-input-icon-right pp-focus text-sm"
                                    placeholder="email@example.com"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label htmlFor="password" className="block text-xs font-semibold text-pp-text-secondary">סיסמה</label>
                            <div className="relative">
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-pp-text-muted" size={15} aria-hidden="true" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pp-input pp-input-icon-right pl-10 pp-focus text-sm"
                                    placeholder="••••••••"
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-pp-text-muted hover:text-white transition-colors cursor-pointer pp-focus rounded"
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember / Forgot — login only */}
                        {isLogin && (
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer group" htmlFor="remember-me">
                                    <input
                                        id="remember-me"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-white/20 cursor-pointer accent-pp-violet"
                                    />
                                    <span className="text-xs text-pp-text-secondary group-hover:text-white transition-colors">זכור אותי</span>
                                </label>
                                <button
                                    type="button"
                                    id="forgot-password-btn"
                                    onClick={handleForgotPassword}
                                    className="text-xs font-semibold text-pp-violet hover:text-pp-cyan transition-colors cursor-pointer pp-focus rounded"
                                >
                                    שכחתי סיסמה
                                </button>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            id="auth-submit-btn"
                            type="submit"
                            disabled={loading}
                            className="pp-btn-primary w-full py-3 text-sm mt-2"
                            aria-label={isLogin ? 'כנס למערכת' : 'צור חשבון חדש'}
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : isLogin ? (
                                <><LogIn size={16} /> כנס למערכת</>
                            ) : (
                                <><UserPlus size={16} /> צור חשבון חדש</>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative flex items-center my-5">
                        <div className="flex-grow h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                        <span className="px-3 text-xs text-pp-text-muted font-medium">או</span>
                        <div className="flex-grow h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    </div>

                    {/* Google Login */}
                    <button
                        id="google-login-btn"
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        aria-label="התחבר באמצעות Google"
                        className="pp-btn-secondary w-full py-3 text-sm"
                    >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>התחבר באמצעות Google</span>
                    </button>

                </div>

                {/* Footer */}
                <p className="text-center text-xs text-pp-text-muted mt-4 font-medium">
                    PayProof © 2026 &nbsp;•&nbsp; מאובטח על ידי Supabase
                </p>
            </div>
        </div>
    );
};

export default Login;
