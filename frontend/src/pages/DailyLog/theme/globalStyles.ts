import { css } from '@emotion/react';
import colors from './colors';
import typography from './typography';

const globalStyles = css`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: ${typography.fontFamily};
    background-color: ${colors.bg.primary};
    color: ${colors.text.primary};
    line-height: ${typography.lineHeight.normal};
    min-height: 100vh;
    overflow-x: hidden;
  }

  #root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: ${colors.scrollbar.track}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: ${colors.scrollbar.thumb}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${colors.scrollbar.thumbHover}; }
  * { scrollbar-width: thin; scrollbar-color: ${colors.scrollbar.thumb} ${colors.scrollbar.track}; }

  :focus-visible { outline: 2px solid ${colors.accent.primary}; outline-offset: 2px; }
  :focus:not(:focus-visible) { outline: none; }
  ::selection { background: ${colors.accent.muted}; color: ${colors.text.primary}; }

  a { color: ${colors.text.link}; text-decoration: none; }
  input, textarea, select, button { font-family: inherit; }
`;

export default globalStyles;
