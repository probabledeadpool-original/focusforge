import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Fetch HTML Content
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const pdfUrls = new Set<string>();
    const videoUrls = new Set<string>();

    // Safe URL resolution relative to the request URL
    const resolveUrl = (target: string) => {
      try {
        return new URL(target, url).href;
      } catch (e) {
        return null;
      }
    };

    // --- PDF EXTRACTION ---
    $('embed[src$=".pdf"]').each((_, el) => {
      const src = $(el).attr("src");
      if (src) {
        const resolved = resolveUrl(src);
        if (resolved) pdfUrls.add(resolved);
      }
    });

    $('object[data$=".pdf"]').each((_, el) => {
      const data = $(el).attr("data");
      if (data) {
        const resolved = resolveUrl(data);
        if (resolved) pdfUrls.add(resolved);
      }
    });

    $('iframe[src$=".pdf"]').each((_, el) => {
      const src = $(el).attr("src");
      if (src) {
        const resolved = resolveUrl(src);
        if (resolved) pdfUrls.add(resolved);
      }
    });

    $('a[href$=".pdf"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const resolved = resolveUrl(href);
        if (resolved) pdfUrls.add(resolved);
      }
    });

    // --- VIDEO EXTRACTION ---
    const videoExtensions = ['.mp4', '.webm', '.m3u8', '.ogg'];
    const urlLower = url.toLowerCase();

    // 0. Check if the input URL itself IS a video (YouTube, Vimeo, or direct link)
    const isYouTube = urlLower.includes('youtube.com/watch') || urlLower.includes('youtu.be/');
    const isVimeo = urlLower.includes('vimeo.com/');
    const hasVideoExt = videoExtensions.some(ext => urlLower.includes(ext));

    if (isYouTube || isVimeo || hasVideoExt) {
      videoUrls.add(url);
    }

    // 1. Check OpenGraph and Twitter Meta Tags for embedded players
    $('meta[property="og:video"], meta[property="og:video:url"], meta[property="og:video:secure_url"], meta[name="twitter:player"]').each((_, el) => {
      const content = $(el).attr("content");
      if (content) {
        const resolved = resolveUrl(content);
        if (resolved) videoUrls.add(resolved);
      }
    });

    // 2. YouTube and Vimeo Embeds (iframe and lazy loaded elements)
    $('iframe, div[data-src], div[data-video-url]').each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("data-video-url");
      if (!src) return;
      
      const lowerSrc = src.toLowerCase();
      if (lowerSrc.includes('youtube.com') || lowerSrc.includes('youtube-nocookie.com') || lowerSrc.includes('vimeo.com') || lowerSrc.includes('youtu.be')) {
        const resolved = resolveUrl(src);
        if (resolved) videoUrls.add(resolved);
      }
    });

    // 3. Native <video> tags
    $('video').each((_, el) => {
      const src = $(el).attr("src");
      if (src) {
        const resolved = resolveUrl(src);
        if (resolved) videoUrls.add(resolved);
      }
      
      // Check sources inside <video>
      $(el).find('source').each((_, sourceEl) => {
        const sourceSrc = $(sourceEl).attr('src');
        if (sourceSrc) {
          const resolved = resolveUrl(sourceSrc);
          if (resolved) videoUrls.add(resolved);
        }
      });
    });

    // 4. Direct links to video files in anchors
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      
      const lowerHref = href.toLowerCase();
      if (videoExtensions.some(ext => lowerHref.includes(ext))) {
         const resolved = resolveUrl(href);
         if (resolved) videoUrls.add(resolved);
      }
    });

    return NextResponse.json({ 
      pdfUrls: Array.from(pdfUrls),
      videoUrls: Array.from(videoUrls)
    });
  } catch (error: any) {
    console.error("Error extracting media:", error.message);
    return NextResponse.json({ error: "Failed to extract media from the provided URL" }, { status: 500 });
  }
}
