import type { ReactNode } from 'react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { colors, spacing, shadows, typography, transitions } from '../theme';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${spacing.md};
`;

const Box = styled(motion.div)<{ maxWidth?: string }>`
  background: ${colors.bg.tertiary};
  border: 1px solid ${colors.border.default};
  border-radius: 16px;
  box-shadow: ${shadows.xl};
  max-width: ${({ maxWidth }) => maxWidth ?? '480px'};
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacing.lg};
  padding-bottom: ${spacing.md};
  border-bottom: 1px solid ${colors.border.default};
`;

const Title = styled.h2`
  font-size: ${typography.size.xl};
  font-weight: ${typography.weight.semibold};
  color: ${colors.text.primary};
`;

const CloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: ${colors.text.tertiary};
  cursor: pointer;
  border-radius: 8px;
  transition: all ${transitions.fast};
  &:hover { background: ${colors.bg.hover}; color: ${colors.text.primary}; }
  svg { width: 18px; height: 18px; }
`;

const Body = styled.div`
  padding: ${spacing.lg};
`;

export const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${spacing.sm};
  padding: ${spacing.md} ${spacing.lg};
  border-top: 1px solid ${colors.border.default};
`;

export default function Modal({ open, onClose, title, children, footer, maxWidth }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <Box
            maxWidth={maxWidth}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Header>
              <Title>{title}</Title>
              <CloseBtn onClick={onClose}><X /></CloseBtn>
            </Header>
            <Body>{children}</Body>
            {footer && <ModalFooter>{footer}</ModalFooter>}
          </Box>
        </Overlay>
      )}
    </AnimatePresence>
  );
}
