<script lang="ts">
  import Dropdown from './dropdown.svelte';

  export let userInput: string;
  export let isLoading: boolean;
  export let onSend: () => void;
  export let onKeyPress: (event: KeyboardEvent) => void;
  export let selectedModel: string;
  export let onModelChange: (model: string) => void;

  const modelOptions = new Map([
    ['claude-opus-4', 'Claude Opus 4' ],
    ['claude-opus-4', 'Claude Sonnet 4' ],
    ['claude-haiku-4-5-20251001', 'Claude Haiku 4.5' ]
  ]);
</script>

<div class="input-container">
  <div class="textarea-wrapper">
    <div
    class="input-area"
    contenteditable="true"
    bind:textContent={userInput}
    on:keypress={onKeyPress}
    data-placeholder="Describe the changes you want to make..."
    class:disabled={isLoading}
    role="textbox"
    tabindex="0"
    />
  </div>
  <div class="input-controls">
    <Dropdown
      items={modelOptions}
      selectedKey={selectedModel}
      onSelect={onModelChange}
      disabled={isLoading}
      position="up"
    />
    <button
      class="send-button"
      on:click={onSend}
      disabled={!userInput.trim() || isLoading}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</div>
