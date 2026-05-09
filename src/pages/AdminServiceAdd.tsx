import { useState } from "react";
import React from "react";
import { Check, ChevronLeft, GripVertical, Image, Plus, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { collection, doc, setDoc, serverTimestamp, onSnapshot, query } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

export function AdminServiceAdd() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState("");
  const [company, setCompany] = useState("سيريا تيل");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [priceType, setPriceType] = useState<"fixed" | "dynamic">("fixed");
  const [price, setPrice] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [iconType, setIconType] = useState("wifi");
  const [iconColor, setIconColor] = useState("indigo");
  const [imageFile, setImageFile] = useState<File | null>(null);

  React.useEffect(() => {
    onSnapshot(collection(db, "categories"), (snap) => {
      const cats: any[] = [];
      snap.forEach(d => cats.push({ id: d.id, ...d.data() }));
      setCategories(cats);
    });
  }, []);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
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
        // ضغط بجودة 0.6 لتقليل الحجم بشكل كبير لصور الخدمات
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setImageUrl(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImageUrl("");
  };
  
  const [fields, setFields] = useState<{name: string, label: string, type: 'text' | 'password' | 'number', required: boolean}[]>([
    { name: "account_number", label: "رقم الاشتراك", type: "text", required: true }
  ]);

  const addField = () => {
    setFields([...fields, { name: "", label: "حقل جديد", type: "text", required: true }]);
  };

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (!name || !company || !categoryId) {
        toast.error("يرجى ملء جميع الحقول الأساسية وتحديد التصنيف");
        setStep(1);
        setLoading(false);
        return;
      }

      const colorMap: Record<string, { bg: string, text: string }> = {
        indigo: { bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-500" },
        blue: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-500" },
        red: { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-500" },
        emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-500" },
        yellow: { bg: "bg-yellow-50 dark:bg-yellow-500/10", text: "text-yellow-500" },
        purple: { bg: "bg-purple-50 dark:bg-purple-500/10", text: "text-purple-500" },
      };

      const theme = colorMap[iconColor] || colorMap.indigo;

      const serviceRef = doc(collection(db, "services"));
      await setDoc(serviceRef, {
        name,
        company,
        price: priceType === "fixed" ? Number(price) : 0,
        dynamicPrice: priceType === "dynamic",
        imageUrl,
        iconType,
        categoryId,
        iconBgClass: theme.bg,
        iconTextClass: theme.text,
        fields,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("تم إنشاء الخدمة بنجاح!");
      navigate("/admin/services");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "services");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">إضافة خدمة جديدة</h1>
        <p className="text-slate-500 dark:text-slate-400">اتبع الخطوات لإعداد خدمة وتخصيص الحقول للعملاء.</p>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-12">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 rounded-full z-0"></div>
        <div 
          className="absolute top-1/2 right-0 h-1 bg-indigo-500 -translate-y-1/2 rounded-full z-0 transition-all duration-300"
          style={{ width: `${(step - 1) * 50}%` }}
        ></div>
        
        <div className="relative z-10 flex justify-between">
          {[1, 2, 3].map((num) => (
            <div key={num} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step > num 
                  ? "bg-indigo-500 text-white" 
                  : step === num 
                    ? "bg-indigo-500 text-white ring-4 ring-indigo-500/20" 
                    : "bg-white dark:bg-slate-800 text-slate-400 border-2 border-slate-200 dark:border-slate-700"
              }`}>
                {step > num ? <Check size={20} /> : num}
              </div>
              <span className={`text-sm font-bold ${step >= num ? "text-slate-800 dark:text-white" : "text-slate-400"}`}>
                {num === 1 ? "المعلومات الأساسية" : num === 2 ? "تخصيص الحقول" : "المعاينة والحفظ"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Wizard Content */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-700 shadow-sm min-h-[400px]">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اسم الشركة</label>
              <input value={company} onChange={e => setCompany(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" placeholder="مثال: سيريا تيل" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اسم الخدمة</label>
              <input value={name} onChange={e => setName(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" placeholder="مثال: باقة إنترنت 50GB" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">نوع السعر</label>
                <select value={priceType} onChange={(e: any) => setPriceType(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500">
                  <option value="fixed">ثابت</option>
                  <option value="dynamic">متغير (حسب الفاتورة)</option>
                </select>
              </div>
              {priceType === "fixed" && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">السعر (ل.س)</label>
                  <input value={price} onChange={e => setPrice(e.target.value)} type="number" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-en" placeholder="25000" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 text-right">صورة الخدمة (رفع ملف)</label>
              <div className="flex flex-col gap-4">
                {!imageUrl ? (
                  <label className="w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <Image size={32} className="text-slate-400" />
                    <span className="text-xs text-slate-500">انقر لرفع صورة الخدمة (أقل من 200KB)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                ) : (
                  <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={removeImage}
                      className="absolute top-2 left-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">نوع الأيقونة</label>
                <select value={iconType} onChange={(e: any) => setIconType(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500">
                  <option value="wifi">إنترنت (Wifi)</option>
                  <option value="phone">هاتف (Phone)</option>
                  <option value="zap">طاقة (Zap)</option>
                  <option value="droplet">مياه (Droplet)</option>
                  <option value="check">عام (Check)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">لون الأيقونة</label>
                <select value={iconColor} onChange={(e: any) => setIconColor(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500">
                  <option value="indigo">نيلي (Indigo)</option>
                  <option value="blue">أزرق (Blue)</option>
                  <option value="red">أحمر (Red)</option>
                  <option value="emerald">أخضر (Emerald)</option>
                  <option value="yellow">أصفر (Yellow)</option>
                  <option value="purple">بنفسجي (Purple)</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold">الحقول المطلوبة للخدمة</h3>
               <button onClick={addField} className="text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-100 transition-colors">
                 <Plus size={18} />
                 إضافة حقل جديد
               </button>
            </div>
            
            <div className="space-y-4">
              {fields.map((field, index) => (
               <div key={index} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                   <div>
                     <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">اسم الحقل البرمجي</label>
                     <input value={field.name} onChange={e => updateField(index, 'name', e.target.value)} type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="account_num" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">عنوان الحقل بالعربي</label>
                     <input value={field.label} onChange={e => updateField(index, 'label', e.target.value)} type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="رقم الحساب" />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">نوع الحقل</label>
                     <select value={field.type} onChange={e => updateField(index, 'type', e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm">
                       <option value="text">نص</option>
                       <option value="number">رقم</option>
                       <option value="password">مخفي (كلمة مرور)</option>
                     </select>
                   </div>
                   <div className="flex items-center gap-3 justify-between pb-1">
                     <div className="flex items-center gap-2">
                       <input type="checkbox" checked={field.required} onChange={e => updateField(index, 'required', e.target.checked)} className="rounded text-indigo-500 w-4 h-4" />
                       <span className="text-sm font-medium">مطلوب</span>
                     </div>
                     <button onClick={() => removeField(index)} className="text-red-500 hover:text-red-600 p-2"><Trash2 size={18} /></button>
                   </div>
                 </div>
               </div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
               <h3 className="text-lg font-bold mb-4">معاينة الخدمة</h3>
               <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700">
                  <h4 className="text-xl font-bold mb-6 text-center">{company} - {name}</h4>
                  <div className="space-y-4 mb-6">
                    {fields.map((f, i) => (
                      <div key={i}>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          {f.label} {f.required && <span className="text-red-500">*</span>}
                        </label>
                        <input type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'} disabled className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 opacity-70" placeholder={`أدخل ${f.label}`} />
                      </div>
                    ))}
                  </div>
                  <button disabled className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl opacity-50 cursor-not-allowed text-center">
                    اطلب الآن {priceType === 'fixed' ? `(${Number(price).toLocaleString()} ل.س)` : '(حسب الفاتورة)'}
                  </button>
               </div>
            </div>
            <div className="w-full lg:w-64">
               <h3 className="text-lg font-bold mb-4">ملخص</h3>
               <ul className="space-y-4 text-sm">
                 <li className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                   <span className="text-slate-500">الشركة</span>
                   <span className="font-bold">{company}</span>
                 </li>
                 <li className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                   <span className="text-slate-500">عدد الحقول</span>
                   <span className="font-bold">{fields.length}</span>
                 </li>
                 <li className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                   <span className="text-slate-500">السعر</span>
                   <span className="font-bold font-en">{priceType === 'fixed' ? `${Number(price).toLocaleString()} SP` : "Variable"}</span>
                 </li>
               </ul>
            </div>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <button 
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1 || loading}
          className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 ${step === 1 ? "text-slate-400 bg-slate-100 dark:bg-slate-700 cursor-not-allowed" : "text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-white dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"}`}
        >
           السابق
        </button>
        
        {step < 3 ? (
          <button 
            onClick={() => setStep(Math.min(3, step + 1))}
            disabled={!name || !company || (priceType === 'fixed' && !price)}
            className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            التالي
            <ChevronLeft size={18} />
          </button>
        ) : (
          <button onClick={handleSave} disabled={loading} className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50">
            {loading ? "جاري الحفظ..." : "حفظ الخدمة"}
            {!loading && <Check size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

