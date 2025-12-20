export interface CreateRectangle {
  type: "create-rectangle"
}

export interface GetLayerVisual {
  type: "get-layer-visual"
}

export interface MoveLayer {
    type: "move-layer",
    x: number,
    y: number,
}

export interface ClosePlugin {
    type: "close_plugin"
}

export type Command = MoveLayer | GetLayerVisual | CreateRectangle | ClosePlugin;

export interface FigmaDesignToolEvokeStatus {
    status: "success" | "failure"
    errorReason?: string
}

export interface FigmaDesignToolResult {
    type: "figma_design_tool_result",
    content: FigmaDesignToolEvokeStatus
}

export type ToolResult = FigmaDesignToolResult;

export interface FigmaDesignToolInput {
    commands: Command[],
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