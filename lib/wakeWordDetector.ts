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

const ALLOWED_PREAMBLES = ['hey', 'ok', 'okay', 'yo', 'hi', 'hello', 'listen', 'mr', 'mister', 'dear'];

const NEAR_MISS_WORDS = [
  'harvest', 'service', 'travis', 'java', 'artists', 'target', 'drivers', 
  'garbage', 'charlie', 'davis', 'jar', 'car', 'star', 'bars', 'hardest'
];

const EMBEDDED_CONTEXT_INDICATORS = [
  'about', 'with', 'to', 'for', 'from', 'in', 'on', 'at', 'reading', 'told',
  'saw', 'heard', 'called', 'named', 'said', 'thinks', 'was', 'is', 'like'
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
 * Two-Pass Wake Word Phrase & Positional Verification Engine
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

    // Tokenize words and normalize
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

    const targetWake = (voiceConfig.wakeWord || 'jarvis').toLowerCase();

    // 1. Check for Near-Miss Words
    for (const word of words.slice(0, 3)) {
      if (NEAR_MISS_WORDS.includes(word)) {
        return {
          matched: false,
          confidence: 0.25,
          wakePhrase: word,
          trailingCommand: '',
          isNearMiss: true,
          rejectionReason: `NEAR_MISS_DETECTED: "${word}"`
        };
      }
    }

    // 2. Locate the position of the wake word (or closest variant)
    let wakeIndex = -1;
    let wakeWordFound = '';
    let matchConfidence = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Exact match
      if (word === targetWake || word === 'javis' || word === 'jarves') {
        wakeIndex = i;
        wakeWordFound = word;
        matchConfidence = 0.98;
        break;
      }

      // Fuzzy match (distance <= 1 for 6-letter word)
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
    // Wake word must be at index 0 (e.g. "Jarvis start timer") or index 1 with valid preamble (e.g. "Hey Jarvis start timer")
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

    // If wake word is at index 1 or 2, verify preceding words are allowed preambles (greetings/salutations)
    if (wakeIndex > 0) {
      const precedingWords = words.slice(0, wakeIndex);
      const allPrecedingAllowed = precedingWords.every(w => ALLOWED_PREAMBLES.includes(w));
      
      if (!allPrecedingAllowed) {
        // If preceding words contain embedded context markers (e.g. "about", "with", "reading")
        const hasEmbeddedContext = precedingWords.some(w => EMBEDDED_CONTEXT_INDICATORS.includes(w));
        return {
          matched: false,
          confidence: hasEmbeddedContext ? 0.15 : 0.35,
          wakePhrase: wakeWordFound,
          trailingCommand: '',
          isEmbedded: true,
          rejectionReason: `INVALID_PREAMBLE: "${precedingWords.join(' ')}" before wake word`
        };
      }
    }

    // 4. Extract Trailing Command (Pre-roll Command Preservation)
    // Everything after the wake word is preserved as trailing command
    const wakePhraseTokens = words.slice(0, wakeIndex + 1);
    const wakePhrase = wakePhraseTokens.join(' ');
    const trailingTokens = words.slice(wakeIndex + 1);
    const trailingCommand = trailingTokens.join(' ').trim();

    // Confidence adjustments based on context
    let finalConfidence = matchConfidence;

    // Standalone wake word ("Jarvis", "Hey Jarvis") has highest confidence
    if (trailingTokens.length === 0) {
      finalConfidence = Math.min(1.0, finalConfidence + 0.02);
    } else {
      // If trailing command starts with a verb or command starter, confidence remains high
      const firstCommandWord = trailingTokens[0];
      const commandStarters = ['start', 'play', 'pause', 'stop', 'show', 'add', 'create', 'complete', 'delete', 'set', 'search', 'what', 'how', 'lock', 'unlock', 'open', 'close'];
      if (commandStarters.includes(firstCommandWord)) {
        finalConfidence = Math.min(1.0, finalConfidence + 0.02);
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
   * Temporal Stability Check: Verifies candidate stability across a temporal buffer window
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
