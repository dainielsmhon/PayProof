import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, UserCheck, UserX, Trash2, ArrowRightLeft, Shield, CheckCircle, XCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentUserRole, setCurrentUserRole] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);

            // Check current user role first
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // We need to fetch the current user's role to ensure they are admin
            // Note: RLS policies should also enforce this on the server side
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
                // If error is 403/401 it means RLS blocked it (not admin)
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
        } catch (err) {
            alert('שגיאה בעדכון סטטוס: ' + err.message);
        }
    };

    const toggleRole = async (userId, currentRole) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        try {
            if (!window.confirm(`האם אתה בטוח שברצונך לשנות את ההרשאה ל-${newRole}?`)) return;

            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            alert('שגיאה בעדכון הרשאה: ' + err.message);
        }
    };

    const filteredUsers = users.filter(user =>
    (user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;
    }

    const handleForceAdmin = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return alert('No user found');

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    role: 'admin',
                    status: 'approved',
                    first_name: 'Admin',
                    last_name: 'User'
                });

            if (error) throw error;
            alert('הוגדרת כמנהל בהצלחה! מרענן...');
            window.location.reload();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    if (currentUserRole !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <Shield size={64} className="text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">אין לך הרשאה לצפות בדף זה</h2>
                <p className="text-gray-400 mb-4">דף זה מיועד למנהלי מערכת בלבד.</p>
                <button
                    onClick={handleForceAdmin}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors text-sm"
                >
                    לחץ כאן כדי להגדיר את עצמך כמנהל (מצב פיתוח)
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">ניהול משתמשים</h1>
                    <p className="text-gray-400">אישור, חסימה וניהול משתמשים במערכת</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute right-4 top-3.5 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="חיפוש לפי שם או אימייל..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-dark-card/50 border border-white/10 rounded-xl py-3 pr-12 pl-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-sm">
                                <th className="p-4 font-medium">שם פרטי</th>
                                <th className="p-4 font-medium">שם משפחה</th>
                                <th className="p-4 font-medium">אימייל</th>
                                <th className="p-4 font-medium">סטטוס</th>
                                <th className="p-4 font-medium">תפקיד</th>
                                <th className="p-4 font-medium">תאריך הרשמה</th>
                                <th className="p-4 font-medium">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors text-white text-sm">
                                    <td className="p-4 font-medium">{user.first_name || '-'}</td>
                                    <td className="p-4 font-medium">{user.last_name || '-'}</td>
                                    <td className="p-4 text-gray-400">{user.email || 'לא זמין'}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${user.status === 'approved'
                                            ? 'bg-green-500/20 text-green-400 border-green-500/50'
                                            : user.status === 'blocked'
                                                ? 'bg-red-500/20 text-red-400 border-red-500/50'
                                                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                                            }`}>
                                            {user.status === 'approved' ? 'מאושר' : user.status === 'blocked' ? 'חסום' : 'ממתין'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`flex items-center gap-1 ${user.role === 'admin' ? 'text-purple-400' : 'text-gray-400'}`}>
                                            {user.role === 'admin' && <Shield size={14} />}
                                            {user.role === 'admin' ? 'מנהל' : 'משתמש'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-500">
                                        {new Date(user.created_at).toLocaleDateString('he-IL')}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {user.status !== 'blocked' ? (
                                                <button
                                                    onClick={() => handleStatusChange(user.id, 'blocked')}
                                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"
                                                    title="חסום משתמש"
                                                >
                                                    <UserX size={16} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleStatusChange(user.id, 'approved')}
                                                    className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors border border-green-500/20"
                                                    title="אשר משתמש"
                                                >
                                                    <UserCheck size={16} />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => toggleRole(user.id, user.role)}
                                                className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors border border-purple-500/20"
                                                title="שנה הרשאה (מנהל/משתמש)"
                                            >
                                                <ArrowRightLeft size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        לא נמצאו משתמשים התואמים את החיפוש
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;
