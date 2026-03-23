import styled from '@emotion/styled';
import { colors, spacing, typography, transitions } from '../theme';

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'purple';

const styles: Record<BadgeVariant, { bg: string; fg: string; bd: string }> = {
  default: { bg: colors.bg.elevated, fg: colors.text.secondary, bd: colors.border.default },
  accent:  { bg: colors.accent.muted, fg: colors.accent.primary, bd: 'transparent' },
  success: { bg: colors.success.muted, fg: colors.success.text, bd: 'transparent' },
  warning: { bg: colors.warning.muted, fg: colors.warning.text, bd: 'transparent' },
  danger:  { bg: colors.danger.muted, fg: colors.danger.text, bd: 'transparent' },
  purple:  { bg: colors.purple.muted, fg: colors.purple.primary, bd: 'transparent' },
};

const Badge = styled.span<{ variant?: BadgeVariant }>`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xxs};
  padding: 2px ${spacing.xs};
  border-radius: 999px;
  font-size: ${typography.size.xs};
  font-weight: ${typography.weight.medium};
  line-height: 1.5;
  white-space: nowrap;
  transition: all ${transitions.fast};
  background: ${({ variant = 'default' }) => styles[variant].bg};
  color: ${({ variant = 'default' }) => styles[variant].fg};
  border: 1px solid ${({ variant = 'default' }) => styles[variant].bd};
  svg { width: 12px; height: 12px; }
`;

export default Badge;
