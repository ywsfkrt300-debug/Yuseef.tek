import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { CreditCard, Plus, Trash2, Edit2, Check, X, Loader2, QrCode, Image as ImageIcon, ToggleLeft, ToggleRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";

export function AdminPaymentMethods() {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    qrCodeUrl: "",
    note: "",
    isActive: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "paymentMethods"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ms: any[] = [];
      snapshot.forEach(doc => ms.push({ id: doc.id, ...doc.data() }));
      setMethods(ms);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "paymentMethods");
    });
    return () => unsubscribe();
  }, []);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setFormData(prev => ({ ...prev, qrCodeUrl: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingMethod) {
        await updateDoc(doc(db, "paymentMethods", editingMethod.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success("تم تحديث طريقة الدفع");
      } else {
        const newDoc = doc(collection(db, "paymentMethods"));
        await setDoc(newDoc, {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("تم إضافة طريقة الدفع");
      }
      setIsModalOpen(false);
      setEditingMethod(null);
      setFormData({ name: "", code: "", qrCodeUrl: "", note: "", isActive: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "paymentMethods");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف طريقة الدفع هذه؟")) return;
    try {
      await deleteDoc(doc(db, "paymentMethods", id));
      toast.success("تم حذف طريقة الدفع");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "paymentMethods");
    }
  };

  const toggleStatus = async (method: any) => {
    try {
      await updateDoc(doc(db, "paymentMethods", method.id), {
        isActive: !method.isActive,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "paymentMethods");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">إدارة طرق الدفع</h1>
          <p className="text-slate-500 dark:text-slate-400">قم بإضافة وتعديل طرق الدفع المتاحة لرفع الرصيد من قبل المستخدمين.</p>
        </div>
        <button 
          onClick={() => { setEditingMethod(null); setFormData({ name: "", code: "", qrCodeUrl: "", note: "", isActive: true }); setIsModalOpen(true); }}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <Plus size={20} /> إضافة طريقة دفع
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
        ) : methods.length === 0 ? (
           <div className="col-span-full py-20 text-center text-slate-500">لا توجد طرق دفع متاحة.</div>
        ) : methods.map((m) => (
          <motion.div 
            layout 
            key={m.id}
            className={`bg-white dark:bg-slate-800 p-6 rounded-[32px] border transition-all flex flex-col gap-4 relative overflow-hidden group ${
              m.isActive ? "border-slate-100 dark:border-slate-700" : "border-slate-200 dark:border-slate-800 opacity-60 grayscale"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-700/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                   <CreditCard size={24} />
                </div>
                <div>
                   <h3 className="font-bold">{m.name}</h3>
                   <p className="text-xs text-slate-500">#{m.code || "بدون رمز"}</p>
                </div>
              </div>
              <button 
                onClick={() => toggleStatus(m)}
                className={`p-2 rounded-xl transition-colors ${m.isActive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                {m.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>

            <div className="flex-1 space-y-3">
               {m.qrCodeUrl && (
                 <div className="aspect-square w-24 bg-white p-2 rounded-xl border border-slate-100 mx-auto">
                    <img src={m.qrCodeUrl} className="w-full h-full object-contain" alt="QR" />
                 </div>
               )}
               {m.note && (
                 <p className="text-xs text-slate-500 text-center line-clamp-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl italic">
                   {m.note}
                 </p>
               )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-50 dark:border-slate-700/50">
              <button 
                onClick={() => { setEditingMethod(m); setFormData({ name: m.name, code: m.code || "", qrCodeUrl: m.qrCodeUrl || "", note: m.note || "", isActive: m.isActive }); setIsModalOpen(true); }}
                className="flex-1 py-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all flex items-center justify-center gap-2 font-bold text-sm"
              >
                <Edit2 size={16} /> تعديل
              </button>
              <button 
                onClick={() => handleDelete(m.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <h3 className="text-2xl font-bold mb-8 text-center">{editingMethod ? "تعديل طريقة دفع" : "إضافة طريقة دفع جديد"}</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="block text-sm font-bold text-slate-600 dark:text-slate-400">اسم الطريقة</label>
                       <input 
                         type="text" 
                         value={formData.name}
                         onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                         placeholder="مثال: زين كاش"
                         className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                         required
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-sm font-bold text-slate-600 dark:text-slate-400">رمز الدفع / الرقم</label>
                       <input 
                         type="text" 
                         value={formData.code}
                         onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                         placeholder="07xxxxxxxx"
                         className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors font-en placeholder:text-slate-400"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-400">ملاحظات للمستخدم</label>
                    <textarea 
                      value={formData.note}
                      onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                      placeholder="تعليمات الدفع، الأوقات المتاحة..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors min-h-[100px] placeholder:text-slate-400"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-400">صورة QR (اختياري)</label>
                    <div className="flex items-center gap-4">
                       <label className="flex-1 cursor-pointer">
                          <div className="w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center hover:border-indigo-500 transition-all text-slate-400 hover:text-indigo-500 group">
                             {formData.qrCodeUrl ? (
                               <img src={formData.qrCodeUrl} className="w-full h-full object-contain p-2" alt="Preview" />
                             ) : (
                               <>
                                 <QrCode size={32} className="mb-2" />
                                 <span className="text-xs font-bold">اختر صورة QR</span>
                               </>
                             )}
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                       </label>
                       {formData.qrCodeUrl && (
                         <button 
                           type="button" 
                           onClick={() => setFormData(prev => ({ ...prev, qrCodeUrl: "" }))}
                           className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                         >
                           <X size={20} />
                         </button>
                       )}
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                   <button 
                     type="submit" 
                     disabled={isSubmitting || !formData.name.trim()}
                     className="flex-[2] bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 rounded-3xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-indigo-500/20 active:scale-95"
                   >
                     {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={24} />}
                     <span className="text-lg">{editingMethod ? "تحديث" : "إضافة"}</span>
                   </button>
                   <button 
                     type="button" 
                     onClick={() => setIsModalOpen(false)}
                     className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold py-4 rounded-3xl transition-all active:scale-95"
                   >
                     إلغاء
                   </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
