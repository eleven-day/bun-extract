export type InputType = "url" | "file" | "stdin" | "unknown";

export interface OutputEnvelope {
  input: string;
  type: InputType;
  text: string;
  metadata: Record<string, unknown>;
}

export interface HandlerResult {
  text: string;
  metadata: Record<string, unknown>;
}

export interface Handler {
  name: string;
  canHandle(input: string, inputType: InputType): boolean;
  handle(input: string, config: import("./config").Config): Promise<HandlerResult>;
}
