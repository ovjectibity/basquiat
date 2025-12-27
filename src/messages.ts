import { 
    ExecuteCommands, ExecuteCommandsResult
} from "./figmacommands.js";

export interface ClosePlugin {
    type: "close_plugin"
}

export interface GetApiKey {
    type: "get_api_key"
}

export interface SetApiKey {
    type: "set_api_key"
    apiKey: string
}

export interface GetApiKeyResponse {
    type: "get_api_key_response"
    apiKey: string | null
}

export type UIDispatchedMessage = 
    GetApiKey | SetApiKey | 
    ClosePlugin | ExecuteCommands;
export type PluginDispatchedMessage = 
    GetApiKeyResponse | ExecuteCommandsResult;

export interface FigmaDesignToolResult {
    type: "tool_result",
    name: "figma-design-tool"
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
    content: {
        input: FigmaDesignToolInput
    }
}

export type ToolUse = FigmaDesignToolUse;

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
export type AssistantModelMessageContents = UserOutput | AssistantWorkflowInstruction | ToolUse;

export type UserModelMessageContentsO = Exclude<UserModelMessageContents,ToolResult>;
export type AssistantModelMessageContentsO = Exclude<AssistantModelMessageContents,ToolUse>;

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