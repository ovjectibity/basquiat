<script lang="ts">
  import { onMount } from 'svelte';
  import type { 
    GetThreadsList, GetApiKeysResponse, GetApiKeys,
    ModelMessage, SetApiKeys, UserModelMessage, 
    UserOutput, Thread, ThreadBase,
    GetThreads,
    ModelMode,
    SaveThreads
  } from "../messages.js";
  import Header from './header.svelte';
  import Messages from './messages.svelte';
  import Input from './input.svelte';
  import ManageKeysOverlay from './managekeysoverlay.svelte';
  import { 
    FigmaAgentThread, 
    type AgentToolConsentLevel,
    type UserToolConsentResponse
  } from "./agent.js";
  import { 
    modelOptions, 
    type CommandExecutor, 
    type DropdownCategory, 
    type DropdownItem } 
  from '../common.js';
  import { 
    FigmaPluginCommandsDispatcher 
  } from './uicommandsexecutor.js';

  interface ApiKeys {
    anthropicKey: string,
    googleKey: string
  }

  let anthropicApiKey: string = $state("");
  let googleApiKey: string = $state("");
  let userInput: string = $state("");
  let messages: Array<ModelMessage> = $state([]);
  let currentThread: number = $state(0);
  let isThreadSaving: boolean = $state(false);
  let currentModelMode: ModelMode = $state("not-set");
  let currentModelKey: string = $state("claude-haiku-4-5-20251001");
  let isLoading = $state(false);
  let cmdExec: CommandExecutor;
  let showApiKeyOverlay = $state(false);
  let insistApiKeyOverlay = $state(false);
  let needConsent: boolean = $state(false);
  let consentLevel: AgentToolConsentLevel = $state("ask");
  let threadsList = new Map<number,ThreadBase>();
  let loadedThreadAgents: Map<number,FigmaAgentThread> = new Map();

  // Load API key on mount
  onMount(async () => {
    try {
      console.log('App mounted');
      // Initialize the command executor after component is mounted
      cmdExec = new FigmaPluginCommandsDispatcher();
      await initialSetup();
    } catch(e) {
      console.error(e);
      console.dir(e);
    };
  });

  let userOutputSurfacing = (id: number, msg: Array<UserOutput>) => {
    console.log(`Got message from the model for the user: ${msg} ${id}`);
    let agent = loadedThreadAgents.get(id);
    try {
      messages = [...agent.getMessages()];
    } catch(e) {
      console.log(`Unable to update message thread  ${msg} ${id} ${agent}`);
    }
    return;
  };

  let getThreadCategories = function(
    threadsList: Map<number, ThreadBase>): 
    Map<string, DropdownCategory> {
    let allItems = new Map<string,DropdownItem>();
    threadsList.forEach((val,key) => {
      allItems.set(val.id.toString(),{
        key: val.id.toString(),
        label: val.title
      });
    });
    const ret = new Map([
      ['recent', { key: "recent", disabled: false, items: allItems }]
    ]);
    console.dir(ret);
    return ret;
  }

  function setupApiKey(): Promise<ApiKeys> {
    let getApiKeysMsg: GetApiKeys = {
      type: "get_api_keys"
    } 
    parent.postMessage({ pluginMessage: getApiKeysMsg }, '*');
    return new Promise((res,rej) => {
      let getApiKeysHandler = (event) => {
        const msg = event.data.pluginMessage;
        if(msg && msg.type === "get_api_keys_response" && 
          (msg.anthropicKey || msg.googleKey)) {
          //Remove handler
          window.removeEventListener('message',getApiKeysHandler);
          anthropicApiKey = (msg as GetApiKeysResponse).anthropicKey;
          googleApiKey = (msg as GetApiKeysResponse).googleKey;
          res({
            anthropicKey: anthropicApiKey,
            googleKey: googleApiKey
          });
        } else {
          console.dir(msg);
          rej(new Error(`Couldn't obtain API keys ${event} ${msg}`));
        }
      };
      window.addEventListener('message', getApiKeysHandler);
      setTimeout(() => {
        window.removeEventListener('message',getApiKeysHandler);
        rej(new Error(`Timed out fetching API key`));
      },2000);
    });
  }

  function getStoredThreadsList(): 
    Promise<Array<ThreadBase>> {
    const getThreadsListMsg: GetThreadsList = {
      type: "get_threads_list"
    };
    parent.postMessage({ pluginMessage: getThreadsListMsg }, '*');
    return new Promise((res,rej) => {
      let getThreadsListHandler = (event) => {
        const msg = event.data.pluginMessage;
        if(msg && msg.type === "get_threads_list_response" && 
          msg.threads) {
          //Remove handler
          window.removeEventListener('message',getThreadsListHandler);
          res(msg.threads);
        } else {
          rej(new Error(`Couldn't obtain threads list ${event}`));
        }
      };
      window.addEventListener('message', getThreadsListHandler);
      setTimeout(() => {
        rej(new Error(`Timed out fetching threads list`));
      },2000);
    });
  }

  function getStoredThreads(ids: Array<number>): 
    Promise<Array<Thread>> {
    const getThreadsMsg: GetThreads = {
      type: "get_threads",
      ids: ids
    };
    parent.postMessage({ pluginMessage: getThreadsMsg }, '*');
    return new Promise((res,rej) => {
      let getThreadsHandler = (event) => {
        const msg = event.data.pluginMessage;
        if(msg && msg.type === "get_threads_response" && 
          msg.threads) {
          //Remove handler
          window.removeEventListener('message',getThreadsHandler);
          res(msg.threads);
        } else {
          rej(new Error(`Couldn't obtain threads ${event}`));
        }
      };
      window.addEventListener('message', getThreadsHandler);
      setTimeout(() => {
        rej(new Error(`Timed out fetching threads`));
      },2000);
    });
  }

  function initialiseAgentsForThreads(threads: Array<Thread>) {
    //Assumes the keys are already set
    for(let thread of threads) {
      let agent = 
        new FigmaAgentThread(
          thread.id,
          thread.modelMode,
          thread.lastModelUsed,
          //TODO: What if the current model 
          // selected does not match the mode? 
          thread.modelMode === "anthropic" ? 
            anthropicApiKey : googleApiKey,
          cmdExec,
          userOutputSurfacing.bind(null,thread.id)
        );
      // Initialise entire history
      agent.setMessages(thread.msgs);
      loadedThreadAgents.set(thread.id,agent);
    }
  }

  function setupNewthread(id: number) {
    let newT: Thread = {
      id: id,
      modelMode: currentModelMode,
      lastModelUsed: currentModelKey,
      title: String(id),
      msgs: []
    };

    threadsList.set(id,newT);
    initialiseAgentsForThreads([newT]);
  }

  async function initialSetup() {
    try {
      let keys = await setupApiKey();
      anthropicApiKey = keys.anthropicKey;
      googleApiKey = keys.googleKey;
      if(anthropicApiKey === "")
        currentModelKey = "gemini-3-flash-preview";
    } catch(e) {
      // console.log(`No API keys found: ${e}`);
    }

    if(anthropicApiKey !== "" || googleApiKey !== "") {
      try {
        let list = await getStoredThreadsList();
        list.map(val => {
          threadsList.set(val.id,val);
        });

        if(threadsList.size > 0) {
          //Setting up data structures to support existing saved threads
          currentThread = Math.max(...threadsList.keys());
          currentModelMode = threadsList.get(currentThread).modelMode;
          currentModelKey = threadsList.get(currentThread).lastModelUsed;
          let threads = await getStoredThreads([currentThread]);
          initialiseAgentsForThreads(threads);
          messages = [...loadedThreadAgents.get(currentThread).getMessages()];
        } else {
          console.assert(currentThread === 0);
          console.log(`Setting up a new thread given none is initialised currently`);
          currentThread = 1;
          setupNewthread(currentThread);
        }
      } catch(e) {
        console.log(`Error during initial setup: ${e}`);
      }
    } else {
      console.log(`No API keys found, 
        skipping thread setup unless keys are set`);
      showApiKeyOverlay = true;
      insistApiKeyOverlay = true;
    }
    return;
  }

  function saveApiKey() {
    let setKeyMsg: SetApiKeys = {
        type: 'set_api_keys',
        anthropicKey: anthropicApiKey,
        googleKey: googleApiKey
    }
    parent.postMessage({
      pluginMessage: setKeyMsg
    }, '*');
    console.log('API key save requested');
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  async function onUserConsentResponse(
    userres: UserToolConsentResponse,
    autoApprove: boolean) {
    let agent = loadedThreadAgents.get(currentThread);
    if(agent && needConsent && agent.isTurnActive()) {
      needConsent = false;
      if(autoApprove) {
        //Send signal to the model as well 
        agent.updateConsent("auto-approve");
        consentLevel = "auto-approve";
      }
      let res = await agent.provideUserConsentResponse(userres);
      if(res === "need-user-consent") {
        needConsent = true;
      } else if(res === "waiting-for-user") {
        needConsent = false;
        isLoading = false;
      } 
    } else {
      console.error(`Could not process user ` + 
        `consent response ${agent} ${needConsent} ` + 
        `${agent.isTurnActive()}`)
    }
  }

  async function processUserMessage() {
    isLoading = true;
    const message = userInput.trim();
    userInput = "";
    const userMessage = {
        role: "user",
        contents: [{
            type: "user_input",
            content: message
        }]
    } satisfies UserModelMessage;
    messages.push(userMessage);
    messages = [...messages];
    try {
      let agent = loadedThreadAgents.get(currentThread);
      if(!agent.isTurnActive()) {
        let res = await agent.runTurn(userMessage);
        if(res === "need-user-consent") {
          needConsent = true;
        } else if(res === "waiting-for-user") {
          needConsent = false;
          isLoading = false;
        }
      } else {
        console.error(`User message being given while` + 
        ` a turn is still active ${message}`)
      }
    } catch(e) {
      console.error(e);
    }
  }

  async function handleStop() {
    if(!isLoading) {
      console.error(`Not loading currently, skipping handleStop`);
      return;
    }
    isLoading = false;
    //Clean up ongoing thread work here: 
    let agent = loadedThreadAgents.get(currentThread);
    if(agent) {
      if(!agent.isTurnActive()) {
        console.error(`current turn not active. ` + 
          `Not doing anything in handleStop`);
      } else {
        await agent.cancelTurn();
      }
    }
  }

  async function sendMessage() {
    if (!userInput.trim() || isLoading) 
      return;
    if(!anthropicApiKey && !googleApiKey) {
      alert('Please set your API key in settings first');
      return;
    }
    // If the modelMode is not 
    // setup for the current one, do that
    let currentAgent = loadedThreadAgents.get(currentThread);
    if(currentAgent.modelMode === "not-set") {
      let newMode = modelOptions.get(currentModelKey).provider;
      console.log(`Setting up current mode of the model given ` + 
        `it is not set & first user message is sent ${newMode} ${currentModelMode}`);
      currentAgent.setupModel(
        newMode,
        currentModelKey,
        newMode === "anthropic" ? anthropicApiKey : googleApiKey
      );
      currentModelMode = newMode;
    }
    processUserMessage();
  }

  function onModelChange(modelKey: string) {
    currentModelKey = modelKey;
    //TODO: Is any thread specific handling required here? 
    loadedThreadAgents.get(currentThread).updateModelKey(modelKey);
  }

  function onChatChange(chat: string) {

  }

  function openApiKeyOverlay() {
    showApiKeyOverlay = true;
  }

  function closeApiKeyOverlay() {
    showApiKeyOverlay = false;
  }

  function handleSave() {
    let agent = loadedThreadAgents.get(currentThread);
    if(!agent) {
      console.error(`No current thread to save, skipping`);
      return;
    }
    isThreadSaving = true;
    let saveId = Math.random() * 10;
    let saveThreadMsg: SaveThreads = {
      type: "save_threads",
      id: saveId,
      threads: [{
        id: currentThread, 
        title: String(currentThread), 
        msgs: agent.getMessages(),
        modelMode: agent.modelMode,
        lastModelUsed: currentModelKey
      }]
    };
    parent.postMessage({
      pluginMessage: saveThreadMsg
    }, '*');
    (new Promise<void>((res,rej) => {
      let saveThreadResponseHandler = (event) => {
        const msg = event.data.pluginMessage;
        if(msg && msg.type === "save_threads_response" && 
          msg.saveId === saveId) {
          //Remove handler
          window.removeEventListener('message',saveThreadResponseHandler);
          console.log(`Thread saved successfully`);
          res();
        }
      };
      window.addEventListener('message', saveThreadResponseHandler);
      setTimeout(() => {
        window.removeEventListener('message',saveThreadResponseHandler);
        rej(new Error(`Timed out saving thread`));
      },6000);
    })).then(() => {
      isThreadSaving = false;
    }).catch((e) => {
      console.warn(`Did not save thread ${e}`);
      isThreadSaving = false;
    });
    console.log('Save thread requested');
  }

  function handleUpdateApiKey(keys: {
      anthropicApiKey: string,
      googleApiKey: string
    }) {
    anthropicApiKey = keys.anthropicApiKey;
    googleApiKey = keys.googleApiKey;
    saveApiKey();
    // Recreate the agent with the new API key
    if(anthropicApiKey === "" && googleApiKey === "") {
      console.log(`No API keys found. Insisting overlay`);
      showApiKeyOverlay = true;
      insistApiKeyOverlay = true;
    } else {
      if(threadsList.size === 0 && currentThread === 0) {
        if(googleApiKey === "" && 
          modelOptions.get(currentModelKey).provider === "google") {
          currentModelKey = "claude-haiku-4-5-20251001";
        } else if(anthropicApiKey === "" && 
          modelOptions.get(currentModelKey).provider === "anthropic") {
          currentModelKey = "gemini-3-flash-preview";
        }
        console.log(`Setting up a new thread given none is initialised currently`);
        currentThread = 1;
        setupNewthread(currentThread);
      }
      closeApiKeyOverlay();
    }
  }

  function onConsentLevelChange() {
    consentLevel = consentLevel === "ask" ? "auto-approve" : "ask";
    //Update consent level for all loaded threads: 
    loadedThreadAgents.forEach(agent => {
      console.debug(`Updating consent for model: ${consentLevel}`);
      agent.updateConsent(consentLevel);
    });
  }
</script>

<div class="app">
  <!-- TODO: Fix the use of currentThread as label here
   + passing threadcategories might lead to latest 
   values not being captured  -->
  <Header
    chats={getThreadCategories(threadsList)}
    selectedChatKey={currentThread}
    onChatChange={onChatChange}
    onManageApiKeys={openApiKeyOverlay}
  />

  <Messages {messages} {needConsent} {isLoading} {onUserConsentResponse} />

  <Input
    bind:consentLevel={consentLevel}
    bind:userInput={userInput}
    {isLoading}
    modelMode = {currentModelMode}
    showGoogleModels={googleApiKey !== ""}
    showAnthropicModels={anthropicApiKey !== ""}
    isThreadSaving={isThreadSaving}
    onSend={sendMessage}
    onStop={handleStop}
    saveThread={handleSave}
    onKeyPress={handleKeyPress}
    selectedModel={currentModelKey}
    onModelChange={onModelChange}
    {onConsentLevelChange}
  />
  {#if showApiKeyOverlay}
    <ManageKeysOverlay
      {anthropicApiKey}
      {googleApiKey}
      insistView = {insistApiKeyOverlay}
      onClose={closeApiKeyOverlay}
      onUpdate={handleUpdateApiKey}
    />
  {/if}
</div>
