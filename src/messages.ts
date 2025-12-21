export interface CreateRectangle {
  type: "create-rectangle"
  x: number
  y: number
  width: number
  height: number
  fill?: string
}

export interface GetLayerVisual {
  type: "get-layer-visual"
  layerId?: string
}

export interface MoveLayer {
    type: "move-layer",
    layerId: string,
    x: number,
    y: number,
}

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

export interface ExecuteCommand {
    type: "execute_command",
    id: number, 
    cmd: Command
}

export interface ExecuteCommands {
    type: "execute_commands",
    id: number, 
    cmds: ExecuteCommand[]
}

export interface ExecuteCommandResult {
    type: "execute_command_result",
    cmd: Command,
    id: number,
    status: "success" | "failure",
    visual?: string
}

export interface ExecuteCommandsResult {
    type: "execute_commands_result",
    cmds: ExecuteCommandResult[],
    id: number,
    status: "success" | "failure" | "partial_failures"
}

export type Command = 
    MoveLayer | GetLayerVisual | CreateRectangle | ClosePlugin;

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
    type: "workflow_instruction",
    content: "stop"
}

export interface AgentWorkflowInstruction {
    type: "workflow_instruction",
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