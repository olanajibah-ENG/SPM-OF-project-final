import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '@/context/ProjectContext';
import { ChatView } from './ChatView';
import { WBSView } from './WBSView';
import { GanttView } from './GanttView';
import { RiskView } from './RiskView';
import { ErrorMessage } from './ErrorMessage';
import { Loader2 } from 'lucide-react';

export const ResultsArea: React.FC = () => {
  const { activeTab, isLoading, error, message } = useProject();

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">جاري التحليل...</p>
      </motion.div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (message) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">
        {message}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`results-${activeTab}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'generateAll' && (
          <div className="space-y-10 w-full">
            <section className="w-full rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-3 text-base font-semibold">WBS</h3>
              <WBSView />
            </section>
            <section className="w-full rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-3 text-base font-semibold">Gantt Chart</h3>
              <GanttView />
            </section>
            <section className="w-full rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-3 text-base font-semibold">Risks</h3>
              <RiskView />
            </section>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};