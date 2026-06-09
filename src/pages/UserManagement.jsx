import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Search, UserCheck, UserX, Trash2, ArrowRightLeft, Shield,
  CheckCircle, XCircle, Loader2, Sparkles, User, Calendar, Mail
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Check current user role first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch the current user's role to ensure they are admin
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setCurrentUserRole(currentUserProfile?.role || 'user');

      // Fetch all profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching profiles:', error);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      showToast(newStatus === 'blocked' ? 'המשתמש נחסם בהצלחה' : 'המשתמש אושר בהצלחה', 'info');
    } catch (err) {
      showToast('שגיאה בעדכון סטטוס: ' + err.message, 'error');
    }
  };

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      if (!window.confirm(`האם אתה בטוח שברצונך לשנות את ההרשאה ל-${newRole === 'admin' ? 'מנהל' : 'משתמש'}?`)) return;

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast('הרשאת המשתמש עודכנה בהצלחה', 'success');
    } catch (err) {
      showToast('שגיאה בעדכון הרשאה: ' + err.message, 'error');
    }
  };

  const handleForceAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return showToast('משתמש לא מחובר', 'error');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          role: 'admin',
          status: 'approved',
          first_name: 'דניאל',
          last_name: 'שמחון'
        });

      if (error) throw error;
      showToast('הוגדרת כמנהל בהצלחה! מרענן...', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showToast('שגיאה: ' + err.message, 'error');
    }
  };

  const filteredUsers = users.filter(user =>
    (user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4 text-center">
        <Loader2 className="animate-spin text-pp-violet" size={48} />
        <p className="text-pp-text-secondary text-sm font-medium animate-pulse">טוען נתוני משתמשים...</p>
      </div>
    );
  }

  if (currentUserRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center max-w-md mx-auto px-6" dir="rtl">
        <div className="w-20 h-20 rounded-full bg-pp-coral/10 border border-pp-coral/20 flex items-center justify-center mb-6 animate-pulse text-pp-coral">
          <Shield size={40} />
        </div>
        <h2 className="text-3xl font-display font-bold text-white mb-3">גישה חסומה</h2>
        <p className="text-pp-text-secondary mb-8 leading-relaxed">
          דף זה מיועד למנהלי מערכת בלבד. אין לחשבונך הנוכחי את ההרשאות הדרושות לצפייה במידע זה.
        </p>
        <button
          onClick={handleForceAdmin}
          className="w-full pp-btn-primary cursor-pointer border border-pp-coral/30 hover:shadow-lg hover:shadow-pp-coral/15"
          style={{ background: 'linear-gradient(135deg, var(--pp-coral) 0%, #d63031 100%)' }}
        >
          שדרג את עצמי למנהל מערכת (מצב פיתוח)
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-right pb-10" dir="rtl">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md border animate-slide-up ${
          toast.type === 'error'
            ? 'bg-red-500/20 border-red-500/50 text-red-200'
            : toast.type === 'info'
            ? 'bg-blue-500/20 border-blue-500/50 text-blue-200'
            : 'bg-green-500/20 border-green-500/50 text-green-200'
        }`}>
          {toast.type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} />}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-3xl font-display font-black text-white flex items-center gap-2">
            <span className="pp-gradient-text">ניהול משתמשים</span>
            <Shield className="text-pp-violet" size={24} />
          </h1>
          <p className="text-pp-text-secondary text-sm mt-1">
            בקרה מלאה על המשתמשים במערכת: אישור, חסימה ושינוי הרשאות גישה
          </p>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="relative animate-slide-up" style={{ animationDelay: '50ms' }}>
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-pp-text-muted" size={18} />
        <input
          type="text"
          placeholder="חיפוש לפי שם פרטי, משפחה או כתובת אימייל..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pp-input w-full pr-12 pl-4"
        />
      </div>

      {/* Responsive View: Cards for Mobile, Grid/Table for Large Screens */}
      <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        {filteredUsers.length === 0 ? (
          <div className="pp-glass-card text-center py-16 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 text-pp-text-muted">
              <User size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">לא נמצאו משתמשים</h3>
            <p className="text-pp-text-secondary">נסה לשנות את מילות החיפוש או לוודא שהמשתמשים קיימים במערכת.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block pp-glass-card overflow-hidden border border-white/10 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-pp-text-muted text-xs font-bold uppercase tracking-wider">
                      <th className="p-4 pr-6">משתמש</th>
                      <th className="p-4">אימייל</th>
                      <th className="p-4">סטטוס פנימי</th>
                      <th className="p-4">תפקיד</th>
                      <th className="p-4">תאריך הצטרפות</th>
                      <th className="p-4 pl-6 text-left">פעולות ניהול</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors duration-200">
                        <td className="p-4 pr-6 font-bold text-white flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pp-violet/10 to-pp-cyan/10 border border-pp-violet/20 flex items-center justify-center text-pp-violet font-display font-bold">
                            {(user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                          </div>
                          <div>
                            <span className="block">{user.first_name || '-'} {user.last_name || ''}</span>
                            <span className="text-xs font-normal text-pp-text-muted">ID: {user.id.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-pp-text-secondary">{user.email || 'לא זמין'}</td>
                        <td className="p-4">
                          <span className={`pp-badge ${
                            user.status === 'approved'
                              ? 'pp-badge-success'
                              : user.status === 'blocked'
                              ? 'pp-badge-danger'
                              : 'pp-badge-warning'
                          }`}>
                            {user.status === 'approved' ? 'מאושר' : user.status === 'blocked' ? 'חסום' : 'ממתין'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`pp-badge ${user.role === 'admin' ? 'pp-badge-violet' : 'bg-white/5 border border-white/10 text-pp-text-secondary'}`}>
                            {user.role === 'admin' ? 'מנהל מערכת' : 'משתמש רגיל'}
                          </span>
                        </td>
                        <td className="p-4 text-pp-text-muted">
                          {new Date(user.created_at).toLocaleDateString('he-IL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="p-4 pl-6 text-left">
                          <div className="flex items-center gap-2 justify-end">
                            {user.status !== 'blocked' ? (
                              <button
                                onClick={() => handleStatusChange(user.id, 'blocked')}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-pp-coral border border-pp-coral/20 rounded-xl transition-all cursor-pointer"
                                title="חסום משתמש"
                                aria-label="חסום משתמש"
                              >
                                <UserX size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusChange(user.id, 'approved')}
                                className="p-2 bg-green-500/10 hover:bg-green-500/20 text-pp-mint border border-pp-mint/20 rounded-xl transition-all cursor-pointer"
                                title="אשר משתמש"
                                aria-label="אשר משתמש"
                              >
                                <UserCheck size={16} />
                              </button>
                            )}

                            <button
                              onClick={() => toggleRole(user.id, user.role)}
                              className="p-2 bg-pp-violet/10 hover:bg-pp-violet/20 text-pp-violet border border-pp-violet/20 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                              title="שנה הרשאה (מנהל/משתמש)"
                              aria-label="שנה תפקיד משתמש"
                            >
                              <ArrowRightLeft size={14} />
                              שינוי תפקיד
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Layout (Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
              {filteredUsers.map((user) => (
                <div key={user.id} className="pp-glass-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pp-violet/10 to-pp-cyan/10 border border-pp-violet/20 flex items-center justify-center text-pp-violet font-display font-bold">
                        {(user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">
                          {user.first_name || 'משתמש'} {user.last_name || 'חדש'}
                        </h4>
                        <span className="text-xs text-pp-text-muted font-mono">{user.email}</span>
                      </div>
                    </div>
                    
                    <span className={`pp-badge ${
                      user.status === 'approved'
                        ? 'pp-badge-success'
                        : user.status === 'blocked'
                        ? 'pp-badge-danger'
                        : 'pp-badge-warning'
                    }`}>
                      {user.status === 'approved' ? 'מאושר' : user.status === 'blocked' ? 'חסום' : 'ממתין'}
                    </span>
                  </div>

                  <div className="border-t border-white/5 pt-3 flex justify-between items-center text-xs text-pp-text-secondary">
                    <span className="flex items-center gap-1">
                      <Shield size={14} className="text-pp-violet" />
                      תפקיד: <strong className="text-white">{user.role === 'admin' ? 'מנהל' : 'משתמש'}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      הצטרף: {new Date(user.created_at).toLocaleDateString('he-IL')}
                    </span>
                  </div>

                  <div className="border-t border-white/5 pt-3 flex gap-2 justify-end">
                    {user.status !== 'blocked' ? (
                      <button
                        onClick={() => handleStatusChange(user.id, 'blocked')}
                        className="pp-btn-secondary py-2 px-3 text-xs text-pp-coral border border-pp-coral/20 hover:bg-red-500/10 cursor-pointer flex items-center gap-1.5"
                      >
                        <UserX size={14} />
                        חסום משתמש
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(user.id, 'approved')}
                        className="pp-btn-secondary py-2 px-3 text-xs text-pp-mint border border-pp-mint/20 hover:bg-green-500/10 cursor-pointer flex items-center gap-1.5"
                      >
                        <UserCheck size={14} />
                        אשר משתמש
                      </button>
                    )}

                    <button
                      onClick={() => toggleRole(user.id, user.role)}
                      className="pp-btn-primary py-2 px-3 text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowRightLeft size={14} />
                      שינוי תפקיד
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
