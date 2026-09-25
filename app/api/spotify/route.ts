import { NextRequest, NextResponse } from 'next/server';

/**
 * Spotify Web API Proxy Route
 * Handles token management and proxies search/browse/recommendations requests
 * Uses Client Credentials flow for public catalog access
 */

// Token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Spotify auth failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

async function spotifyFetch(endpoint: string, token: string): Promise<any> {
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${errText}`);
  }

  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'track';
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';
    const id = searchParams.get('id') || '';
    const market = searchParams.get('market') || 'US';
    const genres = searchParams.get('genres') || '';

    // Read credentials from headers first, fallback to env
    const clientId = req.headers.get('x-spotify-client-id') || SPOTIFY_CLIENT_ID;
    const clientSecret = req.headers.get('x-spotify-client-secret') || SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Spotify credentials not configured. Provide them in profile settings.' },
        { status: 401 }
      );
    }

    const token = await getAccessToken(clientId, clientSecret);

    switch (action) {
      case 'search': {
        const data = await spotifyFetch(
          `/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}&offset=${offset}&market=${market}`,
          token
        );
        return NextResponse.json(data);
      }

      case 'browse-new-releases': {
        const data = await spotifyFetch(
          `/browse/new-releases?limit=${limit}&offset=${offset}&country=${market}`,
          token
        );
        return NextResponse.json(data);
      }

      case 'browse-featured-playlists': {
        const data = await spotifyFetch(
          `/browse/featured-playlists?limit=${limit}&offset=${offset}&country=${market}`,
          token
        );
        return NextResponse.json(data);
      }

      case 'browse-categories': {
        const data = await spotifyFetch(
          `/browse/categories?limit=${limit}&offset=${offset}&country=${market}&locale=en_US`,
          token
        );
        return NextResponse.json(data);
      }

      case 'category-playlists': {
        if (!id) {
          return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
        }
        const data = await spotifyFetch(
          `/browse/categories/${id}/playlists?limit=${limit}&offset=${offset}&country=${market}`,
          token
        );
        return NextResponse.json(data);
      }

      case 'playlist': {
        if (!id) {
          return NextResponse.json({ error: 'Playlist ID required' }, { status: 400 });
        }
        const data = await spotifyFetch(
          `/playlists/${id}?market=${market}`,
          token
        );
        return NextResponse.json(data);
      }

      case 'playlist-tracks': {
        if (!id) {
          return NextResponse.json({ error: 'Playlist ID required' }, { status: 400 });
        }
        const data = await spotifyFetch(
          `/playlists/${id}/tracks?limit=${limit}&offset=${offset}&market=${market}`,
          token
        );
        return NextResponse.json(data);
      }

      case 'album': {
        if (!id) {
          return NextResponse.json({ error: 'Album ID required' }, { status: 400 });
        }
        const data = await spotifyFetch(
          `/albums/${id}?market=${market}`,
          token
        );
        return NextResponse.json(data);
      }

      case 'album-tracks': {
        if (!id) {
          return NextResponse.json({ error: 'Album ID required' }, { status: 400 });
        }
        const data = await spotifyFetch(
          `/albums/${id}/tracks?limit=${limit}&offset=${offset}&market=${market}`,
          token
        );
        return NextResponse.json(data);
      }

      case 'artist': {
        if (!id) {
          return NextResponse.json({ error: 'Artist ID required' }, { status: 400 });
        }
        const data = await spotifyFetch(
          `/artists/${id}`,
          token
        );
        return NextResponse.json(data);
      }

      case 'artist-top-tracks': {
        if (!id) {
          return NextResponse.json({ error: 'Artist ID required' }, { status: 400 });
        }
        const data = await spotifyFetch(
          `/artists/${id}/top-tracks?market=${market}`,
          token
        );
        return NextResponse.json(data);
      }

      case 'artist-albums': {
        if (!id) {
          return NextResponse.json({ error: 'Artist ID required' }, { status: 400 });
        }
        const data = await spotifyFetch(
          `/artists/${id}/albums?limit=${limit}&offset=${offset}&market=${market}&include_groups=album,single`,
          token
        );
        return NextResponse.json(data);
      }

      case 'recommendations': {
        const seedTracks = searchParams.get('seed_tracks') || '';
        const seedArtists = searchParams.get('seed_artists') || '';
        const seedGenres = searchParams.get('seed_genres') || genres;
        
        let params = `?limit=${limit}&market=${market}`;
        if (seedTracks) params += `&seed_tracks=${seedTracks}`;
        if (seedArtists) params += `&seed_artists=${seedArtists}`;
        if (seedGenres) params += `&seed_genres=${seedGenres}`;

        const data = await spotifyFetch(`/recommendations${params}`, token);
        return NextResponse.json(data);
      }

      case 'genres': {
        const data = await spotifyFetch('/recommendations/available-genre-seeds', token);
        return NextResponse.json(data);
      }

      case 'track': {
        if (!id) {
          return NextResponse.json({ error: 'Track ID required' }, { status: 400 });
        }
        const data = await spotifyFetch(`/tracks/${id}?market=${market}`, token);
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Supported: search, browse-new-releases, browse-featured-playlists, browse-categories, category-playlists, playlist, playlist-tracks, album, album-tracks, artist, artist-top-tracks, artist-albums, recommendations, genres, track` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error('[Spotify API Error]', err?.message);
    return NextResponse.json(
      { error: err?.message || 'Spotify API request failed' },
      { status: 500 }
    );
  }
}
