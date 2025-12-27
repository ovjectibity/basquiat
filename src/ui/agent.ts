import { ModelMessage, 
    UserModelMessage, 
    AssistantModelMessage, 
    UserOutput, 
    FigmaDesignToolInput 
} from "../messages.js";
import type { CommandExecutor } from "../common.js";
import { AnthropicModel } from "./modelprovider.js";
import { prompts } from "../prompts.js";

interface ProcessedModelOutput {
    userOutput: Array<UserOutput>,
    toolInput?: FigmaDesignToolInput
}

class FigmaAgentThread {
    messages: Array<ModelMessage>;
    executor: CommandExecutor;
    id: number;
    model: AnthropicModel;
    userSurfacingCb: (msg: Array<UserOutput>) => void;
    status: "waiting-for-user" | "running" = "waiting-for-user";

    constructor(id: number, 
        model: string,
        apiKey: string, 
        executor: CommandExecutor,
        userSurfacingCb: (msg: Array<UserOutput>) => void) {
        this.id = id;
        this.model = new AnthropicModel(
            model,apiKey,
            prompts.systemPrompt,
            {
                figma: true
            });
        this.executor = executor;
        this.messages = new Array();
        this.userSurfacingCb = userSurfacingCb;
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
        this.messages.push(userMessage);
        this.status = "running";
        while(this.status === "running") {
            const modelOutput = await this.model.ingestMessage(userMessage);
            this.messages.push(modelOutput);
            let processedOutput = await this.processModelOutput(modelOutput);
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
        }
    }
}

export { FigmaAgentThread };