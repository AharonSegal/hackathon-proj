import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, XCircle, X } from 'lucide-react';
import { colors, spacing, typography, shadows } from '../theme';
import type { LucideIcon } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
}

interface ToastProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

const Container = styled.div`
  position: fixed;
  top: ${spacing.lg};
  right: ${spacing.lg};
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs};

  @media (max-width: 640px) {
    top: auto;
    bottom: 80px;
    right: ${spacing.md};
    left: ${spacing.md};
  }
`;

const config: Record<string, { bg: string; bd: string; icon: LucideIcon; color: string }> = {
  success: { bg: colors.success.muted, bd: colors.success.primary, icon: CheckCircle2, color: colors.success.text },
  error:   { bg: colors.danger.muted,  bd: colors.danger.primary,  icon: XCircle,      color: colors.danger.text },
  warning: { bg: colors.warning.muted, bd: colors.warning.primary, icon: AlertCircle,  color: colors.warning.text },
};

const Item = styled(motion.div)<{ variant: string }>`
  display: flex;
  align-items: center;
  gap: ${spacing.sm};
  padding: ${spacing.sm} ${spacing.md};
  background: ${({ variant }) => config[variant].bg};
  border: 1px solid ${({ variant }) => config[variant].bd};
  border-radius: 10px;
  box-shadow: ${shadows.lg};
  min-width: 280px;
  max-width: 420px;
`;

const Msg = styled.span`
  flex: 1;
  font-size: ${typography.size.sm};
  color: ${colors.text.primary};
`;

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: ${colors.text.tertiary};
  cursor: pointer;
  border-radius: 4px;
  padding: 0;
  flex-shrink: 0;
  &:hover { color: ${colors.text.primary}; background: rgba(255,255,255,0.05); }
  svg { width: 14px; height: 14px; }
`;

export default function Toast({ toasts, removeToast }: ToastProps) {
  return (
    <Container>
      <AnimatePresence>
        {toasts.map((t) => {
          const c = config[t.type];
          const Icon = c.icon;
          return (
            <Item
              key={t.id}
              variant={t.type}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Icon size={18} color={c.color} style={{ flexShrink: 0 }} />
              <Msg>{t.message}</Msg>
              <CloseBtn onClick={() => removeToast(t.id)}><X /></CloseBtn>
            </Item>
          );
        })}
      </AnimatePresence>
    </Container>
  );
}
