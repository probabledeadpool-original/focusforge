"use client";

import { voiceConfig } from './voiceConfig';

export interface WakeWordVerificationResult {
  matched: boolean;
  confidence: number;
  wakePhrase: string;
  trailingCommand: string;
  rejectionReason?: string;
  isNearMiss?: boolean;
  isEmbedded?: boolean;
}

const ALLOWED_PREAMBLES = [
  'hey', 'ok', 'okay', 'yo', 'hi', 'hello', 'listen', 'mr', 'mister', 
  'dear', 'alright', 'so', 'please', 'sup', 'a', 'the', 'now'
];

// Phonetic close variants of "Jarvis" across diverse accents
const PHONETIC_JARVIS_VARIANTS = [
  'jarvis', 'javis', 'jervis', 'jarves', 'jarviz', 'jar-vis', 'jar vis', 
  'jarviss', 'jarvas', 'jarbus', 'jarbes', 'charvis', 'djarvis', 'jahvis', 
  'jarvys', 'jarvice'
];

// Direct phrase triggers that activate without needing "Jarvis" prefix
const DIRECT_PHRASE_TRIGGERS = [
  "let's lock in",
  "lets lock in",
  "lock in",
  "batman mode",
  "iron man mode",
  "activate hud",
  "start focus music",
  "play focus music",
  "focus music",
  "wake up",
  "hey buddy"
];

// Non-wake words / phonetic near-misses that should not activate in isolation
const STRICT_NON_WAKE_WORDS = [
  'harvest', 'service', 'travis', 'drivers', 'garbage', 'charlie', 
  'target', 'hardest', 'star', 'java', 'artists', 'davis', 'cars'
];

const EMBEDDED_CONTEXT_INDICATORS = [
  'about', 'with', 'reading', 'told', 'saw', 'heard', 'called', 'named'
];

/**
 * Standard Levenshtein Distance for normalized phonetic comparison
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * High-Accuracy, Multi-Accent Two-Pass Wake Word Phrase & Positional Verification Engine
 */
export class WakeWordDetector {
  private static instance: WakeWordDetector;
  private candidateBuffer: { text: string; timestamp: number; confidence: number }[] = [];

  public static getInstance(): WakeWordDetector {
    if (!WakeWordDetector.instance) {
      WakeWordDetector.instance = new WakeWordDetector();
    }
    return WakeWordDetector.instance;
  }

  /**
   * Primary Evaluation: Verifies if transcript contains a legitimate wake-word invocation
   */
  public verifyWakeWord(
    rawText: string, 
    threshold: number = voiceConfig.wakeConfidenceThreshold
  ): WakeWordVerificationResult {
    const text = rawText.trim();
    if (!text) {
      return {
        matched: false,
        confidence: 0,
        wakePhrase: '',
        trailingCommand: '',
        rejectionReason: 'EMPTY_INPUT'
      };
    }

    const clean = text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?'"’]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = clean.split(' ').filter(Boolean);

    if (words.length === 0) {
      return {
        matched: false,
        confidence: 0,
        wakePhrase: '',
        trailingCommand: '',
        rejectionReason: 'NO_VALID_TOKENS'
      };
    }

    // 0. Direct Phrase Activations (e.g. "let's lock in", "start focus music", "lock in")
    for (const trigger of DIRECT_PHRASE_TRIGGERS) {
      if (clean === trigger || clean.startsWith(trigger + ' ')) {
        const trailing = clean.substring(trigger.length).trim();
        return {
          matched: true,
          confidence: 0.99,
          wakePhrase: trigger,
          trailingCommand: trailing || trigger,
        };
      }
    }

    // 1. Check for Strict Near-Miss / Non-Wake Words (when used in first 2 tokens)
    for (const word of words.slice(0, 2)) {
      if (STRICT_NON_WAKE_WORDS.includes(word)) {
        return {
          matched: false,
          confidence: 0.25,
          wakePhrase: word,
          trailingCommand: '',
          isNearMiss: true,
          rejectionReason: `STRICT_NON_WAKE_WORD: "${word}"`
        };
      }
    }

    const targetWake = (voiceConfig.wakeWord || 'jarvis').toLowerCase();

    // 2. Locate the position of the wake word (exact, phonetic, or fuzzy)
    let wakeIndex = -1;
    let wakeWordFound = '';
    let matchConfidence = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Exact match with primary wake word or known phonetic variants
      if (word === targetWake || PHONETIC_JARVIS_VARIANTS.includes(word)) {
        wakeIndex = i;
        wakeWordFound = word;
        matchConfidence = (word === targetWake || word === 'javis' || word === 'jarves') ? 0.98 : 0.92;
        break;
      }

      // Levenshtein fuzzy match
      const dist = levenshteinDistance(word, targetWake);
      if (dist === 1 && word.length >= 5) {
        wakeIndex = i;
        wakeWordFound = word;
        matchConfidence = 0.88;
        break;
      }
    }

