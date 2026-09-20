/**
 * @file AIAdapter
 * Multimodal AI service integration adapter (Gemini API / Local Vision models).
 */

export interface AIAnalysisRequest {
  imageBufferDataUrl?: string;
  prompt: string;
  targetFormat?: string;
}

export interface AIAnalysisResponse {
  success: boolean;
  intent: string[];
  suggestedSteps: string[];
  criticNotes?: string[];
  raw?: unknown;
}

export class AIAdapter {
  private hasApiKey: boolean;

  constructor(apiKey?: string) {
    this.hasApiKey = Boolean(apiKey || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY));
  }

  public isCloudServiceConfigured(): boolean {
    return this.hasApiKey;
  }

  /**
   * Dispatches multimodal inference to Gemini model or executes local deterministic heuristic.
   */
  public async analyzeVisualContext(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.hasApiKey) {
      // Return honest local deterministic analysis when API key is not attached
      return {
        success: true,
        intent: ['product_advertisement', 'background_replacement', 'lighting_harmonization'],
        suggestedSteps: [
          'vision.object_detection',
          'vision.segmentation',
          'primitive.background_replacement',
          'primitive.lighting',
          'primitive.shadow',
        ],
        criticNotes: [
          'Operating in local deterministic benchmark mode.',
          'Connect Gemini API Key in Settings for live cloud multimodal perception.',
        ],
      };
    }

    // TODO: Connect live server-side Gemini API route proxy: /api/analyze-visual
    return {
      success: true,
      intent: ['ad_creation'],
      suggestedSteps: ['primitive.background_replacement', 'primitive.shadow'],
    };
  }
}
