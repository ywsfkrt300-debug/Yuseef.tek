import React, { useState, useEffect } from "react";
import { Save, Globe, MessageSquare, Facebook, Twitter, Instagram, Github, Youtube, Share2, AlertCircle, Loader2, Link as LinkIcon, Plus, Trash2, Check, FileText } from "lucide-react";
import { motion } from "motion/react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { toast } from "react-hot-toast";

interface SocialLink {
  platform: string;
  url: string;
}

export function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [appName, setAppName] = useState("باي مينتس");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceReason, setMaintenanceReason] = useState("");
  const [suspendServices, setSuspendServices] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [terms, setTerms] = useState("");
  const [privacy, setPrivacy] = useState("");

  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const sDoc = await getDoc(doc(db, "settings", "global"));
        if (sDoc.exists()) {
          const data = sDoc.data();
          setAppName(data.appName || "باي مينتس");
          setMaintenanceMode(data.maintenanceMode || false);
          setMaintenanceReason(data.maintenanceReason || "");
          setSuspendServices(data.suspendServices || false);
          setSuspendReason(data.suspendReason || "");
          setSocialLinks(data.socialLinks || []);
          setTerms(data.terms || "");
          setPrivacy(data.privacy || "");
          setLogoUrl(data.logoUrl || "");
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await setDoc(doc(db, "settings", "global"), {
        appName,
        maintenanceMode,
        maintenanceReason,
        suspendServices,
        suspendReason,
        socialLinks,
        terms,
        privacy,
        logoUrl,
        updatedAt: serverTimestamp()
      });
      toast.success("تم حفظ الإعدادات بنجاح");
      setMessage("تم حفظ الإعدادات بنجاح");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: "facebook", url: "" }]);
  };

  const updateSocialLink = (index: number, field: keyof SocialLink, value: string) => {
    const newLinks = [...socialLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setSocialLinks(newLinks);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "facebook": return <Facebook size={18} />;
      case "twitter": return <Twitter size={18} />;
      case "instagram": return <Instagram size={18} />;
      case "github": return <Github size={18} />;
      case "youtube": return <Youtube size={18} />;
      case "whatsapp": return <MessageSquare size={18} />;
      case "telegram": return <Share2 size={18} />;
      default: return <Globe size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">إعدادات النظام</h1>
          <p className="text-slate-500 dark:text-slate-400">تحكم ببيانات الموقع، روابط التواصل، والسياسات العامة.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
      </div>

      {message && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-3 border border-emerald-100 dark:border-emerald-500/20">
          <Check size={20} />
          <span className="font-bold">{message}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
        {/* General Settings */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2 flex-row-reverse">
            <Globe className="text-indigo-500" size={20} />
            الإعدادات العامة
          </h3>
          
          <div className="space-y-4">
            <div>
               <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">شعار الموقع (Logo)</label>
               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center overflow-hidden">
                     {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <Plus size={20} className="text-slate-400" />}
                  </div>
                  <label className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer hover:bg-slate-50 transition-colors">
                     رفع شعار جديد
                     <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  {logoUrl && (
                    <button onClick={() => setLogoUrl("")} className="text-red-500 text-xs font-bold">حذف</button>
                  )}
               </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اسم التطبيق</label>
              <input value={appName} onChange={e => setAppName(e.target.value)} type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
            </div>
            
            <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <AlertCircle className="text-amber-500" size={20} />
                    <div>
                      <p className="font-bold text-sm">وضع الصيانة أو إيقاف الخدمات</p>
                      <p className="text-xs text-slate-500">إغلاق الموقع مؤقتاً للمستخدمين (مثلاً: لا يوجد رصيد كاش حالياً)</p>
                    </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={maintenanceMode} onChange={e => setMaintenanceMode(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:-translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                 </label>
               </div>
               
               {maintenanceMode && (
                 <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">سبب الإيقاف الكلي (يظهر للمستخدمين)</label>
                   <input 
                     value={maintenanceReason} 
                     onChange={e => setMaintenanceReason(e.target.value)} 
                     type="text" 
                     placeholder="مثال: نعتذر، الموقع في حالة صيانة." 
                     className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" 
                   />
                 </div>
               )}
            </div>
            
            <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <AlertCircle className="text-red-500" size={20} />
                    <div>
                      <p className="font-bold text-sm">إيقاف طلب الخدمات</p>
                      <p className="text-xs text-slate-500">منع المستخدمين من طلب خدمات جديدة (مثلاً: لا يوجد رصيد كاش حالياً)</p>
                    </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={suspendServices} onChange={e => setSuspendServices(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:-translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-500"></div>
                 </label>
               </div>
               
               {suspendServices && (
                 <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">سبب الإيقاف (يظهر في صفحة الخدمات)</label>
                   <input 
                     value={suspendReason} 
                     onChange={e => setSuspendReason(e.target.value)} 
                     type="text" 
                     placeholder="مثال: نعتذر، طلب الخدمات متوقف مؤقتاً لعدم توفر رصيد كاش." 
                     className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" 
                   />
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-row-reverse">
            <h3 className="text-lg font-bold flex items-center gap-2 flex-row-reverse">
              <Share2 className="text-indigo-500" size={20} />
              روابط التواصل
            </h3>
            <button onClick={addSocialLink} className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Plus size={14} /> إضافة
            </button>
          </div>
          
          <div className="space-y-3">
            {socialLinks.map((link, i) => (
              <div key={i} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <button onClick={() => removeSocialLink(i)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                  <Trash2 size={16} />
                </button>
                <input 
                  value={link.url} 
                  onChange={e => updateSocialLink(i, 'url', e.target.value)} 
                  type="url" 
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-en" 
                  placeholder="https://..." 
                />
                <select 
                  value={link.platform} 
                  onChange={e => updateSocialLink(i, 'platform', e.target.value)} 
                  className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 text-xs"
                >
                  <option value="facebook">فيس بوك</option>
                  <option value="whatsapp">واتساب</option>
                  <option value="telegram">تيليجرام</option>
                  <option value="instagram">انستجرام</option>
                  <option value="twitter">تويتر</option>
                  <option value="youtube">يوتيوب</option>
                  <option value="other">أخرى</option>
                </select>
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-indigo-500">
                  {getPlatformIcon(link.platform)}
                </div>
              </div>
            ))}
            {socialLinks.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-4">لا توجد روابط تواصل مضافة</p>
            )}
          </div>
        </div>
      </div>

      {/* Policies */}
      <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 text-right">
        <h3 className="text-lg font-bold flex items-center gap-2 flex-row-reverse border-b border-slate-100 dark:border-slate-700 pb-4">
          <FileText className="text-indigo-500" size={20} />
          السياسات والبنود
        </h3>

        <div className="grid grid-cols-1 gap-8">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">سياسة الخصوصية</label>
            <textarea 
              value={privacy} 
              onChange={e => setPrivacy(e.target.value)} 
              rows={6}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-sm leading-relaxed" 
              placeholder="اكتب سياسة الخصوصية هنا..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">الشروط والأحكام</label>
            <textarea 
              value={terms} 
              onChange={e => setTerms(e.target.value)} 
              rows={6}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-sm leading-relaxed" 
              placeholder="اكتب الشروط والأحكام هنا..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
