// Promise-based wrapper around ai.worker.js. The worker (and the models it
// downloads) is only created the first time one of these is called.

let worker = null;
let nextId = 0;
const pending = new Map();
const progressListeners = new Set();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./ai.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        progressListeners.forEach((fn) => fn(data));
        return;
      }
      const p = pending.get(data.id);
      if (!p) return;
      pending.delete(data.id);
      if (data.error) p.reject(new Error(data.error));
      else p.resolve(data.result);
    };
    worker.onerror = (e) => {
      for (const p of pending.values()) p.reject(new Error(e.message || 'On-device AI failed to load'));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

function call(task, payload, transfer = []) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, task, ...payload }, transfer);
  });
}

// → { category, score }
export const classifyCategory = (text, type) => call('classify', { text, kind: type });

// audio: mono Float32Array at 16 kHz → transcript string
export const transcribeAudio = (audio) => call('transcribe', { audio }, [audio.buffer]);

// Start downloading a model in the background ('classify' | 'transcribe')
export const warmUpModel = (which) => call('warmup', { which }).catch(() => {});

// fn({ task, loaded, total }) — fires while model files download
export function onModelProgress(fn) {
  progressListeners.add(fn);
  return () => progressListeners.delete(fn);
}
