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
</script>

<div class="app">
  <Header 
  selectedChat={"chat-1"}
  onChatChange={onChatChange} />

  <Messages {messages} {isLoading} />

  <Input
    bind:userInput={userInput}
    {isLoading}
    onSend={sendMessage}
    onKeyPress={handleKeyPress}
    selectedModel={modelName}
    onModelChange={onModeChange}
  />
</div>
