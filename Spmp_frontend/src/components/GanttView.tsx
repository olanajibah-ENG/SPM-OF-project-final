import React, { useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { AlertCircle } from 'lucide-react';

import Highcharts from 'highcharts/highcharts-gantt';
import HighchartsReact from 'highcharts-react-official';
import type { Options as HighchartsOptions } from 'highcharts';

import { GanttTask } from '@/types/project';

function toTs(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? ts : null;
  }
  return null;
}

export const GanttView: React.FC = () => {
  const { projectData } = useProject();

  const tasks: GanttTask[] = useMemo(() => {
    const gantt = projectData?.gantt as any;
    if (!gantt) return [];

    // Backend shape: { gantt_tasks: [...] }
    if (Array.isArray(gantt?.gantt_tasks)) return gantt.gantt_tasks;

    // Fallbacks
    if (Array.isArray(gantt?.tasks)) return gantt.tasks;

    // Sometimes models return array directly
    if (Array.isArray(gantt)) return gantt;

    return [];
  }, [projectData]);

  const options: HighchartsOptions | null = useMemo(() => {
    if (!tasks.length) return null;

    const seriesData = tasks
      .map((t, idx) => {
        const start = toTs((t as any).start_date ?? (t as any).start);
        const end = toTs((t as any).end_date ?? (t as any).end);
        if (!start || !end) return null;

        // Backend uses `dependencies: []` (array of ids)
        const deps = (((t as any).dependencies || (t as any).depends_on) ?? []) as (string | number)[];
        return {
          id: String(t.id ?? idx),
          name: t.name,
          start,
          end,
          dependency: deps.length ? deps.map(String) : undefined,
        };
      })
      .filter(Boolean) as any[];

    return {
      chart: {
        height: 640,
        backgroundColor: 'transparent',
        spacing: [10, 10, 10, 10],
      },
      title: { text: '' },
      credits: { enabled: false },
      navigator: { enabled: true },
      rangeSelector: { enabled: true },
      scrollbar: { enabled: true },
      accessibility: { enabled: false },
      xAxis: {
        currentDateIndicator: true,
      },
      yAxis: {
        uniqueNames: true,
        grid: {
          borderColor: 'rgba(0,0,0,0.08)',
        },
      },
      tooltip: {
        pointFormat:
          '<b>{point.name}</b><br/>' +
          'Start: {point.start:%e %b %Y}<br/>' +
          'End: {point.end:%e %b %Y}',
      },
      series: [
        {
          type: 'gantt',
          name: 'Plan',
          data: seriesData,
          colorByPoint: true,
          borderRadius: 6,
          dataLabels: {
            enabled: true,
            format: '{point.name}',
            style: {
              textOutline: 'none',
            },
          },
        },
      ],
    };
  }, [tasks]);

  if (!projectData?.gantt || !tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground gap-3">
        <AlertCircle className="h-10 w-10 opacity-30" />
        <p>لا توجد بيانات Gantt بعد.</p>
        <p className="text-sm">اكتب وصف المشروع ثم اختر “Generate All”.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border">
      <div className="w-full">
        <HighchartsReact
          highcharts={Highcharts}
          constructorType={'ganttChart'}
          options={options as any}
        />
      </div>
    </div>
  );
};
