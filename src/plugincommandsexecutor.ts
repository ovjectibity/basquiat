import { ExecuteCommand, ExecuteCommandResult,
    ExecuteCommands, ExecuteCommandsResult } from "./figmacommands";
import { CommandExecutor } from "./common";

export class FigmaExecutor implements CommandExecutor {
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
