import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeAudio, warmUpModel } from './aiClient';

const SpeechRecognitionImpl =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const browserSpeechSupported = !!SpeechRecognitionImpl;
export const recordingSupported =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

// Browser speech errors where the on-device model can still help
const FALLBACK_ERRORS = new Set(['network', 'service-not-allowed', 'language-not-supported']);
// Once the browser engine has failed this way, skip straight to on-device next time
let browserEngineBroken = false;

const MAX_RECORDING_MS = 15000;
const SILENCE_STOP_MS = 1600;
const NO_SPEECH_STOP_MS = 8000;
const SPEECH_RMS = 0.02;

async function decodeTo16kMono(blob) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx({ sampleRate: 16000 });
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    if (buffer.numberOfChannels === 1) return buffer.getChannelData(0).slice();
    const a = buffer.getChannelData(0);
    const b = buffer.getChannelData(1);
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = (a[i] + b[i]) / 2;
    return out;
  } finally {
    ctx.close();
  }
}

// Mic capture with two engines:
//  - 'browser': Web Speech API (fast, live transcript; Chrome/Edge/Safari)
//  - 'on-device': MediaRecorder + Whisper in a worker (private, works offline after first use)
// preferredEngine 'auto' uses the browser engine and falls back to on-device when it is
// missing or fails.
export function useVoiceInput({ preferredEngine = 'auto', lang = 'en-IN', onResult }) {
  const [status, setStatus] = useState('idle'); // idle | listening | transcribing
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);
  const [level, setLevel] = useState(0);
  const [engine, setEngine] = useState(() =>
    preferredEngine === 'on-device' || !browserSpeechSupported ? 'on-device' : 'browser'
  );

  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });
  const sessionRef = useRef(null);

  const finish = useCallback((text) => {
    const clean = (text || '').trim();
    // Whisper emits "[BLANK_AUDIO]" / "(silence)" for empty clips
    if (clean && !/^[[(].*[\])]$/.test(clean)) onResultRef.current?.(clean);
    else setError("Didn't catch that. Tap the mic and try again.");
  }, []);

  const startRecorder = useCallback(async () => {
    setEngine('on-device');
    if (!recordingSupported) {
      setError('Voice input is not supported in this browser. You can type instead.');
      return;
    }
    warmUpModel('transcribe'); // download Whisper while the user talks

    // Claim the session before awaiting the permission prompt so a second start() is ignored
    const session = { kind: 'recorder', recorder: null, cancelled: false };
    sessionRef.current = session;
    setStatus('listening');

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      if (sessionRef.current === session) sessionRef.current = null;
      setError('Microphone access was blocked. Allow it in your browser settings.');
      setStatus('idle');
      return;
    }
    if (session.cancelled) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    const recorder = new MediaRecorder(stream);
    session.recorder = recorder;
    const chunks = [];
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);

    const startedAt = Date.now();
    let spoke = false;
    let silentSince = null;
    const stop = () => recorder.state === 'recording' && recorder.stop();

    // Lightweight voice-activity detection: stop after a pause in speech
    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      const rms = Math.sqrt(sum / samples.length);
      setLevel(Math.min(1, rms * 8));
      const now = Date.now();
      if (rms > SPEECH_RMS) {
        spoke = true;
        silentSince = null;
      } else if (spoke) {
        silentSince ??= now;
        if (now - silentSince > SILENCE_STOP_MS) stop();
      }
      if (now - startedAt > MAX_RECORDING_MS || (!spoke && now - startedAt > NO_SPEECH_STOP_MS)) stop();
    }, 100);

    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = async () => {
      clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      setLevel(0);
      if (session.cancelled) return;
      setStatus('transcribing');
      try {
        const audio = await decodeTo16kMono(new Blob(chunks, { type: recorder.mimeType }));
        finish(await transcribeAudio(audio));
      } catch (err) {
        setError(`Couldn't transcribe: ${err.message}`);
      } finally {
        if (sessionRef.current === session) sessionRef.current = null;
        setStatus('idle');
      }
    };

    recorder.start();
  }, [finish]);

  const startBrowser = useCallback(() => {
    setEngine('browser');
    const rec = new SpeechRecognitionImpl();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    const session = { kind: 'browser', rec, cancelled: false, text: '', fellBack: false };
    sessionRef.current = session;

    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      session.text = text;
      setInterim(text);
    };
    rec.onerror = (e) => {
      if (FALLBACK_ERRORS.has(e.error) && recordingSupported) {
        browserEngineBroken = true;
        session.fellBack = true;
        startRecorder();
      } else if (e.error === 'not-allowed') {
        setError('Microphone access was blocked. Allow it in your browser settings.');
      } else if (e.error === 'no-speech') {
        setError("Didn't hear anything. Tap the mic and try again.");
      } else if (e.error === 'audio-capture') {
        setError('No microphone found.');
      }
    };
    rec.onend = () => {
      if (sessionRef.current === session) sessionRef.current = null;
      if (session.fellBack) return;
      setStatus('idle');
      setLevel(0);
      if (!session.cancelled && session.text) finish(session.text);
    };

    try {
      rec.start();
      setStatus('listening');
    } catch {
      startRecorder();
    }
  }, [lang, finish, startRecorder]);

  const start = useCallback(() => {
    if (sessionRef.current) return;
    setError(null);
    setInterim('');
    if (preferredEngine !== 'on-device' && browserSpeechSupported && !browserEngineBroken) startBrowser();
    else startRecorder();
  }, [preferredEngine, startBrowser, startRecorder]);

  // Abort without producing a result
  const cancel = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    s.cancelled = true;
    if (s.kind === 'browser') s.rec.abort();
    else if (s.recorder?.state === 'recording') s.recorder.stop();
    sessionRef.current = null;
    setStatus('idle');
    setLevel(0);
  }, []);

  // Finish listening and use what was heard so far
  const stop = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    if (s.kind === 'browser') s.rec.stop();
    else if (s.recorder?.state === 'recording') s.recorder.stop();
    else cancel(); // still waiting for mic permission
  }, [cancel]);

  useEffect(() => cancel, [cancel]);

  return { status, interim, error, level, engine, start, stop, cancel, clearError: () => setError(null) };
}
