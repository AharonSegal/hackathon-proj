import styled from '@emotion/styled';
import { colors, spacing, shadows, transitions, typography } from '../theme';

interface CardProps {
  padding?: string;
  interactive?: boolean;
  highlighted?: boolean;
  variant?: 'default' | 'elevated';
}

const Card = styled.div<CardProps>`
  background: ${colors.bg.tertiary};
  border: 1px solid ${colors.border.default};
  border-radius: 12px;
  padding: ${({ padding }) => padding ?? spacing.lg};
  transition: all ${transitions.normal};

  ${({ interactive }) => interactive && `
    cursor: pointer;
    &:hover { border-color: ${colors.border.light}; box-shadow: ${shadows.md}; transform: translateY(-2px); }
    &:active { transform: translateY(0); }
  `}

  ${({ highlighted }) => highlighted && `
    border-color: ${colors.accent.primary};
    box-shadow: ${shadows.glow.accent};
  `}

  ${({ variant }) => variant === 'elevated' && `
    background: ${colors.bg.elevated};
    box-shadow: ${shadows.md};
  `}
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${spacing.md};
  padding-bottom: ${spacing.sm};
  border-bottom: 1px solid ${colors.border.default};
`;

export const CardTitle = styled.h3<{ size?: string }>`
  font-size: ${({ size }) => size ?? '1rem'};
  font-weight: ${typography.weight.semibold};
  color: ${colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
`;

export default Card;
