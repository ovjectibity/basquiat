import Anthropic from "@anthropic-ai/sdk";
import { 
    ModelMessage,
    ModelMessageO, 
    FigmaDesignToolInput,
    UserModelMessage,
    AssistantModelMessage,
    AssistantModelMessageContents,
    ModelMode as ModelProviderName
} from "../messages.js";
import { ExecuteCommandResult } from "../figmacommands.js";
import { FunctionCallingConfigMode, GoogleGenAI, 
    Content as GoogleMessage, 
    Tool as GoogleTool,
    Part as GoogleMessageParams,
    FunctionResponsePart as GoogleToolImagesResponse
} from "@google/genai";
import { Tool as AnthTool } from "@anthropic-ai/sdk/resources";
import { FigmaDesignToolZ, FigmaDesignToolSchema, 
    FigmaDesignToolResponseSchema } from "../figmatoolschema.js";
import { AssistantModelMessageSchema, AssistantModelMessageZ } from "../messagesschema.js";
import { BetaContentBlockParam, 
    BetaMessageParam,
    BetaImageBlockParam as AnthropicToolImagesResponse 
} from "@anthropic-ai/sdk/resources/beta.mjs";

interface ModelProvider {
    type: ModelProviderName;
    maxTokens: number;
    ingestUserMessage(msg: UserModelMessage,
        abortSignal?: AbortSignal): Promise<AssistantModelMessage>;
    updateModelKey(modelKey: string): void;
    initialiseMessages(messages: Array<ModelMessage>): void;
}

interface ToolsConfig {
    figma: boolean
}

const defaultToolObjective = "Execute the user's requested design operation";

function normalizeToolArgs(args: unknown): unknown {
    if(args && typeof args === "object" && !Array.isArray(args)) {
        const maybeInput = args as Record<string, unknown>;
        if(typeof maybeInput.objective !== "string") {
            return {
                ...maybeInput,
                objective: defaultToolObjective
            };
        }
    }
    return args;
}

function normalizeAssistantTextContent(parsed: unknown): Array<AssistantModelMessageContents> | null {
    if(parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const maybeContent = parsed as Record<string, unknown>;
        if(maybeContent.type === "user_output" && typeof maybeContent.content === "string") {
            return [{
                type: "user_output",
                content: maybeContent.content
            }];
        }
        if(maybeContent.type === "assistant_workflow_instruction" && maybeContent.content === "stop") {
            return [{
                type: "assistant_workflow_instruction",
                content: "stop"
            }];
        }
    }

    if(Array.isArray(parsed)) {
        const normalized = new Array<AssistantModelMessageContents>();
        for(const item of parsed) {
            const itemNormalized = normalizeAssistantTextContent(item);
            if(itemNormalized && itemNormalized.length === 1) {
                normalized.push(itemNormalized[0]);
            } else {
                return null;
            }
        }
        return normalized.length > 0 ? normalized : null;
    }

    return null;
}

function parseAssistantTextBlock(textBlock: string): Array<AssistantModelMessageContents> {
    try {
        const parsed = JSON.parse(textBlock);
        const fullMessage = AssistantModelMessageZ.safeParse(parsed);
        if(fullMessage.success) {
            return fullMessage.data.contents as Array<AssistantModelMessageContents>;
        }

        const normalized = normalizeAssistantTextContent(parsed);
        if(normalized) {
            return normalized;
        }
    } catch (e) {
        throw new Error(`Assistant response is not valid JSON: ${e}`);
    }

    throw new Error(`Assistant response JSON does not match schema: ${textBlock}`);
}

class GoogleAIModel implements ModelProvider {
    type = "google" as ModelProviderName;
    maxTokens = 1024;
    googleMessages: Array<GoogleMessage>;
    modelName: string;
    modelClient: GoogleGenAI;
    systemPrompt: string;
    tools: ToolsConfig;
    
    constructor(
        modelName: string, 
        apiKey: string,
        systemPrompt: string, 
        tools: ToolsConfig) {
        this.googleMessages = new Array();
        this.systemPrompt = systemPrompt;
        this.modelName = modelName;
        this.tools = tools;
        this.modelClient = new GoogleGenAI({
            apiKey: apiKey
        });
    }

