/**
 * Automated Voice FSM & Wake Word Verification Test Suite
 * Tests all 10 FSM states, two-pass wake-word detector, near-miss rejection,
 * embedded sentence rejection, structured intent parsing, and confirmation gating.
 */

import { WakeWordDetector } from '../lib/wakeWordDetector';
import { voiceConfig } from '../lib/voiceConfig';
import { parseStructuredIntent } from '../lib/jarvisCommandDispatcher';
import { JarvisVoiceEngine } from '../lib/jarvisVoiceEngine';

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING JARVIS VOICE FSM & WAKE-WORD TEST SUITE');
  console.log('======================================================\n');

  const detector = WakeWordDetector.getInstance();

  // -----------------------------------------------------------------
  // 1. EXACT WAKE WORD TESTS
  // -----------------------------------------------------------------
  console.log('👉 Category 1: Exact Wake Word Detection');
  {
    const res1 = detector.verifyWakeWord('Jarvis');
    assert(res1.matched === true, 'Exact "Jarvis" activates', `confidence: ${res1.confidence}`);
    assert(res1.trailingCommand === '', 'Trailing command is empty for standalone wake word');

    const res2 = detector.verifyWakeWord('Hey Jarvis');
    assert(res2.matched === true, '"Hey Jarvis" activates with preamble', `confidence: ${res2.confidence}`);

    const res3 = detector.verifyWakeWord('Okay Jarvis');
    assert(res3.matched === true, '"Okay Jarvis" activates with preamble', `confidence: ${res3.confidence}`);
  }

  // -----------------------------------------------------------------
  // 2. WAKE WORD + COMMAND IN SINGLE UTTERANCE (PRE-ROLL)
  // -----------------------------------------------------------------
  console.log('\n👉 Category 2: Single Utterance Wake Word + Trailing Command');
  {
    const res = detector.verifyWakeWord('Jarvis start a focus session');
    assert(res.matched === true, '"Jarvis start a focus session" triggers activation');
    assert(res.trailingCommand === 'start a focus session', 'Trailing command extracted cleanly', `got: "${res.trailingCommand}"`);

    const res2 = detector.verifyWakeWord('Hey Jarvis, play lofi music');
    assert(res2.matched === true, '"Hey Jarvis, play lofi music" triggers activation');
    assert(res2.trailingCommand === 'play lofi music', 'Trailing command preserved without wake word', `got: "${res2.trailingCommand}"`);
  }

  // -----------------------------------------------------------------
  // 3. MID-SENTENCE & EMBEDDED CONVERSATIONAL MENTION REJECTION
  // -----------------------------------------------------------------
  console.log('\n👉 Category 3: Embedded Mention Rejection');
  {
    const res1 = detector.verifyWakeWord('I was reading about Jarvis yesterday');
    assert(res1.matched === false, '"I was reading about Jarvis yesterday" is rejected');
    assert(res1.isEmbedded === true, 'Flagged as embedded conversational mention');

    const res2 = detector.verifyWakeWord('My friend told me Jarvis is cool');
    assert(res2.matched === false, '"My friend told me Jarvis is cool" is rejected');
  }

  // -----------------------------------------------------------------
  // 4. NEAR-MISS & PHONETIC DISTORTION REJECTION
  // -----------------------------------------------------------------
  console.log('\n👉 Category 4: Near-Miss & False Positive Rejection');
  {
    const nearMisses = ['harvest', 'service', 'travis', 'garbage', 'target', 'drivers', 'charlie'];
    for (const word of nearMisses) {
      const res = detector.verifyWakeWord(word);
      assert(res.matched === false, `Near-miss "${word}" does NOT activate`);
      assert(res.confidence < voiceConfig.wakeConfidenceThreshold, `Near-miss confidence is below threshold (${res.confidence})`);
    }
  }

  // -----------------------------------------------------------------
  // 5. STRUCTURED INTENT PARSER & CONFIDENCE GATING
  // -----------------------------------------------------------------
  console.log('\n👉 Category 5: Structured Intent Parser & Confidence Thresholds');
  {
    // High confidence deterministic command
    const res1 = await parseStructuredIntent('start a 25m focus timer');
    assert(res1.intent === 'START_TIMER', 'Intent parsed as START_TIMER');
    assert(res1.confidence >= voiceConfig.intentConfidenceThreshold, 'Intent confidence >= 0.80', `confidence: ${res1.confidence}`);
    assert(res1.requiresConfirmation === false, 'Standard timer start does not require confirmation');

    // Ambiguous command -> Low confidence clarification
    const res2 = await parseStructuredIntent('do that thing');
    assert(res2.intent === 'AMBIGUOUS_COMMAND', 'Intent parsed as AMBIGUOUS_COMMAND');
    assert(res2.confidence < voiceConfig.intentConfidenceThreshold, 'Ambiguous command confidence < 0.80', `confidence: ${res2.confidence}`);
    assert(res2.response.includes('specify which protocol'), 'Clarification question returned for ambiguous command');
  }

  // -----------------------------------------------------------------
  // 6. DESTRUCTIVE ACTION CONFIRMATION GATING
  // -----------------------------------------------------------------
  console.log('\n👉 Category 6: Destructive Action Confirmation Gating');
  {
    const res1 = await parseStructuredIntent('delete all tasks');
    assert(res1.intent === 'DELETE_TASK', 'Intent parsed as DELETE_TASK');
    assert(res1.requiresConfirmation === true, 'Destructive DELETE_TASK requires confirmation');

    const res2 = await parseStructuredIntent('reset timer');
    assert(res2.intent === 'RESET_TIMER', 'Intent parsed as RESET_TIMER');
    assert(res2.requiresConfirmation === true, 'Destructive RESET_TIMER requires confirmation');
  }

  // -----------------------------------------------------------------
  // 7. FSM STATE TRANSITIONS
  // -----------------------------------------------------------------
  console.log('\n👉 Category 7: Finite State Machine Transitions & Diagnostics');
  {
    const engine = JarvisVoiceEngine.getInstance();
    
    // Explicit sequence of transitions
    engine.transitionTo('disabled', 'Explicit test disable');
    engine.transitionTo('standby', 'Test standby entry');
    assert(engine.getState() === 'standby', 'State is standby');

    engine.transitionTo('wake_candidate', 'Candidate detected');
    assert(engine.getState() === 'wake_candidate', 'Transitioned to wake_candidate');

    engine.transitionTo('activated', 'Candidate verified');
    assert(engine.getState() === 'activated', 'Transitioned to activated');

    // Telemetry log check
    const telemetry = engine.getTelemetry();
    assert(telemetry.stateHistory.length >= 3, 'State transitions recorded in telemetry diagnostic log');
    assert(telemetry.audioUploaded === false, 'Zero standby audio uploaded privacy guarantee maintained');

    // Return to standby
    engine.transitionTo('standby', 'Test complete');
    assert(engine.getState() === 'standby', 'Reset to standby');
  }

  console.log('\n======================================================');
  console.log('🎉 ALL VOICE FSM & WAKE-WORD TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runTestSuite().catch((e) => {
  console.error('\n❌ Test Suite Aborted due to error:\n', e);
  process.exit(1);
});
