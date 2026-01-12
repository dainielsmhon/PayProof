import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, Shield, Loader2, Save, X, FileText, Upload, ExternalLink, Hash } from 'lucide-react';

const Warranties = () => {
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // שדות הטופס
  const [productName, setProductName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [serialNumber, setSerialNumber] = useState(''); // שדה חדש
  const [receiptFile, setReceiptFile] = useState(null);

  useEffect(() => {
    fetchWarranties();
  }, []);

  const fetchWarranties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      setWarranties(data || []);
    } catch (error) {
      console.error('Fetch error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName);
      return publicUrl;
    } catch (error) {
      console.error("❌ שגיאה בהעלאת קובץ:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let receiptUrl = null;
      if (receiptFile) {
        receiptUrl = await handleFileUpload(receiptFile);
      }

      const warrantyData = {
        product_name: productName.trim(),
        store: storeName.trim() || null,
        purchase_date: purchaseDate || null,
        expiry_date: expiryDate,
        serial_number: serialNumber.trim() || null, // הוספת מספר סידורי
        receipt_url: receiptUrl
      };

      const { error } = await supabase
        .from('warranties')
        .insert([warrantyData]);

      if (error) throw error;

      // איפוס טופס
      setProductName(''); setStoreName(''); setPurchaseDate(''); setExpiryDate(''); setSerialNumber('');
      setReceiptFile(null); setShowForm(false);
      await fetchWarranties();
      alert('✅ האחריות נשמרה בהצלחה!');
    } catch (error) {
      alert(`שגיאה בשמירה: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto text-right text-black" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-10 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-blue-600 flex items-center gap-3">
            <Shield className="w-10 h-10" /> PayProof
          </h1>
          <p className="text-gray-500 mt-1 font-medium text-right">ניהול אחריות וקבלה חכמה</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2">
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? 'ביטול' : 'הוסף אחריות'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-50 mb-10">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">שם המוצר *</label>
              <input required type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500 bg-white" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">חנות / ספק</label>
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500 bg-white" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">מספר סידורי (S/N)</label>
              <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500 bg-white" placeholder="אופציונלי" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">תאריך רכישה</label>
              <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500 bg-white" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">תוקף אחריות *</label>
              <input required type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500 bg-white" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">צירוף קבלה</label>
              <label className="w-full p-3 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                <Upload size={20} className="text-blue-600" />
                <span className="text-blue-700 font-bold overflow-hidden text-ellipsis">{receiptFile ? receiptFile.name : 'בחר קובץ'}</span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setReceiptFile(e.target.files[0])} />
              </label>
            </div>
            <button type="submit" disabled={isSaving} className="md:col-span-2 bg-green-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-green-700 flex items-center justify-center gap-3 disabled:bg-gray-400">
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={24} />}
              {isSaving ? 'מעלה קובץ ושומר...' : 'שמור למערכת'}
            </button>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-blue-600"><Loader2 className="animate-spin mb-4" size={48} /><p className="font-bold text-xl">טוען...</p></div>
      ) : (
        <div className="grid gap-4">
          {warranties.map((w) => {
            const isExpired = w.expiry_date ? new Date(w.expiry_date) < new Date() : false;
            const formattedExpiry = w.expiry_date ? new Date(w.expiry_date).toLocaleDateString('he-IL') : '-';

            return (
              <div key={w.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group text-right">
                <div className="text-right">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-800">{w.product_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${isExpired ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {isExpired ? 'פג תוקף' : 'בתוקף'}
                    </span>
                  </div>
                  <div className="text-gray-500 text-sm mt-1 flex flex-wrap gap-x-6 gap-y-1 text-right">
                    <span>🏬 {w.store || 'כללי'}</span>
                    <span className="font-bold text-blue-600">⏳ תוקף: {formattedExpiry}</span>
                    {w.serial_number && <span className="flex items-center gap-1"><Hash size={14} /> {w.serial_number}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {w.receipt_url && (
                    <a href={w.receipt_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold hover:bg-blue-100">
                      <FileText size={18} /> קבלה <ExternalLink size={14} />
                    </a>
                  )}
                  <button onClick={async () => { if(window.confirm('למחוק?')) { await supabase.from('warranties').delete().eq('id', w.id); fetchWarranties(); } }} className="text-gray-300 hover:text-red-500 p-2">
                    <Trash2 size={24} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Warranties;