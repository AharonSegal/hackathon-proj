import styled from '@emotion/styled';
import { colors, spacing, typography, transitions } from '../theme';

const Select = styled.select`
  width: 100%;
  height: 40px;
  padding: ${spacing.xs} ${spacing.sm};
  padding-right: ${spacing.xl};
  background: ${colors.bg.secondary};
  border: 1px solid ${colors.border.default};
  border-radius: 8px;
  color: ${colors.text.primary};
  font-size: ${typography.size.md};
  cursor: pointer;
  transition: all ${transitions.normal};
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right ${spacing.sm} center;

  &:hover:not(:disabled) { border-color: ${colors.border.light}; background-color: ${colors.bg.tertiary}; }
  &:focus { outline: none; border-color: ${colors.accent.primary}; box-shadow: 0 0 0 3px ${colors.accent.muted}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  option { background: ${colors.bg.secondary}; color: ${colors.text.primary}; }
`;

export default Select;
