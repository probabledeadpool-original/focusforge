import type { Metadata } from 'next';
import './globals.css';
import { LayoutGroup } from 'motion/react';
import EverythingIsland from './components/EverythingIsland';
import ScreenEdgeLighting from './components/TheFrequency/ScreenEdgeLighting';
import AudioStudioModal from './components/TheFrequency/AudioStudioModal';
import JarvisVoiceHUD from './components/JarvisVoiceHUD';

export const metadata: Metadata = {
  title: 'Focus Forge',
  description: 'Gamified focus app with CRED style UI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
          {children}
        </LayoutGroup>
      </body>
    </html>
  );
}
