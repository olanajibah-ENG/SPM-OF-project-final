import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';

import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

function chipVariant(value: unknown): { label: string; color: 'default' | 'success' | 'warning' | 'error' } {
  const s = String(value ?? '').toLowerCase();
  if (s.includes('high') || s.includes('عالي')) return { label: String(value), color: 'error' };
  if (s.includes('medium') || s.includes('متوسط')) return { label: String(value), color: 'warning' };
  if (s.includes('low') || s.includes('منخفض')) return { label: String(value), color: 'success' };
  return { label: String(value || '-'), color: 'default' };
}

export const RiskView: React.FC = () => {
  const { t } = useTranslation();
  const { projectData } = useProject();

  const risks = projectData?.risks ?? [];

  if (!risks.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground gap-3">
        <AlertCircle className="h-10 w-10 opacity-30" />
        <p>لا توجد بيانات مخاطر بعد.</p>
        <p className="text-sm">اكتب وصف المشروع ثم اختر “Generate All”.</p>
      </div>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>{t('risk.table.name')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('risk.table.category')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">{t('risk.table.probability')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">{t('risk.table.impact')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('risk.table.mitigation')}</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {risks.map((r) => {
              const impact = chipVariant(r.impact);
              return (
                <TableRow key={String(r.id)} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {r.title ?? '-'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={r.category ?? '-'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={String(r.probability ?? '-')} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={impact.label} size="small" color={impact.color} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
                      {r.mitigation ?? '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
