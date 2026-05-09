import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { motion } from "motion/react";
import { Shield, Loader2 } from "lucide-react";

export function Privacy() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const sDoc = await getDoc(doc(db, "settings", "global"));
        if (sDoc.exists()) {
          setContent(sDoc.data().privacy || "سياسة الخصوصية غير متوفرة حالياً.");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-32 pb-12 px-4 sm:px-6 lg:px-8 text-right">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-[32px] p-8 md:p-12 shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <div className="flex items-center gap-4 flex-row-reverse mb-8">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
              <Shield size={28} />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">سياسة الخصوصية</h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
          ) : (
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-300">
                {content}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
