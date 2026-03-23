import type { ReactNode } from 'react';
import styled from '@emotion/styled';
import { colors, spacing, typography } from '../theme';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${spacing.xxl} ${spacing.lg};
  text-align: center;
  svg { width: 48px; height: 48px; color: ${colors.text.tertiary}; margin-bottom: ${spacing.md}; }
`;

const Title = styled.h3`
  font-size: ${typography.size.lg};
  font-weight: ${typography.weight.semibold};
  color: ${colors.text.secondary};
  margin-bottom: ${spacing.xxs};
`;

const Desc = styled.p`
  font-size: ${typography.size.sm};
  color: ${colors.text.tertiary};
  max-width: 320px;
`;

export default function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <Wrapper>
      {Icon && <Icon />}
      <Title>{title}</Title>
      {description && <Desc>{description}</Desc>}
      {children}
    </Wrapper>
  );
}
