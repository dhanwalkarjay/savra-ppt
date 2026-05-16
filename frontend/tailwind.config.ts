import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0D1B2A',
        cyan: '#00BFFF',
        accent: '#FF4B6E',
        surface: '#1A2940',
        text: '#E8E8E8',
        muted: '#8899AA',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(0,191,255,0.15), 0 12px 40px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};

export default config;