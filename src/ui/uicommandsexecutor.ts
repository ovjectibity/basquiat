import { ExecuteCommand, ExecuteCommandResult,
    ExecuteCommands, ExecuteCommandsResult } from "../figmacommands";
import { CommandExecutor } from "../common";

export class FigmaPluginCommandsDispatcher implements CommandExecutor {
    private messageId: number = 0;
    private pendingRequests: Map<number, {
        resolve: (result: ExecuteCommandsResult) => void;
        reject: (error: Error) => void;
    }> = new Map();

    constructor() {
        // Listen for responses from the plugin
        window.addEventListener('message', (event) => {
            const msg = event.data.pluginMessage;
            if (msg && msg.type === 'execute_commands_result') {
                const pending = this.pendingRequests.get(msg.id);
                if (pending) {
                    pending.resolve(msg);
                    this.pendingRequests.delete(msg.id);
                }
            }
        });
    }

    executeCommands(cmds: ExecuteCommands): Promise<ExecuteCommandsResult> {
        return new Promise((resolve, reject) => {
            const id = this.messageId++;

            // Store the promise handlers
            this.pendingRequests.set(id, { resolve, reject });

            // Send message to plugin with the id
            const messageToSend: ExecuteCommands = {
                type: "execute_commands",
                id: id,
                cmds: cmds.cmds
            };

            parent.postMessage({
                pluginMessage: messageToSend
            }, '*');

            // Set timeout to reject after 30 seconds
            setTimeout(() => {
                const pending = this.pendingRequests.get(id);
                if (pending) {
                    pending.reject(new Error('Command execution timeout'));
                    this.pendingRequests.delete(id);
                }
            }, 30000);
        });
    }

    executeCommand(cmd: ExecuteCommand): Promise<ExecuteCommandResult> {
        // For single command, wrap it in executeCommands and extract the result
        return this.executeCommands({
            type: "execute_commands",
            id: cmd.id,
            cmds: [cmd]
        }).then((result) => {
            if (result.cmds.length > 0) {
                return result.cmds[0];
            }
            throw new Error('No command result returned');
        });
    }
}
