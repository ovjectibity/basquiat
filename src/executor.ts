import { ExecuteCommand, ExecuteCommandResult,
    ExecuteCommands, ExecuteCommandsResult } from "./messages";

interface CommandExecutor {
    executeCommands(cmds: ExecuteCommands): Promise<ExecuteCommandsResult>;
    executeCommand(cmd: ExecuteCommand): Promise<ExecuteCommandResult>;
}

class FigmaPluginCommandsDispatcher implements CommandExecutor {
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

class FigmaExecutor implements CommandExecutor {
    async executeCommands(executeCommands: ExecuteCommands): Promise<ExecuteCommandsResult> {
        const results: ExecuteCommandResult[] = [];
        let hasFailures = false;
        let allFailed = true;

        try {
            for (const executeCmd of executeCommands.cmds) {
                const result = await this.executeCommand(executeCmd);
                results.push(result);

                if (result.status === "failure") {
                    hasFailures = true;
                } else {
                    allFailed = false;
                }
            }

            return {
                type: "execute_commands_result",
                id: executeCommands.id,
                cmds: results,
                status: allFailed ? "failure" : (hasFailures ? "partial_failures" : "success")
            };
        } catch (error) {
            return {
                type: "execute_commands_result",
                id: executeCommands.id,
                cmds: results,
                status: "failure"
            };
        }
    }

    async executeCommand(executeCmd: ExecuteCommand): Promise<ExecuteCommandResult> {
        const cmd = executeCmd.cmd;

        try {
            switch (cmd.type) {
                case "create-rectangle": {
                    const rect = figma.createRectangle();
                    rect.x = cmd.x;
                    rect.y = cmd.y;
                    rect.resize(cmd.width, cmd.height);

                    if (cmd.fill) {
                        const rgb = this.hexToRgb(cmd.fill);
                        if (rgb) {
                            rect.fills = [{
                                type: 'SOLID',
                                color: { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 }
                            }];
                        }
                    }

                    figma.currentPage.appendChild(rect);
                    return {
                        type: "execute_command_result",
                        id: executeCmd.id,
                        cmd: cmd,
                        status: "success"
                    };
                }
                case "get-layer-visual": {
                    let node: SceneNode | null = null;
                    if (cmd.layerId) {
                        const foundNode = figma.currentPage.findOne(n => n.id === cmd.layerId);
                        if (foundNode) {
                            node = foundNode;
                        }
                    } else {
                        const selection = figma.currentPage.selection;
                        if (selection.length > 0) {
                            node = selection[0];
                        }
                    }
                    if (!node) {
                        return {
                            type: "execute_command_result",
                            id: executeCmd.id,
                            cmd: cmd,
                            status: "failure"
                        };
                    }
                    let image = await node.exportAsync({ format: 'PNG' });
                    const base64Image = this.uint8ArrayToBase64(image);
                    return {
                        type: "execute_command_result",
                        id: executeCmd.id,
                        cmd: cmd,
                        status: "success",
                        visual: base64Image
                    };
                }
                default:
                    return {
                        type: "execute_command_result",
                        id: executeCmd.id,
                        cmd: cmd,
                        status: "failure"
                    };
            }
        } catch (error) {
            return {
                type: "execute_command_result",
                id: executeCmd.id,
                cmd: cmd,
                status: "failure"
            };
        }
    }

    private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    private uint8ArrayToBase64(bytes: Uint8Array): string {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}

export type { CommandExecutor };
export { FigmaExecutor, FigmaPluginCommandsDispatcher };