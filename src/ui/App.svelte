<script lang="ts">
  import { onMount } from 'svelte';
  import type { ModelMessage, UserModelMessage } from "../messages.js";
  import Header from './header.svelte';
  import Messages from './messages.svelte';
  import Input from './input.svelte';
  import ManageKeysOverlay from './managekeysoverlay.svelte';
  import { FigmaAgentThread } from "./agent.js";
  import type { CommandExecutor } from '../common.js';
  import { FigmaPluginCommandsDispatcher } from './uicommandsexecutor.js';

  let apiKey: string = $state("");
  let userInput: string = $state("");
  let messages: Array<ModelMessage> = $state([]);
  let modelName: string = $state("claude-haiku-4-5-20251001");
  let isLoading = false;
  let cmdExec: CommandExecutor;
  let showApiKeyOverlay = $state(false);
  let threadsMap = new Map<string,FigmaAgentThread>();

  let userOutputSurfacing = (msg: string): Promise<void> => {
    console.log(`Got message from the model for the user: ${msg}`);
    messages = [...currentThreadAgent.messages];
    return;
  };

  let currentThreadAgent: FigmaAgentThread;

  // Load API key on mount
  onMount(() => {
    try {
      console.log('App mounted');
      // Initialize the command executor after component is mounted
      cmdExec = new FigmaPluginCommandsDispatcher();

      setupNewThread().then(thread => {
        currentThreadAgent = thread;
      })
      .catch(e => {
        console.error(e);
        console.dir(e);
      });
    } catch (error) {
      console.error('Error in onMount:', error);
    }
  });

  function setupNewThread(): Promise<FigmaAgentThread> {
    if(apiKey === "") {
      parent.postMessage({ pluginMessage: { type: 'get_api_key' } }, '*');
      return new Promise((res,rej) => {
        // Listen for API key response
        window.addEventListener('message', (event) => {
          const msg = event.data.pluginMessage;
          if(msg && msg.type === 'get_api_key_response' && msg.apiKey) {
            apiKey = msg.apiKey;
          } else {
            rej(new Error(`Couldn't obtain API key ${event}`));
          }
        });
        setTimeout(() => {
          rej(new Error(`Timed out fetching API key`));
        },1500);
      }).then((key: string) => {
          // Recreate the agent with the loaded API key
          return new FigmaAgentThread(
            1,
            modelName,
            key,
            cmdExec,
            userOutputSurfacing
          );
      }).catch(err => err);  
    }
  }

  function saveApiKey() {
    parent.postMessage({
      pluginMessage: {
        type: 'set_api_key',
        apiKey: apiKey
      }
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
    currentThreadAgent.ingestUserInput(userMessage);
  }

  async function sendMessage() {
    if (!userInput.trim() || isLoading) return;

    if(!apiKey) {
      alert('Please set your API key in settings first');
      return;
    } else if(!currentThreadAgent) {
      console.log(`Setting up a new thread given none is initialised currently`);
      setupNewThread().then(thread => {
        currentThreadAgent = thread;
        processUserMessage();
      })
      .catch(e => {
        console.error(e);
        console.dir(e);
      });
    } else {
      processUserMessage();
    }
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

  function handleUpdateApiKey(newApiKey: string) {
    apiKey = newApiKey;
    saveApiKey();
    // Recreate the agent with the new API key
    closeApiKeyOverlay();
  }
</script>

<div class="app">
  <Header
    selectedChat={"chat-1"}
    onChatChange={onChatChange}
    onManageApiKeys={openApiKeyOverlay}
  />

  <Messages {messages} {isLoading} />

  <Input
    bind:userInput={userInput}
    {isLoading}
    onSend={sendMessage}
    onKeyPress={handleKeyPress}
    selectedModel={modelName}
    onModelChange={onModeChange}
  />

  {#if showApiKeyOverlay}
    <ManageKeysOverlay
      {apiKey}
      onClose={closeApiKeyOverlay}
      onUpdate={handleUpdateApiKey}
    />
  {/if}
</div>
