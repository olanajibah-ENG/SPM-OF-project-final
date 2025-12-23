import { useTranslation } from 'react-i18next';
import { FolderOpen, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useProject } from '@/context/ProjectContext';

export const ProjectInfoCard: React.FC = () => {
  const { t } = useTranslation();
  const { projectData, activeTab, isLoading } = useProject();

  // ⛔ لا يظهر:
  // - إذا ما في بيانات
  // - إذا كنا في Chat
  // - أثناء التحميل
  if (!projectData || activeTab !== 'generateAll' || isLoading) {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-full"
    >
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Project Name */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('project.name')}
                </p>
                <h3 className="text-lg font-semibold text-foreground">
                  {projectData.project_name}
                </h3>
              </div>
            </div>

            {/* Methodology */}
            {projectData.methodology && (
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary" className="rounded-full">
                  {projectData.methodology}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
