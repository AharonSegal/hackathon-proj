import styled from '@emotion/styled';
import { colors, spacing, typography, transitions } from '../theme';

interface InputBaseProps {
  hasError?: boolean;
}

const Input = styled.input<InputBaseProps>`
  width: 100%;
  height: 40px;
  padding: ${spacing.xs} ${spacing.sm};
  background: ${colors.bg.secondary};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  color: ${colors.text.primary};
  font-size: ${typography.size.md};
  transition: all ${transitions.normal};

  &::placeholder { color: ${colors.text.tertiary}; }
  &:hover:not(:disabled):not(:focus) { border-color: ${colors.border.light}; background: ${colors.bg.tertiary}; }
  &:focus { outline: none; border-color: ${colors.accent.primary}; box-shadow: 0 0 0 3px ${colors.accent.muted}; background: ${colors.bg.secondary}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  ${({ hasError }) => hasError && `
    border-color: ${colors.danger.primary};
    &:focus { border-color: ${colors.danger.primary}; box-shadow: 0 0 0 3px ${colors.danger.muted}; }
  `}
`;

export const TextArea = styled.textarea<InputBaseProps>`
  width: 100%;
  min-height: 80px;
  padding: ${spacing.sm};
  background: ${colors.bg.secondary};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  color: ${colors.text.primary};
  font-size: ${typography.size.md};
  line-height: ${typography.lineHeight.normal};
  resize: vertical;
  transition: all ${transitions.normal};

  &::placeholder { color: ${colors.text.tertiary}; }
  &:hover:not(:disabled):not(:focus) { border-color: ${colors.border.light}; background: ${colors.bg.tertiary}; }
  &:focus { outline: none; border-color: ${colors.accent.primary}; box-shadow: 0 0 0 3px ${colors.accent.muted}; background: ${colors.bg.secondary}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const InputLabel = styled.label<{ required?: boolean }>`
  display: block;
  font-size: ${typography.size.sm};
  font-weight: ${typography.weight.medium};
  color: ${colors.text.secondary};
  margin-bottom: ${spacing.xxs};
  ${({ required }) => required && `&::after { content: ' *'; color: ${colors.danger.primary}; }`}
`;

export const InputError = styled.span`
  display: block;
  font-size: ${typography.size.xs};
  color: ${colors.danger.text};
  margin-top: ${spacing.xxs};
`;

export const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.xxs};
`;

export default Input;