    updateModelKey(modelKey: string) {
        this.modelName = modelKey;
    }

    getTools(): Array<GoogleTool> {
        if(this.tools.figma) {
            // console.log(`Sending this schema to the Google model:`);
            // console.dir(FigmaDesignToolSchema);
            return [{
                functionDeclarations: [{
                    name: "figma-design-tool",
                    description: FigmaDesignToolZ.description,
                    parametersJsonSchema: FigmaDesignToolSchema,
                    responseJsonSchema: FigmaDesignToolResponseSchema
                }]
            }];
        } else return []; 
    }

    static translateToGoogleMessage(msg: ModelMessage): GoogleMessage {
        let params: Array<GoogleMessageParams> = new Array();
        for(const content of msg.contents) {
            if(content.type === "tool_use" || 
                content.type === "tool_use_invoke_error") {
                params.push({
                    functionCall: {
                        id: content.id,
                        name: content.name,
                        args: content.content as Record<string, any>
                    }
                });
            } else if(content.type === "user_input" || 
                content.type === "user_output" || 
                content.type === "agent_workflow_instruction" || 
                content.type === "assistant_workflow_instruction") {
                params.push({
                    text: JSON.stringify(content)
                });
            } else if(content.type === "tool_result") {
                let images = GoogleAIModel.extractImages(content.content.cmds);
                params.push({
                    functionResponse: {
                        id: content.content.id,
                        name: content.name,
                        response: content.content as Record<string, any>,
                        willContinue: false,
                        parts: images
                    }
                });
            }
        }
        return {
            role: msg.role,
            parts: params
        }
    }

    initialiseMessages(messages: Array<ModelMessage>) {
        for(let message of messages) {
            this.googleMessages.push(
                GoogleAIModel.translateToGoogleMessage(message));
        }
    }

    //TODO: Are we chunking & pushing the messages the 
    // same way as anthropic is sending to the model? 
    // messing this might affect the KV cache & bear much 
    // more cost
    processGoogleMessage(modelOutput: GoogleMessage): Promise<AssistantModelMessage> {
        let msg = new Array<AssistantModelMessageContents>();
        this.googleMessages.push(modelOutput); 
        if(modelOutput.parts) {
            for(let content of modelOutput.parts) {
                if(content.text) {
                    msg = msg.concat(parseAssistantTextBlock(content.text));
                }
                if(content.functionCall) {
                    if(content.functionCall.name === "figma-design-tool") {
                        //Validate the functional call here as FigmaDesignToolInput
                        const normalizedArgs = normalizeToolArgs(content.functionCall.args);
                        const validationResult = FigmaDesignToolZ.safeParse(normalizedArgs);
                        if(validationResult.success) {
                            let modifiedpv = validationResult.data as FigmaDesignToolInput;
                            msg.push({
                                type: "tool_use",
                                name: "figma-design-tool",
                                id: content.functionCall.id ? content.functionCall.id : "",
                                content: {
                                    input: modifiedpv
                                }
                            });
                        } else {
                            console.warn(`Model output tool call does not ` + 
                                `conform to the schema ${content.text}`);
                            //Instead of rejecting the promise, continue 
                            // processing & provide the feedback to model for recovery
                            msg.push({
                                type: "tool_use_invoke_error",
                                reason: "schema_violated",
                                id: content.functionCall.id ? content.functionCall.id : "",
                                name: "figma-design-tool",
                                content: {
                                    input: normalizedArgs
                                }
                            });
                        }
                    } else {
                        //Instead of rejecting the promise, continue 
                        // processing & provide the feedback to model for recovery
                        console.warn(`Model evoked an unexpected tool ${content}`);
                        msg.push({
                            type: "tool_use_invoke_error",
                            reason: "unexpected_tool_call",
                            id: content.functionCall.id ? content.functionCall.id : "",
                            name: "figma-design-tool",
                            content: {
                                input: normalizeToolArgs(content.functionCall.args)
                            }
                        });
                    }
                }
            }
            return Promise.resolve({
                role: "assistant",
                contents: msg
            });
        }
        else {
            return Promise.reject(
                new Error(`Did not find any parts in the modelOutput ${modelOutput}`));
        }
    }

