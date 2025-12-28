<script lang="ts">
  import { onMount } from 'svelte';
  import type { 
    GetThreadsList, GetApiKeysResponse, GetApiKeys,
    ModelMessage, SetApiKeys, UserModelMessage, 
    UserOutput, Thread, ThreadBase,
    GetThreads,
    ModelProvider
  } from "../messages.js";
  import Header from './header.svelte';
  import Messages from './messages.svelte';
  import Input from './input.svelte';
  import ManageKeysOverlay from './managekeysoverlay.svelte';
  import { FigmaAgentThread } from "./agent.js";
  import type { CommandExecutor, DropdownCategory } from '../common.js';
  import { FigmaPluginCommandsDispatcher } from './uicommandsexecutor.js';

  interface ApiKeys {
    anthropicKey: string,
    googleKey: string
  }

  let anthropicApiKey: string = $state("");
  let googleApiKey: string = $state("");
  let userInput: string = $state("");
  let messages: Array<ModelMessage> = $state([]);
  let currentThread: number = $state(-1);
  let currentModelMode: ModelProvider = $state("anthropic");
  let currentModelName: string = $state("claude-haiku-4-5-20251001");
  let isLoading = false;
  let cmdExec: CommandExecutor;
  let showApiKeyOverlay = $state(false);
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
    console.log(`Got message from the model for the user: ${msg}`);
    messages = [...loadedThreadAgents.get(id).messages];
    return;
  };

  let getThreadCategories = function(
    threadsList: Map<number, ThreadBase>): 
    Map<string, DropdownCategory> {
    const allItems = Array.from(threadsList.values()).map(thread => ({
      key: thread.id.toString(),
      label: thread.title
    }));
    return new Map([
      ['recent', { id: "recent", items: allItems }]
    ]);
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
          rej(new Error(`Couldn't obtain API keys ${event}`));
        }
      };
      window.addEventListener('message', getApiKeysHandler);
      setTimeout(() => {
        rej(new Error(`Timed out fetching API key`));
      },1000);
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
          thread.id,thread.lastModelUsed,
          //TODO: What if the current model 
          // selected does not match the mode? 
          thread.modelMode === "anthropic" ? 
            anthropicApiKey : googleApiKey,
          cmdExec,
          userOutputSurfacing.bind(thread.id)
        );
      //Initialise entire history
      agent.messages = thread.msgs;
      loadedThreadAgents.set(thread.id,agent);
    }
  }

  function setupNewthread(id: number) {
    let newT: Thread = {
      id: id,
      modelMode: currentModelMode,
      lastModelUsed: currentModelName,
      title: String(id),
      msgs: []
    };

    threadsList.set(id,newT);
    initialiseAgentsForThreads([newT]);
  }

  async function initialSetup() {
    let keys = await setupApiKey();
    anthropicApiKey = keys.anthropicKey;
    googleApiKey = keys.googleKey;
    let list = await getStoredThreadsList();
    list.map(val => {
      threadsList.set(val.id,val);
    });
    if(threadsList.size > 0) {
      currentThread = Math.max(...threadsList.keys());
      currentModelMode = threadsList.get(currentThread).modelMode;
      currentModelName = threadsList.get(currentThread).lastModelUsed;
      let threads = await getStoredThreads([currentThread]);
      initialiseAgentsForThreads(threads);
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

  function processUserMessage() {
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
    loadedThreadAgents.get(currentThread).
    ingestUserInput(userMessage)
    .catch(e => {
      console.error(e);
    });
  }

  async function sendMessage() {
    if (!userInput.trim() || isLoading) 
      return;
    if(!anthropicApiKey && !googleApiKey) {
      alert('Please set your API key in settings first');
      return;
    } else if(currentThread === -1) {
      console.log(`Setting up a new thread given none is initialised currently`);
      if(threadsList.size > 0)
        currentThread = Math.max(...threadsList.keys());
      else currentThread = 1;
      setupNewthread(currentThread);
    }
    processUserMessage();
  }

  function onModeChange(modelKey: string) {
  }

  function onChatChange(chat: string) {

  }

  function openApiKeyOverlay() {
    showApiKeyOverlay = true;
  }

  function closeApiKeyOverlay() {
    showApiKeyOverlay = false;
  }

  function handleUpdateApiKey(keys: {
      anthropicApiKey: string,
      googleApiKey: string
    }) {
    anthropicApiKey = keys.anthropicApiKey;
    googleApiKey = keys.googleApiKey;
    saveApiKey();
    // Recreate the agent with the new API key
    closeApiKeyOverlay();
  }
</script>

<div class="app">
  <!-- TODO: Fix the use of currentThread as label here  -->
  <Header
    chats={getThreadCategories(threadsList)}
    selectedChatKey={String(currentThread)}
    onChatChange={onChatChange}
    onManageApiKeys={openApiKeyOverlay}
  />

  <Messages {messages} {isLoading} />

  <Input
    bind:userInput={userInput}
    {isLoading}
    onSend={sendMessage}
    onKeyPress={handleKeyPress}
    selectedModel={currentModelName}
    onModelChange={onModeChange}
  />

  {#if showApiKeyOverlay}
    <ManageKeysOverlay
      {anthropicApiKey}
      {googleApiKey}
      onClose={closeApiKeyOverlay}
      onUpdate={handleUpdateApiKey}
    />
  {/if}
</div>
