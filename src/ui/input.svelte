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
    onSend: () => void;
    onKeyPress: (event: KeyboardEvent) => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
  }

  let {
    consentLevel = $bindable(),
    userInput = $bindable(),
    isLoading,
    modelMode,
    onSend,
    onKeyPress,
    selectedModel,
    onModelChange
  }: Props = $props();

  let modelCategories = function groupModelsByProvider(
    modelOptions: Map<string, Model>
  ): Map<string, DropdownCategory> {// The outer map keys are the provider IDs (e.g., 'google')
    const categoryMap = new Map<string, DropdownCategory>();

    for (const model of modelOptions.values()) {
      const providerKey = model.provider;

      let disabled: boolean = false; 
      if((modelMode === "anthropic" && providerKey === "google") || 
          (modelMode === "google" && providerKey === "anthropic")) {
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

  let onConsentLevelChange = () => {
    consentLevel = consentLevel === "ask" ? "auto-approve" : "ask";
  }
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
      disabled={isLoading}
      position="up"
    />
    <div class="input-buttons">
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
        onclick={onSend}
        disabled={!userInput.trim() || isLoading}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</div>
