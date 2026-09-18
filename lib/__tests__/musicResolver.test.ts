import { 
  normalizeText, 
  calculateFuzzySimilarity, 
  resolvePlaylist, 
  resolveSong,
  setPendingMusicClarification,
  getPendingMusicClarification,
  clearPendingMusicClarification
} from '../musicResolver';
import { 
  executeMusicTool, 
  isDuplicateAction, 
  MUSIC_TOOLS_DECLARATIONS 
} from '../musicTools';
import { Playlist, Track } from '../../hooks/useFrequencyStore';

// Mock test data
const mockTracks: Track[] = [
  {
    id: 'track-1',
    videoId: '4NRXx6U8ABQ',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    thumbnail: 'https://img.youtube.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
    dominantColor: 'rgb(147, 51, 234)',
    addedAt: Date.now() - 100000,
    sourceUrl: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ'
  },
  {
    id: 'track-2',
    videoId: 'jfKfPfyJRdk',
    title: 'Lofi Hip Hop Chill Beats',
    artist: 'Lofi Girl',
    thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    dominantColor: 'rgb(34, 211, 238)',
    addedAt: Date.now() - 50000,
    sourceUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk'
  },
  {
    id: 'track-3',
    videoId: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    dominantColor: 'rgb(244, 63, 94)',
    addedAt: Date.now() - 20000,
    sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  }
];

const mockPlaylists: Playlist[] = [
  {
    id: 'pl-workout',
    name: 'Heavy Beast Workout',
    description: 'High energy gym and lifting motivation',
    trackIds: ['track-1', 'track-3'],
    createdAt: Date.now() - 500000,
    updatedAt: Date.now() - 10000
  },
  {
    id: 'pl-latenight-1',
    name: 'Late Night Drives',
    description: 'Synthwave and night cruise vibes with purple aesthetic',
    coverThumbnail: 'purple-sunset.jpg',
    trackIds: ['track-1'],
    createdAt: Date.now() - 400000,
    updatedAt: Date.now() - 20000
  },
  {
    id: 'pl-latenight-2',
    name: 'Late Night Study',
    description: 'Quiet nocturnal focus session',
    trackIds: ['track-2'],
    createdAt: Date.now() - 300000,
    updatedAt: Date.now() - 30000
  },
  {
    id: 'pl-empty',
    name: 'Empty Playlist',
    description: 'No tracks added yet',
    trackIds: [],
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000
  }
];

