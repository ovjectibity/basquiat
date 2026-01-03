import { ModelMessage, 
    UserModelMessage, 
    AssistantModelMessage, 
    UserOutput, 
    FigmaDesignToolUse, 
    ToolUseInvokeError
} from "../messages.js";
import type { CommandExecutor } from "../common.js";
import { ModelProvider, AnthropicModel, GoogleAIModel } from "./modelprovider.js";
import { prompts } from "../prompts.js";
import { ModelMode } from "../messages.js";

interface ProcessedModelOutput {
    userOutput: Array<UserOutput>,
    toolInput: Array<FigmaDesignToolUse | ToolUseInvokeError>
}

type AgentToolConsentLevel = "ask" | "auto-approve";
type AgentState = "need-user-consent" | "waiting-for-user" | "running";
type UserToolConsentResponse = "user-consented" | "user-rejected";

class FigmaAgentThread {
    messages: Array<ModelMessage>;
    executor: CommandExecutor;
    id: number;
    model?: ModelProvider;
    modelMode: ModelMode;
    userSurfacingCb: (msg: Array<UserOutput>) => void;
    status: AgentState = "waiting-for-user";
    private consentLevel: AgentToolConsentLevel = "ask";
    private turn: null | AsyncGenerator<AgentState,void,UserToolConsentResponse> = null;

    constructor(id: number, 
        modelMode: ModelMode,
        modelName: string,
        apiKey: string, 
        executor: CommandExecutor,
        userSurfacingCb: (msg: Array<UserOutput>) => void) {
        this.id = id;
        this.modelMode = modelMode;
        this.setupModel(modelMode, modelName, apiKey);
        this.executor = executor;
        this.messages = new Array();
        this.userSurfacingCb = userSurfacingCb;
    }

    updateConsent(newConsent: AgentToolConsentLevel) {
        this.consentLevel = newConsent;
    }

    updateModelKey(modelKey: string) {
        if(this.model) {
            this.model.updateModelKey(modelKey);
        } else {
            console.error(`No model object to update model key`);
        }
    }

