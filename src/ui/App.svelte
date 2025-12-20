<script lang="ts">
  import { onMount } from 'svelte';
  import type { ModelMessage, UserModelMessage } from "../messages.js";
  import Header from './header.svelte';
  import Messages from './messages.svelte';
  import Input from './input.svelte';
  import { FigmaAgentThread } from "./agent.js";
  import { CommandExecutor, FigmaExecutor } from '../executor.js';

  let apiKey: string = "";
  let userInput: string = "";
  let messages: Array<ModelMessage> = [];
  let modelName: string = "claude-haiku-4-5-20251001";
  let isLoading = false;
  let cmdExec: CommandExecutor = new FigmaExecutor();
  let showApiKeyOverlay = false;
  let tempApiKey: string = "";

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
      // Request API key from main thread
      parent.postMessage({ pluginMessage: { type: 'get_api_key' } }, '*');
      // Listen for API key response
      window.addEventListener('message', (event) => {
        const msg = event.data.pluginMessage;
        if(msg && msg.type === 'api_key_response') {
          if(msg.apiKey) {
            apiKey = msg.apiKey;
            // Recreate the agent with the loaded API key
            currentThreadAgent = new FigmaAgentThread(
              1,
              modelName,
              apiKey,
              cmdExec,
              userOutputSurfacing
            );
          }
        }
      });
    } catch (error) {
      console.error('Error in onMount:', error);
    }
  });

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

  async function sendMessage() {
    if (!userInput.trim() || isLoading) return;

    if(!apiKey) {
      alert('Please set your API key in settings first');
      return;
    }

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

  function onModeChange(modelKey: string) {

  }

  function onChatChange(chat: string) {

  }

  function openApiKeyOverlay() {
    tempApiKey = apiKey;
    showApiKeyOverlay = true;
  }

  function closeApiKeyOverlay() {
    showApiKeyOverlay = false;
    tempApiKey = "";
  }

  function updateApiKey() {
    apiKey = tempApiKey;
    saveApiKey();
    // Recreate the agent with the new API key
    if (apiKey) {
      currentThreadAgent = new FigmaAgentThread(
        1,
        modelName,
        apiKey,
        cmdExec,
        userOutputSurfacing
      );
    }
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
    <div class="overlay">
      <div class="overlay-content">
        <button class="close-button" on:click={closeApiKeyOverlay}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>

        <h2 class="overlay-title">Manage API Keys</h2>

        <div class="form-field">
          <label for="api-key" class="form-label">Anthropic key</label>
          <input
            id="api-key"
            type="text"
            class="form-input"
            bind:value={tempApiKey}
            placeholder="Enter your Anthropic API key"
          />
        </div>

        <button class="update-button" on:click={updateApiKey}>
          Update
        </button>
      </div>
    </div>
  {/if}
</div>