function runTestSuite() {
  console.log('=== STARTING MUSIC RESOLVER & VOICE TOOLS TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Exact playlist name
  const test1 = resolvePlaylist('Heavy Beast Workout', { playlists: mockPlaylists, tracks: mockTracks });
  assert(test1.length > 0 && test1[0].playlistId === 'pl-workout' && test1[0].score === 1.0, '1. Exact playlist name match');

  // 2. Partial playlist name
  const test2 = resolvePlaylist('late night', { playlists: mockPlaylists, tracks: mockTracks });
  assert(test2.length >= 2 && test2[0].score >= 0.90, '2. Partial playlist name match');

  // 3. Misspelled playlist name
  const test3 = resolvePlaylist('lat nite drivs', { playlists: mockPlaylists, tracks: mockTracks });
  assert(test3.length > 0 && test3[0].playlistId === 'pl-latenight-1' && test3[0].score >= 0.70, '3. Misspelled playlist name match');

  // 4. Mood-based playlist request
  const test4 = resolvePlaylist('my gym workout playlist', { playlists: mockPlaylists, tracks: mockTracks });
  assert(test4.length > 0 && test4[0].playlistId === 'pl-workout', '4. Mood/Activity keyword match (gym workout)');

  // 5. Playlist identified through contained song
  const test5 = resolvePlaylist('playlist with Blinding Lights', { playlists: mockPlaylists, tracks: mockTracks });
  assert(test5.length > 0 && test5.some(c => c.playlistId === 'pl-latenight-1' || c.playlistId === 'pl-workout'), '5. Contained song in playlist match');

  // 6. Playlist identified through artist
  const test6 = resolvePlaylist('playlist that has The Weeknd', { playlists: mockPlaylists, tracks: mockTracks });
  assert(test6.length > 0 && test6.some(c => c.playlistId === 'pl-latenight-1' || c.playlistId === 'pl-workout'), '6. Contained artist in playlist match');

  // 7. Cover color matching
  const test7 = resolvePlaylist('playlist with purple cover', { playlists: mockPlaylists, tracks: mockTracks });
  assert(test7.length > 0 && test7[0].playlistId === 'pl-latenight-1', '7. Cover color theme match (purple cover)');

  // 8. Ambiguous match detection
  const test8 = resolvePlaylist('late night', { playlists: mockPlaylists, tracks: mockTracks });
  const isAmbiguous = test8.length >= 2 && Math.abs(test8[0].score - test8[1].score) < 0.15;
  assert(isAmbiguous, '8. Ambiguous match detection when two similar playlists exist');

  // 9. Multi-turn follow-up resolution
  setPendingMusicClarification({
    type: 'PLAYLIST_CHOICE',
    candidates: test8.slice(0, 2),
    prompt: 'Which one?',
    createdAt: Date.now()
  });
  const pending = getPendingMusicClarification();
  assert(pending !== null && pending.candidates?.length === 2, '9. Pending clarification state saved');

  // 10. No matching playlist
  const test10 = resolvePlaylist('xyz completely unrelated non-existent query', { playlists: mockPlaylists, tracks: mockTracks });
  assert(test10.length === 0, '10. No matching playlist returns empty list');

  // 11. Empty playlist identification
  const test11 = resolvePlaylist('Empty Playlist', { playlists: mockPlaylists, tracks: mockTracks });
  assert(test11.length > 0 && test11[0].trackCount === 0, '11. Empty playlist trackCount is 0');

  // 12. Contextual "this playlist" resolution
  const test12 = resolvePlaylist('play this playlist', { playlists: mockPlaylists, tracks: mockTracks, currentPlaylistId: 'pl-latenight-2' });
  assert(test12.length > 0 && test12[0].playlistId === 'pl-latenight-2', '12. Contextual "this playlist" resolves currently viewed playlist');

  // 13. Song resolution - exact
  const test13 = resolveSong('Blinding Lights', mockTracks);
  assert(test13.length > 0 && test13[0].songId === 'track-1' && test13[0].score === 1.0, '13. Song exact match');

  // 14. Song resolution - fuzzy/partial
  const test14 = resolveSong('lofi chill', mockTracks);
  assert(test14.length > 0 && test14[0].songId === 'track-2', '14. Song fuzzy/partial match');

  // 15. Action deduplication
  const actionKey = 'skip-action-123';
  const firstCall = isDuplicateAction(actionKey);
  const secondCall = isDuplicateAction(actionKey);
  assert(firstCall === false && secondCall === true, '15. Action deduplication prevents duplicate execution');

  // 16. Strict tool declarations schema
  const requiredTools = [
    'open_frequency', 'search_frequency', 'find_playlist', 'play_playlist',
    'play_playlist_from_start', 'play_song', 'pause_playback', 'resume_playback',
    'skip_next', 'skip_previous', 'set_volume', 'toggle_shuffle', 'set_repeat_mode',
    'add_to_queue', 'clear_queue', 'get_current_playback', 'get_queue'
  ];
  const allDeclared = requiredTools.every(name => MUSIC_TOOLS_DECLARATIONS.some(t => t.name === name));
  assert(allDeclared, '16. All 17 required music tool declarations are strictly defined');

  // 17. Text Normalization
  const normResult = normalizeText('  Jarvis, PLAY my "Late-Night" playlist!  ');
  assert(normResult === 'jarvis play my late night playlist', '17. Text normalization strips punctuation, whitespace, and case');

  // 18. Fuzzy similarity calculation
  const sim = calculateFuzzySimilarity('workout', 'wrkout');
  assert(sim > 0.8, '18. Fuzzy similarity scores high for minor typos');

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
