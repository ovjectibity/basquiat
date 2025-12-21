import { ExecuteCommand, ExecuteCommandResult,
    ExecuteCommands, ExecuteCommandsResult } from "./messages";

export interface CommandExecutor {
    executeCommands(cmds: ExecuteCommands): Promise<ExecuteCommandsResult>;
    executeCommand(cmd: ExecuteCommand): Promise<ExecuteCommandResult>;
}
