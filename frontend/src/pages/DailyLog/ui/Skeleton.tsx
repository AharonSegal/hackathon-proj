import styled from '@emotion/styled';
import { colors, spacing } from '../theme';
import { shimmer } from '../theme/animations';

interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: string;
}

const SkeletonBase = styled.div<SkeletonProps>`
  background: linear-gradient(90deg, ${colors.skeleton.base} 25%, ${colors.skeleton.shine} 50%, ${colors.skeleton.base} 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  border-radius: ${({ radius }) => radius ?? '8px'};
  width: ${({ width }) => width ?? '100%'};
  height: ${({ height }) => height ?? '20px'};
`;

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase key={i} height="14px" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div style={{
      background: colors.bg.tertiary,
      border: `1px solid ${colors.border.default}`,
      borderRadius: '12px',
      padding: spacing.lg,
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.md,
    }}>
      <SkeletonBase height="24px" width="40%" />
      <SkeletonText lines={3} />
      <div style={{ display: 'flex', gap: spacing.xs }}>
        <SkeletonBase height="28px" width="60px" radius="999px" />
        <SkeletonBase height="28px" width="80px" radius="999px" />
        <SkeletonBase height="28px" width="50px" radius="999px" />
      </div>
    </div>
  );
}

export default SkeletonBase;
