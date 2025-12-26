import { ModelMessage, 
    UserModelMessage, 
    AssistantModelMessage, 
    UserOutput} from "../messages.js";
import type { CommandExecutor } from "../common.js";
import { AnthropicModel } from "./modelprovider.js";
import { prompts } from "../prompts.js";

class FigmaAgentThread {
    messages: Array<ModelMessage>;
    executor: CommandExecutor;
    id: number;
    model: AnthropicModel;
    userSurfacingCb: (msg: Array<UserOutput>) => void;

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

    /** Only surface assistant messages to be consumed by the user */
    async processModelOutput(modelOutput: AssistantModelMessage): 
    Promise<Array<UserOutput>> {
        let output: Array<Promise<UserOutput> | UserOutput> = new Array();
        for(let content of modelOutput.contents) {
            if(content.type === "tool_use") {
                if(content.name === "figma-design-tool") {
                    let cmdsResult = await this.executor.executeCommands(
                        content.content.input.commands);
                    const userMsg: UserModelMessage = {
                        role: "user",
                        contents: [{
                            type: "tool_result",
                            name: "figma-design-tool",
                            content: cmdsResult
                        }]
                    };
                    this.messages.push(userMsg);
                    const toolresult = await this.model.ingestMessage(userMsg);
                    this.messages.push(toolresult);
                    let toolResultResponse = await this.processModelOutput(toolresult);
                    output = output.concat(toolResultResponse);
                } else {
                    output.push(Promise.reject(new Error(`Unexpected tool invoked by the model ${content}`)));
                }
            } else if(content.type === "assistant_workflow_instruction") {
                if(content.content === "stop") {
                    //TODO: Stop does nothing for now? 
                } else {
                    output.push(Promise.reject(
                        new Error(`Model returned workflow_instruction` + 
                            ` other than stop: ${content}`)));
                }
            } else if(content.type === "user_output") {
                output.push(content);
            }
        }
        return Promise.all(output);
    }

    async ingestUserInput(userMessage: UserModelMessage) {
        this.messages.push(userMessage);
        const modelOutput = await this.model.ingestMessage(userMessage);
        //Perform this push directly within the processModelOutput method?
        this.messages.push(modelOutput);
        let userOutput = await this.processModelOutput(modelOutput);
        this.userSurfacingCb(userOutput);
    }
}

export { FigmaAgentThread };