import styled from '@emotion/styled';
import { colors, spacing, typography, transitions } from '../theme';

interface ToggleOption {
  value: string;
  label: string;
}

interface ToggleProps {
  options: ToggleOption[];
  value: string;
  onChange: (val: string) => void;
}

const Wrapper = styled.div`
  display: inline-flex;
  background: ${colors.bg.secondary};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  overflow: hidden;
`;

const Option = styled.button<{ active: boolean }>`
  padding: ${spacing.xs} ${spacing.md};
  font-size: ${typography.size.md};
  font-weight: ${typography.weight.medium};
  border: none;
  cursor: pointer;
  transition: all ${transitions.normal};
  background: ${({ active }) => (active ? colors.accent.primary : 'transparent')};
  color: ${({ active }) => (active ? '#fff' : colors.text.secondary)};

  &:hover:not(:disabled) {
    background: ${({ active }) => (active ? colors.accent.hover : colors.bg.hover)};
    color: ${({ active }) => (active ? '#fff' : colors.text.primary)};
  }
  &:active:not(:disabled) { transform: scale(0.98); }
  & + & { border-left: 1px solid ${colors.border.default}; }
`;

export default function Toggle({ options, value, onChange }: ToggleProps) {
  return (
    <Wrapper>
      {options.map((opt) => (
        <Option key={opt.value} active={value === opt.value} onClick={() => onChange(opt.value)} type="button">
          {opt.label}
        </Option>
      ))}
    </Wrapper>
  );
}
