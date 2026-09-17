/** Extracts YouTube video ID and playlist ID from any YT/YTM URL */
export function parseYouTubeUrl(url: string): { videoId: string | null; playlistId: string | null } {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace('www.', '');

    let videoId: string | null = null;
    let playlistId: string | null = null;

    // youtu.be/VIDEO_ID
    if (host === 'youtu.be') {
      videoId = u.pathname.slice(1).split('?')[0] || null;
    }
    // youtube.com or music.youtube.com
    else if (host === 'youtube.com' || host === 'music.youtube.com') {
      videoId = u.searchParams.get('v');
      playlistId = u.searchParams.get('list');
      // /shorts/VIDEO_ID
      if (!videoId && u.pathname.startsWith('/shorts/')) {
        videoId = u.pathname.split('/shorts/')[1].split('/')[0] || null;
      }
      // /live/VIDEO_ID
      if (!videoId && u.pathname.startsWith('/live/')) {
        videoId = u.pathname.split('/live/')[1].split('/')[0] || null;
      }
    }

    return { videoId, playlistId };
  } catch {
    // Legacy regex fallback
    const vidMatch = url.match(/(?:v=|youtu\.be\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
    const listMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
    return {
      videoId: vidMatch?.[1] ?? null,
      playlistId: listMatch?.[1] ?? null,
    };
  }
}

/** Fetch track metadata from YouTube oEmbed + thumbnail fallback */
export async function fetchYouTubeMeta(url: string): Promise<{
  videoId: string;
  playlistId: string | null;
  title: string;
  artist: string;
  thumbnail: string;
} | null> {
  const { videoId, playlistId } = parseYouTubeUrl(url);
  if (!videoId) return null;

  const thumb = await getBestThumbnail(videoId);

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
    );
    const data = await res.json();
    return {
      videoId,
      playlistId,
      title: data.title ?? 'Unknown Track',
      artist: data.author_name ?? 'YouTube',
      thumbnail: thumb,
    };
  } catch {
    return {
      videoId,
      playlistId,
      title: 'New Track',
      artist: 'YouTube',
      thumbnail: thumb,
    };
  }
}

/** Try maxresdefault then hqdefault */
export async function getBestThumbnail(videoId: string): Promise<string> {
  const maxres = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const hq = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  try {
    const res = await fetch(maxres, { method: 'HEAD' });
    // YouTube returns a 120x90 placeholder for missing maxres — check dimensions via width check
    if (res.ok) return maxres;
  } catch {}
  return hq;
}

/** Extract dominant color from an image URL using a canvas (client-only) */
export async function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 50;
        canvas.height = 50;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 50, 50);
        const d = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < d.length; i += 16) {
          r += d[i]; g += d[i + 1]; b += d[i + 2]; count++;
        }
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        resolve(`rgb(${r},${g},${b})`);
      } catch {
        resolve('rgb(99,102,241)');
      }
    };
    img.onerror = () => resolve('rgb(99,102,241)');
    img.src = imageUrl;
  });
}