    static extractImages(cmds: Array<ExecuteCommandResult>): 
    Array<GoogleToolImagesResponse> {
        let res = new Array();
        cmds.forEach(cmd => {
            if(cmd.visual) {
                res.push(
                    {
                        inlineData: {
                            mimeType: "image/png",
                            data: btoa(cmd.visual)
                        }
                    }
                );
            }
        });
        return res;
    }

    async ingestUserMessage(
        msg: UserModelMessage,
        abortSignal?: AbortSignal): Promise<AssistantModelMessage> {
        for(let content of msg.contents) {
            if(content.type === "tool_result") {
                let images = GoogleAIModel.extractImages(content.content.cmds);
                this.googleMessages.push({
                    role: msg.role,
                    parts: [{
                        functionResponse: {
                            id: content.content.id,
                            name: content.name,
                            //TODO: Check if this can be handled any better?
                            //Errors are already handled in FigmaDesignToolResult
                            response: content.content as Record<string, any>,
                            willContinue: false,
                            //Added images seperately if available
                            //TODO: Images are being loosely given currently, 
                            // without associating with cmd 
                            parts: images
                        }
                    }]
                });
            } else {
                this.googleMessages.push(
                    GoogleAIModel.translateToGoogleMessage(
                        msg as ModelMessageO));
            }
        }
        // console.dir(ModelMessageSchema);
        let modelOutput = await this.modelClient.models.generateContent({
            model: this.modelName,
            contents: this.googleMessages,
            config: {
                systemInstruction: this.systemPrompt,
                tools: this.getTools(),
                toolConfig: {
                    functionCallingConfig: {
                        mode: FunctionCallingConfigMode.VALIDATED
                    }
                },
                abortSignal: abortSignal
                // responseMimeType: "application/json",
                // responseJsonSchema: ModelMessageSchema
            }
        }); 
        console.debug(`Got this direct model output: ${modelOutput}`);
        console.dir(modelOutput, { depth: null });
        if(modelOutput.candidates && modelOutput.candidates[0] && 
            modelOutput.candidates[0].content) {
            let response = modelOutput.candidates[0].content;
            return this.processGoogleMessage(response);
        } else {
            return Promise.reject(new Error(`Recieved no candidates from the Google API ${modelOutput}`));
        }
    }
}

