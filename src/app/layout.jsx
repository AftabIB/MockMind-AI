import './globals.css';

export const metadata = {
  title: 'MockMind AI - Adaptive Tech Tests',
  description: 'AI-powered adaptive mock tests for any tech stack or language',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ background: '#09090f' }}>
      <body className="min-h-screen" style={{ background: '#09090f' }}>{children}</body>
    </html>
  );
}
