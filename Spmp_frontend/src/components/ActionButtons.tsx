import { useTranslation } from 'react-i18next';
import { MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useProject } from '@/context/ProjectContext';
import { cn } from '@/lib/utils';

export const ActionButtons: React.FC = () => {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, isLoading } = useProject();

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex flex-wrap justify-center gap-2 sm:gap-3"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        <Button
          variant={activeTab === 'chat' ? 'default' : 'outline'}
          onClick={() => setActiveTab('chat')}
          disabled={isLoading}
          className={cn(
            'gap-2 rounded-2xl px-6 py-6 transition-all duration-300',
            activeTab === 'chat' && 'shadow-lg',
            activeTab === 'chat' && 'bg-gradient-to-r from-primary to-[hsl(var(--accent))] text-primary-foreground'
          )}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="font-semibold">{t('buttons.chat')}</span>
        </Button>
      </motion.div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Button
          variant={activeTab === 'generateAll' ? 'default' : 'outline'}
          onClick={() => setActiveTab('generateAll')}
          disabled={isLoading}
          className={cn(
            'gap-2 rounded-2xl px-6 py-6 transition-all duration-300',
            activeTab === 'generateAll' && 'shadow-lg',
            activeTab === 'generateAll' && 'bg-gradient-to-r from-[hsl(var(--accent))] to-primary text-primary-foreground'
          )}
        >
          <Sparkles className="h-4 w-4" />
          <span className="font-semibold">{t('buttons.all')}</span>
        </Button>
      </motion.div>
    </motion.div>
  );
};
