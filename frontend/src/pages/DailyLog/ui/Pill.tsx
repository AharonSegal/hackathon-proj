import styled from '@emotion/styled';
import { X } from 'lucide-react';
import { colors, spacing, typography, transitions } from '../theme';

interface PillProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

const Base = styled.button<{ selected?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xxs};
  padding: ${spacing.xxs} ${spacing.sm};
  border-radius: 999px;
  font-size: ${typography.size.sm};
  font-weight: ${typography.weight.medium};
  border: 1px solid ${({ selected }) => (selected ? colors.accent.primary : colors.border.default)};
  background: ${({ selected }) => (selected ? colors.accent.muted : colors.bg.elevated)};
  color: ${({ selected }) => (selected ? colors.accent.primary : colors.text.secondary)};
  cursor: pointer;
  user-select: none;
  transition: all ${transitions.normal};
  min-height: 32px;

  &:hover {
    border-color: ${({ selected }) => (selected ? colors.accent.hover : colors.border.light)};
    background: ${({ selected }) => (selected ? colors.accent.muted : colors.bg.hover)};
    color: ${({ selected }) => (selected ? colors.accent.hover : colors.text.primary)};
    transform: translateY(-1px);
  }
  &:active { transform: translateY(0); }
  svg { width: 14px; height: 14px; }
`;

export default function Pill({ label, selected, onClick, onRemove }: PillProps) {
  return (
    <Base selected={selected} onClick={onClick} type="button">
      {label}
      {onRemove && (
        <X onClick={(e) => { e.stopPropagation(); onRemove(); }} />
      )}
    </Base>
  );
}
