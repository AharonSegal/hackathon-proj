import styled from '@emotion/styled';
import { Check } from 'lucide-react';
import { colors, spacing, typography, transitions } from '../theme';
import type { ChangeEvent } from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  disabled?: boolean;
}

const Wrapper = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${spacing.xs};
  cursor: pointer;
  user-select: none;
  padding: ${spacing.xxs} ${spacing.xs};
  border-radius: 6px;
  transition: background ${transitions.fast};
  &:hover { background: ${colors.bg.hover}; }
`;

const HiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const Box = styled.div<{ checked: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid ${({ checked }) => (checked ? colors.accent.primary : colors.border.light)};
  background: ${({ checked }) => (checked ? colors.accent.primary : 'transparent')};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${transitions.fast};
  flex-shrink: 0;

  svg {
    width: 14px;
    height: 14px;
    color: #fff;
    opacity: ${({ checked }) => (checked ? 1 : 0)};
    transform: ${({ checked }) => (checked ? 'scale(1)' : 'scale(0.5)')};
    transition: all ${transitions.fast};
  }
`;

const Label = styled.span`
  font-size: ${typography.size.md};
  color: ${colors.text.primary};
  line-height: 1;
`;

export default function Checkbox({ checked, onChange, label, disabled }: CheckboxProps) {
  return (
    <Wrapper>
      <HiddenInput type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <Box checked={checked}><Check /></Box>
      {label && <Label>{label}</Label>}
    </Wrapper>
  );
}
