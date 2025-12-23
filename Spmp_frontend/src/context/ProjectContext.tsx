import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { APIResponse, ChatMessage, ChatVariant, ProjectData } from '@/types/project';
import { analyzeProject, askProjectManager } from '@/services/api';

export type MainTab = 'chat' | 'generateAll';

interface ProjectContextType {
  // UI
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;

  // Input
  project_description: string;
  setProjectDescription: (text: string) => void;

  // Chat
  chatMode: ChatVariant;
  setChatMode: (mode: ChatVariant) => void;
  chatMessages: ChatMessage[];
  clearChat: () => void;
  sendChat: (question?: string) => Promise<void>;

  // Plan
  projectData: ProjectData | null;
  generateAll: (description?: string) => Promise<void>;

  // Status
  isLoading: boolean;
  error: APIResponse['error'] | null;
  message: string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<MainTab>('chat');
  const [project_description, setProjectDescription] = useState('');

  const [chatMode, setChatMode] = useState<ChatVariant>('normal');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [projectData, setProjectData] = useState<ProjectData | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<APIResponse['error'] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const clearChat = () => setChatMessages([]);

  const addChatMessage = (role: 'user' | 'assistant', content: string) => {
    setChatMessages((prev) => [
      ...prev,
      { id: uuidv4(), role, content, timestamp: new Date() },
    ]);
  };

  const sendChat = async (question?: string) => {
    const q = (question ?? project_description).trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);
    setMessage(null);

    addChatMessage('user', q);

    try {
      const res = await askProjectManager(q, chatMode);
      if (res.networkError) {
        setMessage(res.message ?? 'API unavailable');
        addChatMessage('assistant', '❌ تعذر الاتصال بالسيرفر');
        return;
      }

      if (res.error) {
        setError(res.error);
        addChatMessage('assistant', res.message ?? 'حدث خطأ');
        return;
      }

      addChatMessage('assistant', res.answer ?? '');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAll = async (description?: string) => {
    const text = (description ?? project_description).trim();
    if (!text) return;

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await analyzeProject(text);

      if (res.networkError) {
        setMessage(res.message ?? 'API unavailable');
        return;
      }
      if (res.error) {
        setError(res.error);
        setMessage(res.message ?? null);
        return;
      }

      setProjectData(res.data ?? null);
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo<ProjectContextType>(
    () => ({
      activeTab,
      setActiveTab,
      project_description,
      setProjectDescription,
      chatMode,
      setChatMode,
      chatMessages,
      clearChat,
      sendChat,
      projectData,
      generateAll,
      isLoading,
      error,
      message,
    }),
    [
      activeTab,
      project_description,
      chatMode,
      chatMessages,
      projectData,
      isLoading,
      error,
      message,
    ]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider');
  return ctx;
};
