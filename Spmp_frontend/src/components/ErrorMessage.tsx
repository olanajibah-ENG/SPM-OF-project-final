import { useTranslation } from 'react-i18next';
import { AlertCircle, FileX, FileQuestion, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import { APIResponse } from '@/types/project';

interface ErrorMessageProps {
  error: APIResponse['error'];
}

const errorIcons = {
  NOT_SOFTWARE_PROJECT: FileX,
  SCOPE_TOO_SHORT: FileQuestion,
  TEXT_TOO_GENERIC: HelpCircle,
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error }) => {
  const { t } = useTranslation();

  if (!error) return null;

  const Icon = errorIcons[error] || AlertCircle;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: -10 }}
    >
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
        <Icon className="h-5 w-5" />
        <AlertTitle className="font-semibold">خطأ في التحليل</AlertTitle>
        <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
      </Alert>
    </motion.div>
  );
};
