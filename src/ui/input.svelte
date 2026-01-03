<script lang="ts">
  import Dropdown from './dropdown.svelte';
  import { type Model, 
    type DropdownCategory,
    type DropdownItem,
    modelOptions } from "../common";
  import { type ModelMode } from '../messages';
  import { type AgentToolConsentLevel } from './agent';

  interface Props {
    consentLevel: AgentToolConsentLevel;
    userInput: string;
    isLoading: boolean;
    modelMode: ModelMode;
    showGoogleModels: boolean;
    showAnthropicModels: boolean;
    onSend: () => void;
    onStop: () => void;
    saveThread: () => void;
    onKeyPress: (event: KeyboardEvent) => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
    onConsentLevelChange: () => void;
  }

  let {
    consentLevel = $bindable(),
    userInput = $bindable(),
    isLoading,
    modelMode,
    showGoogleModels,
    showAnthropicModels,
    onSend,
    onStop,
    saveThread,
    onKeyPress,
    selectedModel,
    onModelChange,
    onConsentLevelChange
  }: Props = $props();

  let modelCategories = function groupModelsByProvider(
    modelOptions: Map<string, Model>
  ): Map<string, DropdownCategory> {// The outer map keys are the provider IDs (e.g., 'google')
    const categoryMap = new Map<string, DropdownCategory>();

    for (const model of modelOptions.values()) {
      const providerKey = model.provider;

      let disabled: boolean = false; 
      if((modelMode === "anthropic" && providerKey === "google") || 
          (modelMode === "google" && providerKey === "anthropic") || 
          (providerKey === "google" && !showGoogleModels) || 
          (providerKey === "anthropic" && !showAnthropicModels)) {
        disabled = true;
      }
      // 1. Create the category if it doesn't exist
      if (!categoryMap.has(providerKey)) {
        categoryMap.set(providerKey, {
          key: providerKey,
          disabled: disabled,
          // Capitalize for display label (e.g. "Google")
          label: providerKey.charAt(0).toUpperCase() + providerKey.slice(1),
          // Initialize as an empty Map instead of an array
          items: new Map<string, DropdownItem>() 
        });
      }

      // 2. Add the item to the category's inner Map
      const category = categoryMap.get(providerKey)!;
      
      category.items.set(model.key, {
        key: model.key,
        label: model.name
      });
    }

    console.dir(categoryMap);
    return categoryMap;
  };
</script>

<div class="input-container">
  <div class="textarea-wrapper">
    <div
    class="input-area"
    contenteditable="true"
    bind:textContent={userInput}
    onkeypress={onKeyPress}
    data-placeholder="Describe the changes you want to make..."
    class:disabled={isLoading}
    role="textbox"
    tabindex="0"
></div>
  </div>
  <div class="input-controls">
    <Dropdown
      items={modelCategories(modelOptions)}
      selectedItemKey={selectedModel}
      onSelect={onModelChange}
      disabled={isLoading || (!showGoogleModels && !showAnthropicModels)}
      position="up"
    />
    <div class="input-buttons">
      <button
        class="save-button"
        onclick={saveThread}
        title="Save thread"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
      </button>
      <button
        class="consent-button"
        onclick={onConsentLevelChange}
        title={consentLevel === "ask" ? 
          "Ask for approval for each tool call":
          "Auto-approve all tool calls"
          }
      >
        {#if consentLevel === "ask"}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        {:else}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 19 22 12 13 5 13 19"></polygon>
            <polygon points="2 19 11 12 2 5 2 19"></polygon>
          </svg>
        {/if}
      </button>
      <button
        class="send-button"
        onclick={isLoading ? onStop : onSend}
        disabled={!isLoading && !userInput.trim()}
        title={isLoading ? "Stop response" : "Send message"}
      >
        {#if isLoading}
          <div class="loading-spinner-container">
            <div class="loading-spinner"></div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="stop-icon">
              <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
            </svg>
          </div>
        {:else}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        {/if}
      </button>
    </div>
  </div>
</div>
