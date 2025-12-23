import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useTranslation } from 'react-i18next';

import { useProject } from '@/context/ProjectContext';

// Backend-aligned shapes (based on /api/plan/full response)
interface WBSTask {
  id: string;
  name: string;
  description?: string;
  resource?: string;
  effort_days?: number;
  dependencies?: string[];
}

interface WBSPhase {
  id: string;
  name: string;
  description?: string;
  tasks: WBSTask[];
}

interface WBSData {
  project_name: string;
  methodology?: string;
  phases: WBSPhase[];
}

export const WBSView: React.FC = () => {
  const { projectData } = useProject();
  const { i18n } = useTranslation();

  const language = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en';
  const t = (en: string, ar: string) => (language === 'ar' ? ar : en);

  const getColor = (days: number) => {
    // More effort => warmer color
    if (days > 8) return 'text-red-600';
    if (days >= 4) return 'text-orange-500';
    return 'text-green-600';
  };

  const treeData: DataNode[] = useMemo(() => {
    const wbs = (projectData?.wbs as unknown as WBSData) || null;
    if (!wbs?.phases?.length) return [];

    return [
      {
        title: (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-lg">{wbs.project_name || projectData?.project_name || 'Project'}</span>
            {(wbs.methodology || projectData?.methodology) ? (
              <span className="text-sm text-muted-foreground">
                {t('Methodology:', 'المنهجية:')} {wbs.methodology || projectData?.methodology}
              </span>
            ) : null}
          </div>
        ),
        key: 'project',
        children: (wbs.phases || []).map((phase, i) => ({
          title: (
            <div className="flex flex-col">
              <span className="font-semibold">
                {(phase.id ? `${phase.id} - ` : '')}{phase.name}
              </span>
              {phase.description ? (
                <span className="text-xs text-muted-foreground">{phase.description}</span>
              ) : null}
            </div>
          ),
          key: `phase-${phase.id || i}`,
          children: (phase.tasks || []).map((task) => {
            const days = typeof task.effort_days === 'number' ? task.effort_days : 0;
            const deps = task.dependencies || [];

            return {
              title: (
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block px-2 py-1 rounded-md font-medium ${
                        days > 8
                          ? 'bg-red-100 text-red-700'
                          : days >= 4
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {task.id} - {task.name}
                    </span>
                    <span className={`text-xs ${getColor(days)}`}>
                      {days} {t('days', 'أيام')}
                    </span>
                  </div>

                  {task.description ? (
                    <div className="text-xs text-muted-foreground">{task.description}</div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 text-xs">
                    {task.resource ? (
                      <span className="px-2 py-0.5 rounded bg-muted">
                        {t('Resource:', 'المسؤول:')} {task.resource}
                      </span>
                    ) : null}

                    {deps.length ? (
                      <span className="px-2 py-0.5 rounded bg-muted">
                        {t('Depends on:', 'يعتمد على:')} {deps.join(', ')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-muted">
                        {t('No dependencies', 'بدون تبعيات')}
                      </span>
                    )}
                  </div>
                </div>
              ),
              key: `task-${phase.id}-${task.id}`,
              isLeaf: true,
            } as DataNode;
          }),
        })),
      },
    ];
  }, [projectData, language]);

  if (!projectData?.wbs || treeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground gap-3">
        <AlertCircle className="h-10 w-10 opacity-30" />
        <p>لا توجد بيانات WBS بعد.</p>
        <p className="text-sm">اكتب وصف المشروع ثم اختر “Generate All”.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Tree
        treeData={treeData}
        defaultExpandAll
        showLine
        className="w-full bg-transparent"
      />
    </div>
  );
};
