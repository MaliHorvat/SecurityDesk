export type AiProvider = "disabled" | "openai" | "anthropic" | "google" | "ollama";

export type AiCompletionRequest = {
  system?: string;
  prompt: string;
  temperature?: number;
};

export type AiCompletionResult =
  | { available: false; reason: string }
  | { available: true; text: string; provider: AiProvider; model?: string };

export interface AiClient {
  isAvailable(): boolean;
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
}

/**
 * Shared AI layer. Never crash when API keys are missing —
 * return an unavailable result or deterministic fallback.
 */
export function createAiClient(options?: {
  provider?: AiProvider;
  model?: string;
}): AiClient {
  const provider = options?.provider ?? ((process.env.AI_PROVIDER as AiProvider | undefined) || "disabled");
  const model = options?.model ?? process.env.AI_MODEL;

  const hasKey =
    (provider === "openai" && Boolean(process.env.OPENAI_API_KEY)) ||
    (provider === "anthropic" && Boolean(process.env.ANTHROPIC_API_KEY)) ||
    (provider === "google" && Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)) ||
    provider === "ollama";

  return {
    isAvailable() {
      return provider !== "disabled" && hasKey;
    },
    async complete(request) {
      if (provider === "disabled" || !hasKey) {
        return {
          available: false,
          reason:
            provider === "disabled"
              ? "AI je izključen (AI_PROVIDER=disabled)."
              : "AI ponudnik ni konfiguriran. Dodajte API ključ v .env.local.",
        };
      }

      // Provider adapters land in Phase 9. Deterministic stub keeps UX stable.
      return {
        available: true,
        provider,
        model,
        text: [
          "[Deterministični način – pravi AI adapter še ni vklopljen]",
          "",
          `Ponudnik: ${provider}`,
          request.system ? `Sistem: ${request.system.slice(0, 120)}…` : null,
          `Vprašanje: ${request.prompt.slice(0, 400)}`,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    },
  };
}
