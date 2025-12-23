import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Network, Calendar, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { WBSView } from './WBSView';
import { GanttView } from './GanttView';
import { RiskView } from './RiskView';

export const AllViewsTabs: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('wbs');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="wbs" className="gap-2">
          <Network className="h-4 w-4" />
          <span className="hidden sm:inline">{t('tabs.wbs')}</span>
        </TabsTrigger>
        <TabsTrigger value="gantt" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">{t('tabs.gantt')}</span>
        </TabsTrigger>
        <TabsTrigger value="risks" className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="hidden sm:inline">{t('tabs.risks')}</span>
        </TabsTrigger>
      </TabsList>

      <AnimatePresence mode="wait">
        {activeTab === 'wbs' && (
          <TabsContent value="wbs" className="mt-0">
            <motion.div
              key="wbs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <WBSView />
            </motion.div>
          </TabsContent>
        )}

        {activeTab === 'gantt' && (
          <TabsContent value="gantt" className="mt-0">
            <motion.div
              key="gantt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <GanttView />
            </motion.div>
          </TabsContent>
        )}

        {activeTab === 'risks' && (
          <TabsContent value="risks" className="mt-0">
            <motion.div
              key="risks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <RiskView />
            </motion.div>
          </TabsContent>
        )}
      </AnimatePresence>
    </Tabs>
  );
};