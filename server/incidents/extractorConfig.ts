import { didMatchMockFixture, extractIncident as extractIncidentWithMock } from './mockExtractor';
import type { ExtractionMethod } from './model';
import { createOpenAIIncidentExtractor } from './openAiExtractor';

export type IncidentExtractorConfiguration = {
  extractor: (description: string) => Promise<unknown>;
  extractionMethod: ExtractionMethod;
  extractionModel: string | null;
  fixtureMatcher?: (description: string) => boolean;
};

/** Selects an extractor explicitly. A configured OpenAI failure never falls back to mock data. */
export function resolveIncidentExtractor(
  environment: NodeJS.ProcessEnv,
): IncidentExtractorConfiguration {
  const mode = environment.INCIDENT_EXTRACTOR?.trim().toLowerCase() || 'mock';

  if (mode === 'mock') {
    return {
      extractor: extractIncidentWithMock,
      extractionMethod: 'mock-v1',
      extractionModel: null,
      fixtureMatcher: didMatchMockFixture,
    };
  }

  if (mode === 'openai') {
    const model = environment.OPENAI_INCIDENT_MODEL?.trim() || 'gpt-6-luna';
    return {
      extractor: createOpenAIIncidentExtractor({
        apiKey: environment.OPENAI_API_KEY,
        model,
      }),
      extractionMethod: 'openai-responses-v1',
      extractionModel: model,
    };
  }

  throw new Error('INCIDENT_EXTRACTOR must be either "mock" or "openai".');
}