class AnthropicModel implements ModelProvider {
    type = "anthropic" as ModelProviderName;
    maxTokens = 1024;
    anthMessages: Array<BetaMessageParam>;
    modelName: string;
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
        this.modelName = model;
        this.tools = tools;
    }

    updateModelKey(modelKey: string) {
        this.modelName = modelKey;
    }

    static extractImages(cmds: Array<ExecuteCommandResult>): 
    Array<AnthropicToolImagesResponse> {
        let res = new Array();
        cmds.forEach(cmd => {
            if(cmd.visual) {
                let img: AnthropicToolImagesResponse = 
                {
                    type: "image",
                    source: {
                        data: btoa(cmd.visual),
                        media_type: 'image/png',
                        type: 'base64'
                    }
                }
                res.push(img);
            }
        });
        return res;
    }

    async ingestUserMessage(
        msg: UserModelMessage,
        abortSignal?: AbortSignal): Promise<AssistantModelMessage> {
        for(let content of msg.contents) {
            if(content.type === "tool_result") {
                let images = AnthropicModel.extractImages(content.content.cmds);
                this.anthMessages.push({
                    role: "user",
                    content: [{
                        tool_use_id: content.content.id,
                        type: "tool_result",
                        //TODO: Images are being loosely given currently, 
                        // without associating with cmd 
                        content: [{
                            type: "text",
                            //Errors are already handled in FigmaDesignToolResult
                            text: JSON.stringify(content.content)
                        },...images]
                    }]
                });
            } else {
                this.anthMessages.push(
                    AnthropicModel.translateToAnthMessage(
                        msg as ModelMessageO));
            }
        }
        let modelOutput = await this.modelClient.beta.messages.create({
            model: this.modelName,
            max_tokens: this.maxTokens,
            betas: ["structured-outputs-2025-11-13"],
            messages: this.anthMessages,
            system: this.systemPrompt,
            tools: this.getTools(),
            output_format: {
                type: "json_schema",
                schema: AssistantModelMessageSchema
            }
        },
        {
            signal: abortSignal
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

    //TODO: Are we chunking & pushing the messages the 
    // same way as anthropic is sending to the model? 
    // messing this might affect the KV cache & bear much 
    // more cost
    processAnthMessage(modelOutput: Array<BetaContentBlockParam>): 
    Promise<AssistantModelMessage> {
        let msg = new Array<AssistantModelMessageContents>(); 
        this.anthMessages.push({
            role: "assistant",
            content: modelOutput
        }); 
        for(let content of modelOutput) {
            if(content.type === "tool_use") {
                if(content.name === "figma-design-tool") {
                    //Validate the functional call here as FigmaDesignToolInput
                    const normalizedInput = normalizeToolArgs(content.input);
                    const validationResult = FigmaDesignToolZ.safeParse(normalizedInput);
                    if(validationResult.success) {
                        msg.push({
                            type: "tool_use",
                            name: "figma-design-tool",
                            id: content.id,
                            content: {
                                input: validationResult.data as FigmaDesignToolInput
                            }
                        });
                        // this.anthMessages.push({
                        //     role: "assistant",
                        //     content: [content]
                        // });
                    } else {
                        console.warn(`Model output tool call does not conform to the schema ${content}`);
                        msg.push({
                            type: "tool_use_invoke_error",
                            reason: "schema_violated",
                            id: content.id,
                            name: "figma-design-tool",
                            content: {
                                input: normalizedInput
                            }
                        });
                    }
                } else {
                    console.warn(`Model evoked an unexpected tool ${content}`);
                    msg.push({
                        type: "tool_use_invoke_error",
                        reason: "unexpected_tool_call",
                        id: content.id,
                        name: "figma-design-tool",
                        content: {
                            input: normalizeToolArgs(content.input)
                        }
                    });
                }
            } else if(content.type === "text") {
                msg = msg.concat(parseAssistantTextBlock(content.text));
            }
        }
        return Promise.resolve({
            role: "assistant",
            contents: msg
        });
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

    initialiseMessages(messages: Array<ModelMessage>) {
        for(let message of messages) {
            this.anthMessages.push(
                AnthropicModel.translateToAnthMessage(message));
        }
    }

    static translateToAnthMessage(msg: ModelMessage): BetaMessageParam {
        let contentBlocks: Array<BetaContentBlockParam> = new Array();
        for(const content of msg.contents) {
            if(content.type === "tool_use" || 
                content.type === "tool_use_invoke_error") {
                contentBlocks.push({
                    type: "tool_use",
                    id: content.id,
                    name: content.name,
                    input: content.content.input
                });
            } else if(content.type === "user_input" || 
                content.type === "user_output" || 
                content.type === "agent_workflow_instruction" || 
                content.type === "assistant_workflow_instruction") {
                contentBlocks.push({
                    type: "text",
                    text: JSON.stringify(content)
                });
            } else if(content.type === "tool_result") {
                let images = AnthropicModel.extractImages(content.content.cmds);
                contentBlocks.push({
                    tool_use_id: content.content.id,
                    type: "tool_result",
                    //TODO: Images are being loosely given currently, 
                    // without associating with cmd 
                    content: [{
                        type: "text",
                        //Errors are already handled in FigmaDesignToolResult
                        text: JSON.stringify(content.content)
                    },...images]
                });
            }
        }
        return {
            role: msg.role,
            content: contentBlocks
        }
    }
}

export { ModelProvider, ToolsConfig, AnthropicModel, GoogleAIModel }; 
