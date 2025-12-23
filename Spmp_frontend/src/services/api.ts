// src/services/api.ts
// ✅ تحديث الاستيراد لـ RawFullProjectData
import { APIResponse, ChatVariant, ProjectData, WBSData, Risk, RawFullProjectData } from '@/types/project';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// ✅ 1) Chat → /api/ask/
export async function askProjectManager(question: string, mode: ChatVariant): Promise<APIResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ask/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, mode }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { message: data?.error || 'Request failed', error: data?.error };
    }

    return { answer: data?.answer ?? '' };
  } catch (error) {
    console.error('API Error (askProjectManager):', error);
    return { networkError: 'API_UNAVAILABLE', message: 'تعذر الاتصال بالسيرفر' };
  }
}

// ✅ 2. تحليل المشروع الكامل (Full) - تم الإصلاح لتلبية متطلبات ProjectData
export async function analyzeProject(project_description: string): Promise<APIResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/plan/full/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_description }),
    });

    const rawData: RawFullProjectData & { error?: APIResponse['error']; message?: string } = await response.json();

    // Backend sometimes returns {error, message} with 200 OR non-200.
    if (!response.ok || rawData?.error) {
      return { error: rawData?.error, message: rawData?.message };
    }
    
    // الحل: نقوم ببناء كائن ProjectData بشكل كامل وواضح لتجنب خطأ التعيين
    const resultData: ProjectData = {
        // الحقول المطلوبة (Required fields): نضمن وجودها مع قيم افتراضية
        project_name: rawData.project_name || "المشروع الجديد (غير مسمى)",
        methodology: rawData.methodology || "Agile", 
        risks: (rawData.risks as Risk[] || []), 

        // الحقول الاختيارية: نستخدم البيانات الخام ونحدد نوعها
        project_id: rawData.project_id,
        project_scope: project_description, 
        wbs: rawData.wbs as WBSData | undefined,
        gantt: rawData.gantt as ProjectData['gantt'] | undefined,
    };

    return { data: resultData }; // ✅ ProjectData كامل
  } catch (error) {
    console.error('API Error (analyzeProject):', error);
    return { networkError: 'API_UNAVAILABLE', message: 'تعذر الاتصال بالسيرفر' };
  }
}

// ✅ 3. WBS - استخدام تحويل النوع (Casting) إلى ProjectData (المطلوب من APIResponse)
export async function getWBS(project_id: string | number, project_scope: string): Promise<APIResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/wbs/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id, project_scope }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error, message: errorData.message };
    }

    const wbsData: WBSData = await response.json(); 
    
    // نعتمد على أن هذا الرد سيُدمج لاحقاً في Context، ونحول النوع إلى ProjectData
    return { data: { wbs: wbsData } as ProjectData }; 
  } catch (error) {
    console.error('API Error (getWBS):', error);
    return { networkError: 'API_UNAVAILABLE', message: 'تعذر الاتصال بالسيرفر' };
  }
}

// ✅ 4. Gantt - إزالة 'as any'
export async function getGantt(project_id: string | number, project_scope: string): Promise<APIResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/gantt/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id, project_scope }),
    });

    if (!response.ok) {
       const errorData = await response.json();
       return { error: errorData.error, message: errorData.message };
    }
    
    // Backend returns the gantt object directly (not wrapped)
    const gantt = await response.json();
    return { data: { gantt } as ProjectData };
  } catch (error) {
    console.error('API Error (getGantt):', error);
    return { networkError: 'API_UNAVAILABLE', message: 'تعذر الاتصال بالسيرفر' };
  }
}

// ✅ 5. Risks - إزالة 'as any'
export async function getRisks(project_id: string | number, project_scope: string): Promise<APIResponse> {
  try {
    // NOTE: Backend endpoint is /api/risk/generate/ and needs project_id + wbs_id.
    // We keep this helper for compatibility, but prefer /api/plan/full/ for "Generate All".
    const response = await fetch(`${API_BASE_URL}/api/risk/generate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id, wbs_id: project_id, project_scope }),
    });

    if (!response.ok) {
       const errorData = await response.json();
       return { error: errorData.error, message: errorData.message };
    }
    
    const data: { risks: Risk[] } = await response.json();
    return { data: { risks: data.risks } as ProjectData };
  } catch (error) {
    console.error('API Error (getRisks):', error);
    return { networkError: 'API_UNAVAILABLE', message: 'تعذر الاتصال بالسيرفر' };
  }
}