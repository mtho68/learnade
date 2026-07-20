const MODEL = "onnx-community/whisper-tiny.en";

type RecordValue = Record<string, unknown>;
type Transcriber = (audio: string, options?: RecordValue) => Promise<unknown>;

let transcriberPromise: Promise<Transcriber> | null = null;

function resultText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && value !== null && "text" in value && typeof value.text === "string") return value.text.trim();
  return "";
}

async function loadTranscriber(onProgress: (message: string) => void): Promise<Transcriber> {
  if (!("gpu" in navigator)) throw new Error("This browser does not support the on-device speech model. You can still add an editable transcript yourself.");
  transcriberPromise ||= import("@huggingface/transformers").then(async ({ pipeline }) => {
    const model = await pipeline("automatic-speech-recognition", MODEL, {
      device: "webgpu",
      dtype: "q8",
      progress_callback: (event: unknown) => {
        if (typeof event === "object" && event !== null && "status" in event && (event as RecordValue).status === "progress" && typeof (event as RecordValue).progress === "number") {
          onProgress(`Downloading private speech model… ${Math.round((event as RecordValue).progress as number)}%`);
        }
      },
    });
    return model as unknown as Transcriber;
  }).catch(error => { transcriberPromise = null; throw error; });
  return transcriberPromise;
}

export async function transcribeAudioOnDevice(file: File, onProgress: (message: string) => void) {
  onProgress("Loading the private on-device speech model. The first use downloads it once.");
  const transcriber = await loadTranscriber(onProgress);
  onProgress("Transcribing this lecture on your device…");
  const url = URL.createObjectURL(file);
  try {
    const transcript = resultText(await transcriber(url, { return_timestamps: "chunk" }));
    if (!transcript) throw new Error("The speech model did not return a transcript. You can paste or edit notes instead.");
    return transcript;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const localSpeechModel = MODEL;