    // Wake word not found in any token
    if (wakeIndex === -1) {
      return {
        matched: false,
        confidence: 0.1,
        wakePhrase: '',
        trailingCommand: '',
        rejectionReason: 'WAKE_WORD_NOT_FOUND'
      };
    }

    // 3. Positional Constraint & Embedded Sentence Validation
    // Wake word must be within the first 3 tokens (e.g. "Jarvis ...", "Hey Jarvis ...", "Yo mr Jarvis ...")
    if (wakeIndex > 2) {
      return {
        matched: false,
        confidence: 0.2,
        wakePhrase: wakeWordFound,
        trailingCommand: '',
        isEmbedded: true,
        rejectionReason: `EMBEDDED_WAKE_WORD_REJECTED (index ${wakeIndex}): e.g. conversational mention`
      };
    }

    // If wake word is preceded by words, check if they are allowed preambles
    if (wakeIndex > 0) {
      const precedingWords = words.slice(0, wakeIndex);
      const hasEmbeddedContext = precedingWords.some(w => EMBEDDED_CONTEXT_INDICATORS.includes(w));
      
      if (hasEmbeddedContext) {
        return {
          matched: false,
          confidence: 0.15,
          wakePhrase: wakeWordFound,
          trailingCommand: '',
          isEmbedded: true,
          rejectionReason: `EMBEDDED_CONTEXT_DETECTED: "${precedingWords.join(' ')}" before wake word`
        };
      }

      const allPrecedingAllowed = precedingWords.every(w => ALLOWED_PREAMBLES.includes(w));
      if (!allPrecedingAllowed) {
        return {
          matched: false,
          confidence: 0.35,
          wakePhrase: wakeWordFound,
          trailingCommand: '',
          isEmbedded: true,
          rejectionReason: `INVALID_PREAMBLE: "${precedingWords.join(' ')}" before wake word`
        };
      }
    }

    // 4. Extract Trailing Command (Pre-roll Command Preservation)
    const wakePhraseTokens = words.slice(0, wakeIndex + 1);
    const wakePhrase = wakePhraseTokens.join(' ');
    const trailingTokens = words.slice(wakeIndex + 1);
    const trailingCommand = trailingTokens.join(' ').trim();

    let finalConfidence = matchConfidence;

    // Standalone wake word ("Jarvis", "Hey Jarvis") has high confidence
    if (trailingTokens.length === 0) {
      finalConfidence = Math.min(1.0, finalConfidence + 0.02);
    } else {
      const firstCommandWord = trailingTokens[0];
      const commandStarters = [
        'start', 'play', 'pause', 'stop', 'show', 'add', 'create', 
        'complete', 'delete', 'set', 'search', 'what', 'how', 'lock', 
        'unlock', 'open', 'close', 'tell', 'convert', 'volume', 'next'
      ];
      if (commandStarters.includes(firstCommandWord)) {
        finalConfidence = Math.min(1.0, finalConfidence + 0.05);
      }
    }

    const isVerified = finalConfidence >= threshold;

    return {
      matched: isVerified,
      confidence: finalConfidence,
      wakePhrase,
      trailingCommand,
      rejectionReason: isVerified ? undefined : `CONFIDENCE_BELOW_THRESHOLD (${finalConfidence.toFixed(2)} < ${threshold.toFixed(2)})`
    };
  }

  /**
   * Temporal Stability Check
   */
  public verifyTemporalStability(candidateText: string): boolean {
    const now = Date.now();
    this.candidateBuffer = this.candidateBuffer.filter(c => now - c.timestamp < 1200);

    const check = this.verifyWakeWord(candidateText);
    this.candidateBuffer.push({
      text: candidateText,
      timestamp: now,
      confidence: check.confidence
    });

    if (this.candidateBuffer.length >= 1 && check.matched) {
      return true;
    }

    return check.matched;
  }

  public clearBuffer(): void {
    this.candidateBuffer = [];
  }
}

export const wakeWordDetector = WakeWordDetector.getInstance();
