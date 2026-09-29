import OpenAI, { toFile } from 'openai';

export type TranscriptionAudio = {
  bytes: Uint8Array;
  fileName: string;
  mediaType: string;
};

export type AudioTranscriber = (audio: TranscriptionAudio) => Promise<string>;

export type OpenAITranscriptionRequest = TranscriptionAudio & {
  model: string;
};

type OpenAITranscriberOptions = {
  apiKey?: string;
  model: string;
  requestTranscription?: (request: OpenAITranscriptionRequest) => Promise<string>;
};

/** Transcribes a completed recording without writing the audio to local storage. */
export function createOpenAITranscriber(options: OpenAITranscriberOptions): AudioTranscriber {
  const requestTranscription =
    options.requestTranscription ?? createTranscriptionRequester(options.apiKey);

  return async (audio) => {
    const transcript = (
      await requestTranscription({
        ...audio,
        model: options.model,
      })
    ).trim();

    if (!transcript) {
      throw new Error('OpenAI returned an empty transcript.');
    }

    return transcript;
  };
}

function createTranscriptionRequester(apiKey: string | undefined) {
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY is required for voice transcription.');
  }

  const client = new OpenAI({
    apiKey,
    maxRetries: 1,
    timeout: 60_000,
  });

  return async (request: OpenAITranscriptionRequest) => {
    const file = await toFile(request.bytes, request.fileName, { type: request.mediaType });
    const transcription = await client.audio.transcriptions.create({
      file,
      model: request.model,
    });
    return transcription.text;
  };
}
