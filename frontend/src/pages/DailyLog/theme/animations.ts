import { keyframes } from '@emotion/react';

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
`;

export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

export const slideUp = keyframes`
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
`;

const transitions = {
  fast: '0.15s ease',
  normal: '0.2s ease',
  smooth: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  spring: '0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export default transitions;
