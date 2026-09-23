/**
 * FocusForge Browser-Level Document Picture-in-Picture Engine
 * Supports W3C Document Picture-in-Picture API with fallback to HTMLVideoElement PiP.
 */

export interface DocumentPiPOptions {
  width?: number;
  height?: number;
  title?: string;
  videoId?: string | null;
  playlistId?: string | null;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  isMuted?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (seconds: number) => void;
  onToggleMute?: () => void;
  onClose?: () => void;
}

let activePiPWindow: any = null;

/**
 * Check if the browser supports Document Picture-in-Picture API
 */
export function isDocumentPiPSupported(): boolean {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
}

/**
 * Check if standard video Picture-in-Picture is enabled
 */
export function isStandardPiPSupported(): boolean {
  return typeof document !== 'undefined' && document.pictureInPictureEnabled;
}

/**
 * Open a browser-level Document Picture-in-Picture window for floating playback
 */
export async function openDocumentPiP(
  options: DocumentPiPOptions,
  playerElement?: HTMLElement | null
): Promise<{ success: boolean; mode: 'document' | 'video' | 'none'; error?: string }> {
  // 1. Prevent duplicate PiP windows
  if (activePiPWindow && !activePiPWindow.closed) {
    try {
      activePiPWindow.focus();
      return { success: true, mode: 'document' };
    } catch (e) {
      activePiPWindow = null;
    }
  }

  const {
    width = 520,
    height = 310,
    title = 'FocusForge Miniplayer',
    videoId,
    playlistId,
    currentTime = 0,
    isMuted = false,
    onClose
  } = options;

  // 2. Primary: Document Picture-in-Picture API
  if (isDocumentPiPSupported()) {
    try {
      const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
        width,
        height,
        disallowReturnToOpener: false
      });

      activePiPWindow = pipWindow;

      // Copy parent stylesheets to PiP window
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = pipWindow.document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          const link = pipWindow.document.createElement('link');
          if (styleSheet.href) {
            link.rel = 'stylesheet';
            link.type = styleSheet.type || 'text/css';
            link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
          }
        }
      });

      // Inject base resets and layout styles
      const customStyle = pipWindow.document.createElement('style');
      customStyle.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background-color: #060709;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          overflow: hidden;
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .pip-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #000;
        }
        .pip-video-wrapper {
          flex: 1;
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #000;
        }
        .pip-video-wrapper iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }
        .pip-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 8px 12px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.85), transparent);
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 20;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .pip-container:hover .pip-header {
          opacity: 1;
        }
        .pip-title {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 80%;
          letter-spacing: 0.02em;
        }
        .pip-close-btn {
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          transition: background 0.2s;
        }
        .pip-close-btn:hover {
          background: rgba(244,63,94,0.6);
        }
      `;
      pipWindow.document.head.appendChild(customStyle);
      pipWindow.document.title = `${title} • FocusForge Miniplayer`;

      // Build Miniplayer DOM
      const container = pipWindow.document.createElement('div');
      container.className = 'pip-container';

      const header = pipWindow.document.createElement('div');
      header.className = 'pip-header';

      const titleEl = pipWindow.document.createElement('span');
      titleEl.className = 'pip-title';
      titleEl.textContent = title;

      const closeBtn = pipWindow.document.createElement('button');
      closeBtn.className = 'pip-close-btn';
      closeBtn.innerHTML = '&#x2715;';
      closeBtn.title = 'Close Miniplayer';
      closeBtn.onclick = () => pipWindow.close();

      header.appendChild(titleEl);
      header.appendChild(closeBtn);

      const videoWrapper = pipWindow.document.createElement('div');
      videoWrapper.className = 'pip-video-wrapper';

      const embedSrc = playlistId
        ? `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&autoplay=1&enablejsapi=1`
        : `https://www.youtube-nocookie.com/embed/${videoId || 'TIqsKXQHvFI'}?autoplay=1&start=${Math.floor(currentTime)}&enablejsapi=1`;

      const iframe = pipWindow.document.createElement('iframe');
      iframe.src = embedSrc;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;

      videoWrapper.appendChild(iframe);
      container.appendChild(header);
      container.appendChild(videoWrapper);
      pipWindow.document.body.appendChild(container);

      // Listen for window close / pagehide to clean up
      const handlePageHide = () => {
        activePiPWindow = null;
        if (onClose) onClose();
      };

      pipWindow.addEventListener('pagehide', handlePageHide);

      return { success: true, mode: 'document' };
    } catch (err: any) {
      console.warn('[DocumentPiP] Document PiP launch note:', err);
      // Fall through to standard video PiP
    }
  }

  // 3. Fallback: Standard HTML5 video Picture-in-Picture if a native video element is present
  if (playerElement) {
    const videoEl = playerElement.querySelector('video') as HTMLVideoElement | null;
    if (videoEl && isStandardPiPSupported()) {
      try {
        if (document.pictureInPictureElement !== videoEl) {
          await videoEl.requestPictureInPicture();
          return { success: true, mode: 'video' };
        } else {
          await document.exitPictureInPicture();
          return { success: true, mode: 'video' };
        }
      } catch (videoErr: any) {
        console.warn('[DocumentPiP] HTMLVideoElement PiP fallback error:', videoErr);
      }
    }
  }

  return {
    success: false,
    mode: 'none',
    error: 'Browser Picture-in-Picture is not supported in this browser environment.'
  };
}

/**
 * Close active Document PiP window if open
 */
export function closeDocumentPiP(): void {
  if (activePiPWindow && !activePiPWindow.closed) {
    try {
      activePiPWindow.close();
    } catch (e) {}
    activePiPWindow = null;
  }
}
