// Runs the on-device models off the main thread.
// transformers.js is loaded from jsDelivr on first use, so it adds nothing to
// the app bundle; model files are cached by the browser after the first download.
import { buildEmbeddingClassifier } from './embeddingClassifier';

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js';
const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2'; // ~23 MB, sentence embeddings
const ASR_MODEL = 'onnx-community/whisper-tiny.en'; // ~41 MB, speech-to-text

let libPromise;
let classifierPromise;
let asrPromise;

const loadLib = () => (libPromise ??= import(/* @vite-ignore */ TRANSFORMERS_URL));

// Aggregates per-file download progress into one number per task
function progressReporter(task) {
  const files = new Map();
  return (event) => {
    if (event.status === 'progress' && event.total) {
      files.set(event.file, { loaded: event.loaded, total: event.total });
      let loaded = 0;
      let total = 0;
      for (const f of files.values()) {
        loaded += f.loaded;
        total += f.total;
      }
      self.postMessage({ type: 'progress', task, loaded, total });
    }
  };
}

function getClassifier() {
  classifierPromise ??= (async () => {
    const { pipeline } = await loadLib();
    const extractor = await pipeline('feature-extraction', EMBED_MODEL, {
      dtype: 'q8',
      progress_callback: progressReporter('classify'),
    });
    const embed = async (texts) => (await extractor(texts, { pooling: 'mean', normalize: true })).tolist();
    return buildEmbeddingClassifier(embed);
  })();
  classifierPromise.catch(() => { classifierPromise = undefined; });
  return classifierPromise;
}

function getTranscriber() {
  asrPromise ??= (async () => {
    const { pipeline } = await loadLib();
    return pipeline('automatic-speech-recognition', ASR_MODEL, {
      dtype: 'q8',
      progress_callback: progressReporter('transcribe'),
    });
  })();
  asrPromise.catch(() => { asrPromise = undefined; });
  return asrPromise;
}

self.onmessage = async ({ data }) => {
  const { id, task } = data;
  try {
    let result;
    if (task === 'classify') {
      const classify = await getClassifier();
      result = await classify(data.text, data.kind);
    } else if (task === 'transcribe') {
      const transcriber = await getTranscriber();
      const out = await transcriber(data.audio);
      result = (out.text || '').trim();
    } else if (task === 'warmup') {
      await (data.which === 'transcribe' ? getTranscriber() : getClassifier());
      result = true;
    } else {
      throw new Error(`Unknown task: ${task}`);
    }
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: err?.message || String(err) });
  }
};
