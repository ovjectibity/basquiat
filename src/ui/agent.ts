import { ModelMessage, 
    UserModelMessage, 
    AssistantModelMessage, 
    UserOutput, 
    FigmaDesignToolInput 
} from "../messages.js";
import type { CommandExecutor } from "../common.js";
import { ModelProvider, AnthropicModel, GoogleAIModel } from "./modelprovider.js";
import { prompts } from "../prompts.js";
import { ModelMode } from "../messages.js";

interface ProcessedModelOutput {
    userOutput: Array<UserOutput>,
    toolInput?: FigmaDesignToolInput
}

class FigmaAgentThread {
    messages: Array<ModelMessage>;
    executor: CommandExecutor;
    id: number;
    model?: ModelProvider;
    modelMode: ModelMode;
    userSurfacingCb: (msg: Array<UserOutput>) => void;
    status: "waiting-for-user" | "running" = "waiting-for-user";

    constructor(id: number, 
        modelMode: ModelMode,
        modelName: string,
        apiKey: string, 
        executor: CommandExecutor,
        userSurfacingCb: (msg: Array<UserOutput>) => void) {
        this.id = id;
        this.modelMode = modelMode;
        this.setupModel(modelMode, apiKey, modelName);
        this.executor = executor;
        this.messages = new Array();
        this.userSurfacingCb = userSurfacingCb;
    }

    updateModelKey(modelKey: string) {
        if(this.model) {
            this.model.updateModelKey(modelKey);
        } else {
            console.error(`No model object to update model key`);
        }
    }

    setupModel(modelMode: ModelMode, modelName: string, apiKey: string) {
        if(modelMode === "anthropic") {
            this.modelMode = modelMode;
            this.model = new AnthropicModel(
                modelName,apiKey,
                prompts.systemPrompt,
                {
                    figma: true
                });
        } else if(modelMode === "google") {
            this.modelMode = modelMode;
            this.model = 
                new GoogleAIModel(
                    modelName,
                    apiKey, 
                    prompts.systemPrompt, 
                    {
                        figma: true
                    });
        }
    }

    processModelOutput(modelOutput: AssistantModelMessage): ProcessedModelOutput
     {
        let userOutput: Array<UserOutput> = new Array();
        let toolInput: undefined | FigmaDesignToolInput = undefined;
        for(let content of modelOutput.contents) {
            if(content.type === "tool_use") {
                if(content.name === "figma-design-tool") {
                    toolInput = content.content.input;
                } else {
                    console.error(`Model tried invoking an unexpected tool ${content}`);
                }
            } else if(content.type === "assistant_workflow_instruction") {
                if(content.content === "stop") {
                    //TODO: Stop does nothing for now? 
                } else {
                    console.error(`Model invoked an unexpected workflow instruction ${content}`);
                }
            } else if(content.type === "user_output") {
                userOutput.push(content);
            }
        }
        return {
            userOutput: userOutput,
            toolInput: toolInput
        }
    }

    //TODO: Handle user interruptions: 
    async ingestUserInput(userMessage: UserModelMessage): Promise<void> {
        if(!this.model) {
            console.error(`User input being processed while model is not setup`);
        } else {
            this.messages.push(userMessage);
            this.status = "running";
            while(this.status === "running") {
                try {
                    const modelOutput = await this.model.ingestUserMessage(userMessage);
                    this.messages.push(modelOutput);
                    let processedOutput = this.processModelOutput(modelOutput);
                    this.userSurfacingCb(processedOutput.userOutput);
                    if(processedOutput.toolInput) {
                        let cmdsResult = await this.executor.executeCommands(
                            processedOutput.toolInput.commands);
                        userMessage = {
                            role: "user",
                            contents: [{
                                type: "tool_result",
                                name: "figma-design-tool",
                                content: cmdsResult
                            }]
                        };
                        this.messages.push(userMessage);
                    } else {
                        this.status = "waiting-for-user";
                        return Promise.resolve();
                    } 
                } catch(e) {
                    console.log(`Faced a failure ingesting user message ${userMessage} ${e}` + 
                        `Ignoring that like it never happened.`);
                    this.status = "waiting-for-user";
                    return Promise.resolve();
                }
            }
        }
    }
}

export { FigmaAgentThread };