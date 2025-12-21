import Anthropic from "@anthropic-ai/sdk";
import { ModelMessage, 
    UserModelMessage, 
    FigmaDesignToolInput,
    AssistantModelMessageO } from "../messages.js";
import type { CommandExecutor } from "../common.js";
import { Tool as AnthTool } from "@anthropic-ai/sdk/resources";
import { BetaContentBlockParam, BetaMessageParam } from "@anthropic-ai/sdk/resources/beta.mjs";
import { FigmaDesignToolZ, FigmaDesignToolSchema } from "../figmatoolschema.js";
import { ModelMessageZ, AssistantModelMessageSchema } from "../messagesschema.js";
import { prompts } from "../prompts.js";

class FigmaAgentThread {
    maxTokens = 1024;
    model: string;
    modelClient: Anthropic;
    messages: Array<ModelMessage>;
    anthMessages: Array<BetaMessageParam>;
    executor: CommandExecutor;
    running: boolean = false;
    id: number;
    userSurfaceCallback: (msg: string) => Promise<void>;

    constructor(id: number, model: string, 
        apiKey: string, 
        executor: CommandExecutor,
        userSurfaceCb: (msg: string) => Promise<void>) {
        this.id = id;
        this.model = model;
        this.modelClient = new Anthropic({
            apiKey: apiKey,
            dangerouslyAllowBrowser: true
        });
        this.executor = executor;
        this.messages = new Array();
        this.anthMessages = new Array();
        this.userSurfaceCallback = userSurfaceCb;
    }

    static getTools(): Array<AnthTool> {
        return [{
            type: "custom",
            description: FigmaDesignToolZ.description,
            input_schema: FigmaDesignToolSchema,
            name: "figma-design-tool"
        }];
    }

    static translateToAnthMessage(msg: ModelMessage): BetaMessageParam {
        let contentBlocks: Array<BetaContentBlockParam> = new Array();
        for(const content of msg.contents) {
            contentBlocks.push({
                type: "text",
                text: JSON.stringify(content)
            });
        }
        return {
            role: msg.role,
            content: contentBlocks
        }
    }

    async evokeModel(): Promise<void> {
        const modelOutput = await this.modelClient.beta.messages.create({
            model: this.model,
            max_tokens: this.maxTokens,
            betas: ["structured-outputs-2025-11-13"],
            messages: this.anthMessages,
            system: prompts.system_prompt,
            tools: FigmaAgentThread.getTools(),
            output_format: {
                type: "json_schema",
                schema: AssistantModelMessageSchema
            }
        });
        console.debug(`Got this direct model output: ${modelOutput}`);
        console.dir(modelOutput, { depth: null });
        if(modelOutput.stop_reason === "end_turn" || 
            modelOutput.stop_reason === "tool_use") {
            return this.processModelOutput(modelOutput.content);
        } else {
            return Promise.reject(new Error(`Recieved an unexpected stop ` + 
                `reason from the model ${modelOutput.stop_reason}`));
        }
    }

    async processModelOutput(modelOutput: Array<BetaContentBlockParam>): Promise<any> {
        let output: Array<Promise<void>> = new Array();
        for(let content of modelOutput) {
            if(content.type === "tool_use") {
                this.messages.push({
                    role: "assistant",
                    contents: [{
                        type: "tool_use",
                        name: "figma-design-tool",
                        content: {
                            input: content.input as FigmaDesignToolInput
                        }
                    }]
                });
                this.anthMessages.push({
                    role: "user",
                    content: [content]
                });
                if(content.name === "figma-design-tool") {
                    let id = content.id;
                    let input = content.input as FigmaDesignToolInput;
                    let cmdsResult = await this.executor.executeCommands(input.commands);
                    this.messages.push({
                        role: "user",
                        contents: [{
                            type: "tool_result",
                            name: "figma-design-tool",
                            content: cmdsResult
                        }]
                    });
                    this.anthMessages.push({
                        role: "user",
                        content: [{
                            tool_use_id: id,
                            type: "tool_result",
                            content: [{
                                type: "text",
                                text: JSON.stringify(cmdsResult)
                            }]
                        }]
                    });
                    return this.evokeModel();
                } else {
                    output.push(Promise.reject(new Error(`Unexpected tool invoked by the model ${content}`)));
                }
            } else if(content.type === "text") {
                try {
                    let modifiedp: any = JSON.parse(content.text);
                    // Validate using Zod
                    const validationResult = ModelMessageZ.safeParse(modifiedp);
                    if(validationResult.success) {
                        // console.log("Model output conforms to the schema, got this messages array: ",
                        // modifiedp.messages);
                        let modifiedpv = modifiedp as AssistantModelMessageO;
                        this.messages.push(modifiedpv);
                        this.anthMessages.push(FigmaAgentThread.translateToAnthMessage(modifiedpv));
                        //TODO: Handle text to be surfaced to the user & that to be consumed by the agent 
                        for(let mmContent of modifiedpv.contents) {
                            if(mmContent.type === "user_output") {
                                this.userSurfaceCallback(content.text);
                            } else if(mmContent.type === "workflow_instruction") {
                                if(mmContent.content === "stop") {
                                    output.push(Promise.resolve());
                                } else {
                                    output.push(Promise.reject(
                                        new Error(`Model returned workflow_instruction` + 
                                            ` other than stop: ${content}`)));
                                }
                            }
                        }
                    } else {
                        console.log("Model output message does not conform to the schema");
                        console.log("Validation errors:", validationResult.error);
                        console.log(`Received data: ${content.text}`);
                    }
                } catch(e) {
                    console.log(`Parsing model output as JSON probably failed. Got LLM output ${content.text}`);
                    output.push(Promise.reject(new Error(`Error when processing LLM response ${e}`)));
                }
            } else if(content.type === "thinking") {

            } else {

            }
        }
        return Promise.all(output);
    }

    async ingestUserInput(userMessage: UserModelMessage): Promise<void> {
        if(this.running) {
            console.warn(`User messages when the model is running currently not supported. ` + 
                `Ignoring this ${userMessage}`);
        } else {
            this.messages.push(userMessage);
            this.anthMessages.push(FigmaAgentThread.translateToAnthMessage(userMessage));
            const modelOutput = await this.modelClient.beta.messages.create({
                model: this.model,
                max_tokens: this.maxTokens,
                betas: ["structured-outputs-2025-11-13"],
                messages: this.anthMessages,
                system: prompts.system_prompt,
                tools: FigmaAgentThread.getTools(),
                output_format: {
                    type: "json_schema",
                    schema: AssistantModelMessageSchema
                }
            });
            console.debug(`Got this direct model output: ${modelOutput}`);
            console.dir(modelOutput, { depth: null });
            if(modelOutput.stop_reason === "end_turn" || 
                modelOutput.stop_reason === "tool_use") {
                return this.processModelOutput(modelOutput.content);
            } else {
                return Promise.reject(new Error(`Recieved an unexpected stop ` + 
                    `reason from the model ${modelOutput.stop_reason}`));
            }
        }
    }
}

export { FigmaAgentThread };