    setupModel(modelMode: ModelMode, modelName: string, apiKey: string) {
        console.log(`Using the following apiKey for setupModel ${apiKey}`);
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
        let toolInput: Array<FigmaDesignToolUse | ToolUseInvokeError> = new Array();
        for(let content of modelOutput.contents) {
            if(content.type === "tool_use") {
                if(content.name === "figma-design-tool") {
                    toolInput.push(content);
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
            } else if(content.type === "tool_use_invoke_error") {
                toolInput.push(content);
            }
        }
        return {
            userOutput: userOutput,
            toolInput: toolInput
        }
    }

    isTurnActive(): boolean {
        return this.turn !== null ? true : false;
    }

    async provideUserConsentResponse(consentResponse: UserToolConsentResponse): 
    Promise<AgentState> {
        if(!this.turn) {
            throw new Error(`There's no active turn; doing nothing`);
        } else {
            while(true) {
                let res = await this.turn.next(consentResponse);
                if(res.done) {
                    console.log(`Ending the active agent turn now ${res}`);
                    console.dir(res);
                    this.turn = null;
                    return "waiting-for-user";
                } else if(res.value === "running") {
                    console.log(`Allowing further run in provideUserConsentResponse`);
                } else if(res.value === "need-user-consent") {
                    return res.value as AgentState;
                } else {
                    console.error(`Unexpected value in provideUserConsentResponse`);
                    console.dir(res);
                }
            }
        }
    }

    async runTurn(userMessage: UserModelMessage): 
    Promise<AgentState> {
        if(this.turn) {
            throw new Error(`There's already an active turn; doing nothing`);
        } else {
            this.turn = this.ingestUserInput(userMessage);
            while(true) {
                let res = await this.turn.next();
                if(res.done) {
                    console.log(`Ending the active agent turn now ${res}`);
                    console.dir(res);
                    this.turn = null;
                    return "waiting-for-user";
                } else if(res.value === "running") {
                    console.log(`Allowing further run in runTurn`);
                } else if(res.value === "need-user-consent") {
                    return res.value as AgentState;
                } else {
                    console.error(`Unexpected value in runTurn`);
                    console.dir(res);
                }
            }
        }
    }

    async cancelTurn() {
        if(this.turn) {
            console.log(`Cancelling ongoing turn`);
            //TODO: BUG HERE: the cancelling doesn't seem to work 
            // Currently pending model calls are orphaned
            let retStatus = await this.turn.return();
            console.log(`Got this retStatus: ${retStatus}`);
            console.dir(retStatus);
            this.status = "waiting-for-user";
            this.turn = null;
        } else {
            console.error(`cancelTurn called without active turn`);
        }
    }

    //TODO: This can probably be made more elegant 
    // using generator pattern better
    //Generator being used here only for user consent
    private async *ingestUserInput(userMessage: UserModelMessage): 
    AsyncGenerator<AgentState,void,UserToolConsentResponse> {
        if(!this.model) {
            console.error(`User input being processed while model is not setup`);
        } else {
            this.messages.push(userMessage);
            this.status = "running";
            while(this.status === "running") {
                try {
                    const modelOutput = 
                        await this.model.ingestUserMessage(userMessage);
                    this.messages.push(modelOutput);
                    //Yielding for correct handling of the cancelTurn behavior
                    yield "running";
                    let processedOutput = 
                        this.processModelOutput(modelOutput);
                    //Surfacing the messages to the user for display
                    this.userSurfacingCb(processedOutput.userOutput);
                    if(processedOutput.toolInput && 
                        processedOutput.toolInput.length > 0) {
                        for(let input of processedOutput.toolInput) {
                            if(input.type === "tool_use_invoke_error") {
                                console.log(`Not invoking tool given there's an error in the call ${input}`);
                                console.dir(input);
                                userMessage = {
                                    role: "user",
                                    contents: [{
                                        type: "tool_result",
                                        name: "figma-design-tool",
                                        id: input.id,
                                        content: {
                                            type: "execute_commands_result",
                                            cmds: [],
                                            id: input.id,
                                            status: "failure",
                                            error: input.reason === "schema_violated" ? 
                                                prompts.toolSchemaViolation : prompts.wrongToolCalled
                                        }
                                    }]
                                };
                                this.messages.push(userMessage);
                            } else {
                                console.log(`Commands evoked by the model:`);
                                console.dir(input); 
                                let userConsent = true;
                                if(this.consentLevel === "ask") {
                                    console.log(`Yielding ingestUserInput to get ` + 
                                        `user consent for commands`);
                                    let userConsentResponse = yield "need-user-consent";
                                    userConsent = userConsentResponse === "user-consented" ? 
                                                true : false;
                                }
                                if(userConsent) {
                                    console.log(`Executing commands now given user consent`);
                                    let cmdsResult = await this.executor.executeCommands(input.content.input.commands);
                                    console.log(`Got this result from executing commands:`);
                                    console.dir(cmdsResult);
                                    yield "running";
                                    userMessage = {
                                        role: "user",
                                        contents: [{
                                            type: "tool_result",
                                            name: "figma-design-tool",
                                            id: input.id,
                                            content: cmdsResult
                                        }]
                                    };
                                    this.messages.push(userMessage);
                                } else {
                                    console.log(`Not executing commands given user consent wasn't provided`);
                                    userMessage = {
                                        role: "user",
                                        contents: [{
                                            type: "tool_result",
                                            name: "figma-design-tool",
                                            id: input.id,
                                            content: {
                                                type: "execute_commands_result",
                                                cmds: [],
                                                id: input.id,
                                                status: "failure",
                                                error: "User did not provide consent to run the tool call"
                                            }
                                        }]
                                    };
                                    this.messages.push(userMessage);
                                    //TODO: The tool failure response is added 
                                    // here but not forwarded to the model 
                                    // until the next user response
                                    //We just stop for the user response
                                    this.status = "waiting-for-user";
                                    return Promise.resolve();
                                } 
                            }
                        }
                    } else {
                        console.log(`Resolving ingestUserInput now`);
                        this.status = "waiting-for-user";
                        return Promise.resolve();
                    } 
                } catch(e) {
                    console.log(`Faced a failure ingesting user ` + 
                        `message ${userMessage} ${e}` + 
                        `Ignoring that like it never happened.`);
                    this.status = "waiting-for-user";
                    return Promise.resolve();
                }
            }
        }
    }
}

export { FigmaAgentThread, AgentToolConsentLevel, UserToolConsentResponse, AgentState };