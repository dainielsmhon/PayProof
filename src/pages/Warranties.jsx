import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, Shield, Loader2, Save, X, FileText, Upload, ExternalLink, Hash, Search } from 'lucide-react';

const Warranties = () => {
  const [warranties, setWarranties] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); // State לחיפוש
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // שדות הטופס
  const [productName, setProductName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);

  /* New: Get User Session for proper RLS */
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchWarranties(user.id);
    });
  }, []);

  // Removed direct call in useEffect because we need user ID first
  // useEffect(() => { fetchWarranties(); }, []); 

  const fetchWarranties = async (userId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('user_id', userId) // Security: Filter by User
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      setWarranties(data || []);
    } catch (error) {
      console.error('Fetch error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ... (keeping existing filter logic) ...
  const filteredWarranties = warranties.filter(w =>
    w.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.store?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = async (file) => {
    if (!file) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
      return publicUrl;
    } catch (error) { throw error; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { alert('נא להתחבר מחדש'); return; }

    setIsSaving(true);
    try {
      let receiptUrl = null;
      if (receiptFile) receiptUrl = await handleFileUpload(receiptFile);
      const warrantyData = {
        user_id: user.id, // Security: Assign to User
        product_name: productName.trim(),
        store: storeName.trim() || null,
        purchase_date: purchaseDate || null,
        expiry_date: expiryDate,
        serial_number: serialNumber.trim() || null,
        receipt_url: receiptUrl
      };
      const { error } = await supabase.from('warranties').insert([warrantyData]);
      if (error) throw error;

      // Reset Form
      setProductName(''); setStoreName(''); setPurchaseDate(''); setExpiryDate(''); setSerialNumber('');
      setReceiptFile(null); setShowForm(false);

      await fetchWarranties(user.id);
    } catch (error) { alert(`שגיאה: ${error.message}`); } finally { setIsSaving(false); }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto text-right text-black" dir="rtl">
      {/* כותרת האפליקציה המעודכנת */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-3xl font-black text-blue-600 flex items-center gap-3">
            <Shield className="w-10 h-10" /> PayProof
          </h1>
          <p className="text-gray-500 mt-1 font-medium">ניהול אחריות חכם</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* שורת חיפוש חדשה */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="חפש מוצר, חנות או S/N..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 font-medium text-right"
            />
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 shrink-0">
            {showForm ? <X size={20} /> : <Plus size={20} />}
            {showForm ? 'ביטול' : 'הוסף'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-50 mb-10">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">שם המוצר *</label>
              <input required type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none bg-white font-semibold" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">חנות / ספק</label>
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none bg-white font-semibold" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">מספר סידורי (S/N)</label>
              <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none bg-white font-semibold" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">תוקף אחריות *</label>
              <input required type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none bg-white font-semibold" />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="w-full p-4 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                <Upload size={20} className="text-blue-600" />
                <span className="text-blue-700 font-bold">{receiptFile ? receiptFile.name : 'צרף קבלה (PDF/תמונה)'}</span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setReceiptFile(e.target.files[0])} />
              </label>
            </div>
            <button type="submit" disabled={isSaving} className="md:col-span-2 bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-3">
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={24} />}
              {isSaving ? 'שומר...' : 'שמור למערכת'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-blue-600"><Loader2 className="animate-spin mb-4" size={40} /><p className="font-bold">טוען...</p></div>
      ) : (
        <div className="grid gap-4">
          {filteredWarranties.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <p className="text-gray-500 font-bold">לא נמצאו פריטים תואמים</p>
            </div>
          ) : (
            filteredWarranties.map((w) => {
              const isExpired = w.expiry_date ? new Date(w.expiry_date) < new Date() : false;
              return (
                <div key={w.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:border-blue-200 transition-all">
                  <div className="text-right">
                    <div className="flex items-center gap-3 justify-end md:justify-start">
                      <h3 className="text-lg font-bold text-gray-800">{w.product_name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isExpired ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {isExpired ? 'פג תוקף' : 'בתוקף'}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs mt-1 flex flex-row-reverse md:flex-row gap-4 justify-end md:justify-start">
                      <span>🏬 {w.store || 'כללי'}</span>
                      <span className="font-bold text-blue-500">⏳ {new Date(w.expiry_date).toLocaleDateString('he-IL')}</span>
                      {w.serial_number && <span className="flex items-center gap-1"><Hash size={12} /> {w.serial_number}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {w.receipt_url && (
                      <a href={w.receipt_url} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                        <FileText size={20} />
                      </a>
                    )}
                    <button onClick={async () => { if (window.confirm('למחוק?')) { await supabase.from('warranties').delete().eq('id', w.id); fetchWarranties(); } }} className="text-gray-300 hover:text-red-500 p-2">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Warranties;