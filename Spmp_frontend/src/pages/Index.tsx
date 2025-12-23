import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { ProjectInput } from '@/components/ProjectInput';
import { ActionButtons } from '@/components/ActionButtons';
import { ProjectInfoCard } from '@/components/ProjectInfoCard';
import { ResultsArea } from '@/components/ResultsArea';
import { ProjectProvider, useProject } from '@/context/ProjectContext';
import '@/i18n';

const ProjectManager: React.FC = () => {
  const { i18n } = useTranslation();
  const [isDark, setIsDark] = useState(false);

  const {
    projectData,
  } = useProject();

  // ضبط اتجاه الصفحة حسب اللغة
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  // تبديل الوضع الليلي
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-background">
      <Header isDark={isDark} toggleTheme={() => setIsDark(!isDark)} />

      {/* Full-width canvas for charts (WBS/Gantt/Risks) */}
      <main className="mx-auto w-full px-4 py-8 max-w-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* ✅ ProjectInput صار مربوط بالـ Context مباشرة */}
          <ProjectInput />

          {/* ✅ الأزرار لتغيير الوضع */}
          <ActionButtons />

          {/* ✅ عرض معلومات المشروع */}
          {projectData && <ProjectInfoCard />}

          {/* ✅ منطقة النتائج */}
          <div className="mt-8">
            <ResultsArea />
          </div>
        </motion.div>
      </main>
    </div>
  );
};

const Index: React.FC = () => {
  return (
    <ProjectProvider>
      <ProjectManager />
    </ProjectProvider>
  );
};

export default Index;