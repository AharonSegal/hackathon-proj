import styled from '@emotion/styled';
import { X } from 'lucide-react';
import { colors, spacing, typography, transitions } from '../theme';

interface ChipProps {
  label: string;
  onRemove?: () => void;
}

const Wrapper = styled.span<{ removable?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xxs};
  padding: 2px ${spacing.xs};
  padding-right: ${({ removable }) => (removable ? '4px' : spacing.xs)};
  border-radius: 6px;
  font-size: ${typography.size.xs};
  font-weight: ${typography.weight.medium};
  background: ${colors.accent.muted};
  color: ${colors.accent.primary};
  transition: all ${transitions.fast};
`;

const RemoveBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: ${colors.accent.primary};
  cursor: pointer;
  border-radius: 50%;
  padding: 0;
  transition: all ${transitions.fast};
  &:hover { background: ${colors.accent.primary}; color: #fff; }
  svg { width: 12px; height: 12px; }
`;

export default function Chip({ label, onRemove }: ChipProps) {
  return (
    <Wrapper removable={!!onRemove}>
      {label}
      {onRemove && (
        <RemoveBtn onClick={onRemove} type="button" aria-label={`Remove ${label}`}>
          <X />
        </RemoveBtn>
      )}
    </Wrapper>
  );
}
