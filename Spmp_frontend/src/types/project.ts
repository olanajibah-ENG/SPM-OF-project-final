// src/types/project.ts

export interface WBSTask {
  id: string;
  name: string;
  description?: string;
  effort_days?: number;
  resource?: string;
  dependencies?: string[];
}

export interface WBSPhase {
  id: string;
  name: string;
  description?: string;
  tasks: WBSTask[];
}

export interface WBSData {
  project_name?: string;
  methodology?: string;
  phases: WBSPhase[];
}

export interface GanttTask {
  id: string | number;
  name: string;
  start_date: string;
  end_date: string;
  duration?: number;
  dependencies?: (string | number)[];
  progress?: number;
  type?: 'task' | 'milestone' | 'project';
  resource?: string;
}

export interface Risk {
  id: string | number;
  title?: string;
  description: string;
  category?: string;
  trigger?: string;
  owner?: string;
  probability?: string | number; // ✅
  impact?: string | number;      // ✅
  mitigation?: string;
}

export interface ProjectData {
  project_id?: string | number;
  project_name: string;      // ✅ مطلوب
  project_scope?: string;    // ✅ اختياري (لكننا نضيفه يدوياً)
  methodology: string;       // ✅ مطلوب
  wbs?: WBSData;             
  gantt?: { tasks: GanttTask[]; dependencies?: (string | number)[][] };
  risks: Risk[];  
  wbs_id?: string | number;           // ✅ مطلوب (حتى لو كان مصفوفة فارغة)
}

// نوع مساعد لبيانات الـ Full API الخام (قد تكون غير كاملة)
export interface RawFullProjectData {
    project_id?: string | number;
    project_name?: string;
    methodology?: string;
    wbs?: unknown; 
    gantt?: unknown;
    risks?: unknown;
}


export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface APIResponse {
  error?: 
    | 'NOT_SOFTWARE_PROJECT' 
    | 'SCOPE_TOO_SHORT' 
    | 'TEXT_TOO_GENERIC' 
    | 'PARSE_ERROR';
  networkError?: 'API_UNAVAILABLE';
  message?: string;
  answer?: string;
  data?: ProjectData; // يبقى ProjectData كاملاً لأن analyzeProject يعيده كاملاً
}

export type ViewMode = 'chat' | 'wbs' | 'gantt' | 'risk' | 'all';
export type ChatVariant = 'child' | 'normal' | 'detailed';