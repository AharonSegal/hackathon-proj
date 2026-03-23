import styled from '@emotion/styled';
import { Search } from 'lucide-react';
import { colors, spacing, typography, transitions } from '../theme';

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

const Icon = styled.div`
  position: absolute;
  left: ${spacing.sm};
  top: 50%;
  transform: translateY(-50%);
  color: ${colors.text.tertiary};
  display: flex;
  pointer-events: none;
  svg { width: 16px; height: 16px; }
`;

const StyledInput = styled.input`
  width: 100%;
  height: 36px;
  padding: ${spacing.xs} ${spacing.sm};
  padding-left: 36px;
  background: ${colors.bg.secondary};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  color: ${colors.text.primary};
  font-size: ${typography.size.sm};
  transition: all ${transitions.normal};

  &::placeholder { color: ${colors.text.tertiary}; }
  &:hover:not(:focus) { border-color: ${colors.border.light}; }
  &:focus { outline: none; border-color: ${colors.accent.primary}; box-shadow: 0 0 0 3px ${colors.accent.muted}; }
`;

export default function SearchInput({ value, onChange, placeholder = 'Search...' }: SearchInputProps) {
  return (
    <Wrapper>
      <StyledInput
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <Icon><Search /></Icon>
    </Wrapper>
  );
}
