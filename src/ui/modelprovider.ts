import Anthropic from "@anthropic-ai/sdk";
import { ModelMessage,
    ModelMessageO, 
    FigmaDesignToolInput,
    AssistantModelMessageO, 
    UserModelMessage,
    AssistantModelMessage,
    AssistantModelMessageContents} from "../messages.js";
import { GoogleGenAI } from "@google/genai";
import { Tool as AnthTool } from "@anthropic-ai/sdk/resources";
import { FigmaDesignToolZ, FigmaDesignToolSchema } from "../figmatoolschema.js";
import { AssistantModelMessageSchema } from "../messagesschema.js";
import { BetaContentBlockParam, BetaMessageParam } from "@anthropic-ai/sdk/resources/beta.mjs";

interface ModelProvider {
    type: string;
    maxTokens: number;
    ingestMessage(msg: ModelMessage): Promise<ModelMessage>;
}

interface ToolsConfig {
    figma: boolean
}

class GoogleAIModels implements ModelProvider {
    type = "google";
    maxTokens = 1024;
    googleMessages: Array<number>;
    model: string;
    modelClient: Anthropic;
    systemPrompt: string;
    tools: ToolsConfig;
    
    constructor(
        model: string, 
        apiKey: string,
        systemPrompt: string, 
        tools: ToolsConfig) {
        this.googleMessages = new Array();
        this.modelClient = new Anthropic({
            apiKey: apiKey,
            dangerouslyAllowBrowser: true
        });
        this.systemPrompt = systemPrompt;
        this.model = model;
        this.tools = tools;
    }

    ingestMessage(msg: ModelMessage): Promise<ModelMessage> {

    }
}

class AnthropicModel implements ModelProvider {
    type = "anthropic";
    maxTokens = 1024;
    anthMessages: Array<BetaMessageParam>;
    model: string;
    modelClient: Anthropic;
    systemPrompt: string;
    tools: ToolsConfig;
    
    constructor(
        model: string, 
        apiKey: string,
        systemPrompt: string, 
        tools: ToolsConfig) {
        this.anthMessages = new Array();
        this.modelClient = new Anthropic({
            apiKey: apiKey,
            dangerouslyAllowBrowser: true
        });
        this.systemPrompt = systemPrompt;
        this.model = model;
        this.tools = tools;
    }

    async ingestMessage(msg: UserModelMessage): Promise<AssistantModelMessage> {
        for(let content of msg.contents) {
            if(content.type === "tool_result") {
                this.anthMessages.push({
                    role: "user",
                    content: [{
                        tool_use_id: content.content.id,
                        type: "tool_result",
                        content: [{
                            type: "text",
                            text: JSON.stringify(content.content.cmds)
                        }]
                    }]
                });
            } else {
                this.anthMessages.push(
                    AnthropicModel.translateToAnthMessage(
                        msg as ModelMessageO));
            }
        }
        let modelOutput = await this.modelClient.beta.messages.create({
            model: this.model,
            max_tokens: this.maxTokens,
            betas: ["structured-outputs-2025-11-13"],
            messages: this.anthMessages,
            system: this.systemPrompt,
            tools: this.getTools(),
            output_format: {
                type: "json_schema",
                schema: AssistantModelMessageSchema
            }
        });
        console.debug(`Got this direct model output: ${modelOutput}`);
        console.dir(modelOutput, { depth: null });
        if(modelOutput.stop_reason === "end_turn" || 
            modelOutput.stop_reason === "tool_use") {
            return this.processAnthMessage(modelOutput.content);
        } else {
            return Promise.reject(new Error(`Recieved an unexpected stop ` + 
                `reason from the model ${modelOutput.stop_reason}`));
        }
    }

    async processAnthMessage(modelOutput: Array<BetaContentBlockParam>): Promise<AssistantModelMessage> {
        let msg = new Array<AssistantModelMessageContents>(); 
        for(let content of modelOutput) {
            if(content.type === "tool_use") {
                msg.push({
                    type: "tool_use",
                    name: "figma-design-tool",
                    content: {
                        input: content.input as FigmaDesignToolInput
                    }
                });
                this.anthMessages.push({
                    role: "user",
                    content: [content]
                });
            } else if(content.type === "text") {
                try {
                    let modifiedp: any = JSON.parse(content.text);
                    // Validate using Zod
                    const validationResult = AssistantModelMessageSchema.safeParse(modifiedp);
                    if(validationResult.success) {
                        // console.log("Model output conforms to the schema, got this messages array: ",
                        // modifiedp.messages);
                        let modifiedpv = modifiedp as AssistantModelMessageO;
                        this.anthMessages.push(AnthropicModel.translateToAnthMessage(modifiedpv));
                        msg = msg.concat(modifiedpv.contents);
                    } else {
                        console.warn("Model output message does not conform to the schema");
                        return Promise.reject(
                            new Error(`Validation errors:, validationResult.error Received data: ${content.text}`));
                    }
                } catch(e) {
                    console.log(`Parsing model output as JSON probably failed. Got LLM output ${content.text}`);
                    return Promise.reject(new Error(`Error when processing LLM response ${e}`));
                }
            }
        }
        return {
            role: "assistant",
            contents: msg
        }
    }

    getTools(): Array<AnthTool> {
        if(this.tools.figma) {
            return [{
                type: "custom",
                description: FigmaDesignToolZ.description,
                input_schema: FigmaDesignToolSchema,
                name: "figma-design-tool"
            }];
        } else return [];  
    }

    static translateToAnthMessage(msg: ModelMessageO): BetaMessageParam {
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
}

export { ModelProvider, ToolsConfig, AnthropicModel }; 
