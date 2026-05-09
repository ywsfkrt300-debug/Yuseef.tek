import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { X, Phone, Lock, User as UserIcon, Calendar, MapPin } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const GOVERNORATES = [
  "دمشق",
  "ريف دمشق",
  "حلب",
  "حمص",
  "حماة",
  "اللاذقية",
  "طرطوس",
  "إدلب",
  "درعا",
  "السويداء",
  "القنيطرة",
  "دير الزور",
  "الرقة",
  "الحسكة"
];

export function Auth() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    birthDate: "", // Keeping these as they were previously requested
    governorate: "" // Keeping these as they were previously requested
  });

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
         navigate('/admin');
      } else {
         navigate('/user');
      }
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isLogin) {
        const identifier = formData.email || formData.phone;
        if (!identifier) throw new Error("يرجى إدخال البريد الإلكتروني أو رقم الهاتف");
        await login(identifier, formData.password);
      } else {
        if (!formData.displayName || !formData.email || !formData.phone || !formData.password) {
          throw new Error("يرجى ملء جميع الحقول المطلوبة");
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error("كلمات المرور غير متطابقة");
        }
        await register(
          formData.email,
          formData.password,
          formData.displayName,
          formData.phone,
          formData.birthDate || "",
          formData.governorate || ""
        );
      }
    } catch (err: any) {
       console.error(err);
       setErrorMsg(err.message || "حدث خطأ ما. تأكد من صحة البيانات والمحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/40 dark:to-purple-900/40 transform -skew-y-6 -z-10 origin-top-left" />

      <Link to="/" className="absolute top-6 right-6 lg:top-10 lg:right-10 flex items-center gap-2 group">
        <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all text-slate-400 group-hover:text-indigo-500">
          <X size={20} />
        </div>
        <span className="font-bold text-slate-500">إغلاق</span>
      </Link>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-slate-100 dark:border-slate-700"
      >
        <div className="text-center mb-8">
          <span className="text-4xl mb-4 block">👋</span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {isLogin ? "أدخل بياناتك للمتابعة" : "يرجى تعبئة البيانات التالية لإنشاء حساب"}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-500 dark:bg-red-500/10 p-3 rounded-xl mb-6 text-sm font-medium text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                name="displayName"
                required
                placeholder="الاسم الكامل" 
                value={formData.displayName}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400"
              />
            </div>
          )}

          <div className="relative">
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">@</span>
            <input 
              type="email" 
              name="email"
              required={!isLogin}
              placeholder="البريد الإلكتروني" 
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 font-en"
            />
          </div>

          <div className="relative">
            <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="tel" 
              name="phone"
              required={!isLogin}
              dir="ltr"
              placeholder="رقم الهاتف (09xxxxxxxx)" 
              value={formData.phone}
              onChange={handleChange}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 font-en text-right"
            />
          </div>

          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="date" 
                    name="birthDate"
                    placeholder="المواليد"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 text-sm"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <select 
                    name="governorate"
                    value={formData.governorate}
                    onChange={handleChange}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none text-sm"
                  >
                    <option value="" disabled>المحافظة</option>
                    {GOVERNORATES.map(gov => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="relative">
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="password" 
              name="password"
              required
              dir="ltr"
              placeholder="كلمة المرور" 
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 font-en text-right"
            />
          </div>

          {!isLogin && (
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="password" 
                name="confirmPassword"
                required
                dir="ltr"
                placeholder="تأكيد كلمة المرور" 
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-12 pl-4 py-3.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400 font-en text-right"
              />
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-75 disabled:grayscale flex items-center justify-center mt-6"
          >
            {loading ? "جاري المعالجة..." : (isLogin ? "تسجيل الدخول" : "إنشاء الحساب")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
            <button 
              type="button" 
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg("");
              }} 
              className="text-indigo-500 hover:text-indigo-600 font-bold mr-2"
            >
              {isLogin ? "سجل الآن" : "سجل الدخول"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
