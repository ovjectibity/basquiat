import { 
    ExecuteCommands, ExecuteCommandsResult
} from "./figmacommands.js";

export type ModelMode = "anthropic" | "google" | "not-set";

export interface Thread {
    id: number, 
    title: string, 
    msgs: ModelMessage[],
    modelMode: ModelMode,
    lastModelUsed: string
}

export type ThreadBase = Omit<Thread,"msgs">;

export interface ClosePlugin {
    type: "close_plugin"
}

export interface GetApiKeys {
    type: "get_api_keys"
}

export interface SetApiKeys {
    type: "set_api_keys",
    anthropicKey?: string,
    googleKey?: string
}

export interface GetApiKeysResponse {
    type: "get_api_keys_response",
    anthropicKey?: string,
    googleKey?: string
}

export interface GetThreadsList {
    type: "get_threads_list"
}

export interface GetThreadsListResponse {
    type: "get_threads_list_response",
    threads: Array<ThreadBase>
}

export interface GetThreads {
    type: "get_threads",
    ids: Array<number>
}

export interface GetThreadsResponse {
    type: "get_threads_response",
    threads: Array<Thread>
}

export interface SaveThreads {
    //Any thread returned here with an 
    // existing id will be replaced 
    type: "save_threads",
    threads: Array<Thread>,
    id: number
}

export interface SaveThreadsResponse {
    id: number, 
    type: "save_threads_response"
}

export type UIDispatchedMessage = 
    GetApiKeys | SetApiKeys | 
    ClosePlugin | ExecuteCommands | 
    GetThreadsList | GetThreads | 
    SaveThreads;
export type PluginDispatchedMessage = 
    GetApiKeysResponse | ExecuteCommandsResult | 
    GetThreadsListResponse | GetThreadsResponse;

export interface FigmaDesignToolResult {
    type: "tool_result",
    name: "figma-design-tool"
    id: string,
    content: ExecuteCommandsResult
}

export type ToolResult = FigmaDesignToolResult;

export interface FigmaDesignToolInput {
    commands: ExecuteCommands,
    objective: string
}

export interface FigmaDesignToolUse {
    type: "tool_use",
    name: "figma-design-tool",
    id: string,
    content: {
        input: FigmaDesignToolInput
    }
}

export type ToolUse = FigmaDesignToolUse;

export interface FigmaToolUseInvokeError {
    type: "tool_use_invoke_error"
    reason: "schema_violated" | "unexpected_tool_call",
    name: "figma-design-tool",
    id: string,
    content: {
        input: unknown
    } 
}

export type ToolUseInvokeError = FigmaToolUseInvokeError;

export interface UserInput {
    type: "user_input",
    content: string
}

export interface AssistantWorkflowInstruction {
    type: "assistant_workflow_instruction",
    content: "stop"
}

export interface AgentWorkflowInstruction {
    type: "agent_workflow_instruction",
    content: string
}

export interface UserOutput {
    type: "user_output",
    content: string
}

export type UserModelMessageContents = UserInput | AgentWorkflowInstruction | ToolResult;
export type AssistantModelMessageContents = UserOutput | AssistantWorkflowInstruction | ToolUse | ToolUseInvokeError;

export type UserModelMessageContentsO = Exclude<UserModelMessageContents,ToolResult>;
export type AssistantModelMessageContentsO = Exclude<AssistantModelMessageContents,ToolUse | ToolUseInvokeError>;

export interface UserModelMessage {
    role: "user",
    contents: Array<UserModelMessageContents>
}

export interface UserModelMessageO {
    role: "user",
    contents: Array<UserModelMessageContentsO>
}

export interface AssistantModelMessage {
    role: "assistant",
    contents: Array<AssistantModelMessageContents>
}

export interface AssistantModelMessageO {
    role: "assistant",
    contents: Array<AssistantModelMessageContentsO>
}

export type ModelMessage = UserModelMessage | AssistantModelMessage;
export type ModelMessageO = UserModelMessageO | AssistantModelMessageO;