import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LayoutGroup } from 'motion/react';
import EverythingIsland from './components/EverythingIsland';
import ScreenEdgeLighting from './components/TheFrequency/ScreenEdgeLighting';
import AudioStudioModal from './components/TheFrequency/AudioStudioModal';
import JarvisVoiceHUD from './components/JarvisVoiceHUD';
import BatmanHudOverlay from './components/BatmanHud/BatmanHudOverlay';

export const metadata: Metadata = {
  title: 'Focus Forge',
  description: 'Gamified focus app with CRED style UI',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Focus Forge'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Outfit:wght@100..900&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" async></script>
      </head>
      <body className="bg-black text-white font-sans antialiased selection:bg-white/30" suppressHydrationWarning>
        <LayoutGroup>
          <ScreenEdgeLighting />
          <AudioStudioModal />
          <EverythingIsland />
          <JarvisVoiceHUD />
          <BatmanHudOverlay />
          {children}
        </LayoutGroup>
      </body>
    </html>
  );
}
