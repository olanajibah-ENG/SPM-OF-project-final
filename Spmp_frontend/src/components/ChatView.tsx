import { useTranslation } from 'react-i18next';
import { User, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProject } from '@/context/ProjectContext';
import { cn } from '@/lib/utils';

export const ChatView: React.FC = () => {
  const { t } = useTranslation();
  const { chatMessages } = useProject();

  if (chatMessages.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {chatMessages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'flex gap-3 p-4 rounded-2xl',
              message.role === 'user'
                ? 'bg-primary/10 ms-8'
                : 'bg-muted me-8'
            )}
          >
            <div
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                message.role === 'user' ? 'bg-primary' : 'bg-secondary'
              )}
            >
              {message.role === 'user' ? (
                <User className="h-4 w-4 text-primary-foreground" />
              ) : (
                <Bot className="h-4 w-4 text-secondary-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
