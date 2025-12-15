export interface CreateRectangle {
  type: "create-rectangle"
}

export interface GetLayerVisual {
  type: "create-rectangle"
}

export interface MoveLayer {
    type: "move-layer",
    x: number,
    y: number,
}

export interface IssueCommandResult {
    type: "issue_command_result",
    content: string
}

export interface UserInput {
    type: "user_input",
    content: string
}

export interface IssueCommand {
    type: "issue_command",
    content: string
}

export interface UserOutput {
    type: "user_output",
    content: string
}

export interface UserModelMessage {
    role: "user",
    message: IssueCommandResult | UserInput
}

export interface AssistantModelMessage {
    role: "assistant",
    type: UserOutput | IssueCommand
}

export interface ClosePlugin {
    type: "close_plugin"
}

// Message types for type safety
export type Commands = GetLayerVisual | CreateRectangle | ClosePlugin;