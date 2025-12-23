import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { useProject } from '@/context/ProjectContext';
import { ChatVariant } from '@/types/project';

export const ProjectInput: React.FC = () => {
  const { t } = useTranslation();
  const {
    project_description,
    setProjectDescription,
    isLoading,
    activeTab,
    chatMode,
    setChatMode,
    sendChat,
    generateAll,
  } = useProject();

  const [localDescription, setLocalDescription] = useState(project_description);

  // ✅ مزامنة النص المحلي مع الـ Context إذا تغير
  useEffect(() => {
    setLocalDescription(project_description);
  }, [project_description]);

  const currentMode: ChatVariant = chatMode || 'normal';

  const handleSubmit = () => {
    if (localDescription.trim() && !isLoading) {
      // خزّن النص في الـ Context
      setProjectDescription(localDescription);
      // مرر النص مباشرة حسب التبويب
      if (activeTab === 'chat') {
        sendChat(localDescription);
      } else {
        generateAll(localDescription);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="relative"
    >
      <div className="relative rounded-2xl border border-border bg-card p-1 shadow-lg">
        <Textarea
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeTab === 'chat' ? t('chat.placeholder') : t('input.placeholder')
          }
          className="min-h-[120px] resize-none border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 pr-14"
          disabled={isLoading}
        />

        {activeTab === 'chat' && (
          <div className="absolute bottom-3 start-3 flex items-center gap-2">
            <span className="text-sm font-medium">{t('chat.modeLabel')}:</span>
            <select
              value={currentMode}
              onChange={(e) => setChatMode(e.target.value as ChatVariant)}
              disabled={isLoading}
              className="border rounded-xl px-3 py-1.5 text-sm bg-background shadow-sm"
            >
              <option value="child">{t('chat.modes.child')}</option>
              <option value="normal">{t('chat.modes.normal')}</option>
              <option value="detailed">{t('chat.modes.detailed')}</option>
            </select>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!localDescription.trim() || isLoading}
          size="icon"
          className="absolute bottom-3 end-3 rounded-xl h-10 w-10"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </motion.div>
  );
};