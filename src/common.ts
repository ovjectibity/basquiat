import { ExecuteCommand, ExecuteCommandResult,
    ExecuteCommands, ExecuteCommandsResult } from "./figmacommands";
import { ModelProvider } from "./messages";

export interface CommandExecutor {
    executeCommands(cmds: ExecuteCommands): Promise<ExecuteCommandsResult>;
    executeCommand(cmd: ExecuteCommand): Promise<ExecuteCommandResult>;
};

export interface Model {
    key: string, 
    provider: ModelProvider,
    name: string
};

export let ClaudeOpus4 = {
    key: "claude-opus-4",
    name: 'Claude Opus 4',
    provider: "anthropic" as ModelProvider
};

export let ClaudeSonnet4 = {
    key: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: "anthropic" as ModelProvider
};

export let ClaudeHaiku45 = {
    key: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    provider: "anthropic" as ModelProvider
};

export let Gemini3Pro = {
    key: "gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    provider: "google" as ModelProvider
};

export let Gemini3Flash = {
    key: "gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    provider: "google" as ModelProvider
};

export let Gemini2Pro = {
    key: "gemini-2-pro",
    name: "Gemini 2 Pro",
    provider: "google" as ModelProvider
};

export let Gemini25Flash = {
    key: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google" as ModelProvider
};

export let Gemini25FlashLite = {
    key: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "google" as ModelProvider
};

export const modelOptions: Map<string,Model> = new Map([
    ['claude-opus-4', ClaudeOpus4],
    ['claude-sonnet-4', ClaudeSonnet4],
    ['claude-haiku-4-5-20251001', ClaudeHaiku45],
    ['gemini-3-pro-preview', Gemini3Pro],
    ['gemini-3-flash-preview', Gemini3Flash],
    ['gemini-2-pro', Gemini2Pro],
    ['gemini-2.5-flash', Gemini25Flash],
    ['gemini-2.5-flash-lite', Gemini25FlashLite]
]);

export type DropdownItem = {
    key: string;
    label: string;
};

export type DropdownCategory = {
    items: DropdownItem[];
    label?: string;
};