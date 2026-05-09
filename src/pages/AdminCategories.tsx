import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { LayoutTemplate, Plus, Trash2, Edit2, Check, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";

export function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "categories"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats: any[] = [];
      snapshot.forEach(doc => cats.push({ id: doc.id, ...doc.data() }));
      setCategories(cats);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "categories");
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await updateDoc(doc(db, "categories", editingCategory.id), {
          name,
          updatedAt: serverTimestamp()
        });
        toast.success("تم تحديث التصنيف");
      } else {
        const newDoc = doc(collection(db, "categories"));
        await setDoc(newDoc, {
          name,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("تم إضافة التصنيف");
      }
      setIsModalOpen(false);
      setEditingCategory(null);
      setName("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "categories");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التصنيف؟")) return;
    try {
      await deleteDoc(doc(db, "categories", id));
      toast.success("تم حذف التصنيف");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "categories");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">إدارة التصنيفات</h1>
          <p className="text-slate-500 dark:text-slate-400">تنظيم الخدمات في مجموعات ليسهل على المستخدم العثور عليها.</p>
        </div>
        <button 
          onClick={() => { setEditingCategory(null); setName(""); setIsModalOpen(true); }}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <Plus size={20} /> إضافة تصنيف
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
           <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={40} /></div>
        ) : categories.length === 0 ? (
           <div className="col-span-full py-20 text-center text-slate-500">لا توجد تصنيفات بعد.</div>
        ) : categories.map((cat) => (
          <motion.div 
            layout 
            key={cat.id}
            className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                 <LayoutTemplate size={24} />
              </div>
              <h3 className="font-bold">{cat.name}</h3>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => { setEditingCategory(cat); setName(cat.name); setIsModalOpen(true); }}
                className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={() => handleDelete(cat.id)}
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
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8"
            >
              <h3 className="text-xl font-bold mb-6">{editingCategory ? "تعديل تصنيف" : "إضافة تصنيف جديد"}</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                 <div>
                   <label className="block text-sm font-bold mb-2 text-slate-600 dark:text-slate-400">اسم التصنيف</label>
                   <input 
                     type="text" 
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder="مثال: خدمات الرصيد"
                     className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors"
                     autoFocus
                   />
                 </div>
                 <div className="flex gap-4 pt-2">
                   <button 
                     type="submit" 
                     disabled={isSubmitting || !name.trim()}
                     className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                     {editingCategory ? "تحديث" : "إضافة"}
                   </button>
                   <button 
                     type="button" 
                     onClick={() => setIsModalOpen(false)}
                     className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold py-3.5 rounded-2xl transition-all"
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
