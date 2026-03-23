import styled from '@emotion/styled';
import { colors, spacing, typography, transitions, shadows } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  iconOnly?: boolean;
}

const variantMap = {
  primary:   { bg: colors.accent.primary, bgH: colors.accent.hover, bgA: colors.accent.active, fg: '#fff',                  bd: 'transparent',        glow: shadows.glow.accent },
  secondary: { bg: colors.bg.elevated,    bgH: colors.bg.hover,     bgA: colors.bg.active,     fg: colors.text.primary,      bd: colors.border.default, glow: 'none' },
  ghost:     { bg: 'transparent',         bgH: colors.bg.hover,     bgA: colors.bg.active,     fg: colors.text.secondary,    bd: 'transparent',        glow: 'none' },
  danger:    { bg: colors.danger.muted,   bgH: colors.danger.primary, bgA: colors.danger.active, fg: colors.danger.text,    bd: 'transparent',        glow: 'none' },
  success:   { bg: colors.success.primary, bgH: colors.success.hover, bgA: colors.success.primary, fg: colors.text.inverse, bd: 'transparent',        glow: shadows.glow.success },
} as const;

const sizeMap = {
  sm: { px: spacing.sm, h: '32px', fs: typography.size.sm },
  md: { px: spacing.md, h: '40px', fs: typography.size.md },
  lg: { px: spacing.lg, h: '48px', fs: typography.size.lg },
} as const;

const Button = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${spacing.xs};
  border-radius: 8px;
  font-weight: ${typography.weight.medium};
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: all ${transitions.normal};
  position: relative;
  overflow: hidden;

  padding: ${({ size = 'md' }) => `${spacing.xxs} ${sizeMap[size].px}`};
  font-size: ${({ size = 'md' }) => sizeMap[size].fs};
  height: ${({ size = 'md' }) => sizeMap[size].h};

  background: ${({ variant = 'primary' }) => variantMap[variant].bg};
  color: ${({ variant = 'primary' }) => variantMap[variant].fg};
  border: 1px solid ${({ variant = 'primary' }) => variantMap[variant].bd};

  &:hover:not(:disabled) {
    background: ${({ variant = 'primary' }) => variantMap[variant].bgH};
    transform: translateY(-1px);
    box-shadow: ${({ variant = 'primary' }) => variantMap[variant].glow};
  }

  &:active:not(:disabled) {
    background: ${({ variant = 'primary' }) => variantMap[variant].bgA};
    transform: translateY(0);
    box-shadow: none;
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }

  ${({ variant }) => variant === 'danger' && `&:hover:not(:disabled) { color: #fff; }`}
  ${({ fullWidth }) => fullWidth && `width: 100%;`}
  ${({ iconOnly }) => iconOnly && `padding: 0; width: 36px; height: 36px;`}

  svg { width: 18px; height: 18px; flex-shrink: 0; }
`;

export default Button;
