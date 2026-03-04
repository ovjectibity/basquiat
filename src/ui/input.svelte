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
    attachedFileName: string;
    hasAttachment: boolean;
    isLoading: boolean;
    modelMode: ModelMode;
    showGoogleModels: boolean;
    showAnthropicModels: boolean;
    onSend: () => void;
    onStop: () => void;
    onKeyPress: (event: KeyboardEvent) => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
    onConsentLevelChange: () => void;
    onAttachmentChange: (file: File | null) => void;
  }

  let {
    consentLevel = $bindable(),
    userInput = $bindable(),
    attachedFileName,
    hasAttachment,
    isLoading,
    modelMode,
    showGoogleModels,
    showAnthropicModels,
    onSend,
    onStop,
    onKeyPress,
    selectedModel,
    onModelChange,
    onConsentLevelChange,
    onAttachmentChange
  }: Props = $props();

  let attachmentInput: HTMLInputElement;

  let modelCategories = function groupModelsByProvider(
    modelOptions: Map<string, Model>
  ): Map<string, DropdownCategory> {// The outer map keys are the provider IDs (e.g., 'google')
    const categoryMap = new Map<string, DropdownCategory>();

    for (const model of modelOptions.values()) {
      const providerKey = model.provider;

      let disabled: boolean = false; 
      if((providerKey === "google" && !showGoogleModels) || 
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

  function isSupportedAttachment(file: File): boolean {
    const mime = file.type.toLowerCase();
    if(mime === "image/png" || mime === "image/jpeg") {
      return true;
    }
    const lowerName = file.name.toLowerCase();
    return lowerName.endsWith(".png") || 
      lowerName.endsWith(".jpg") || 
      lowerName.endsWith(".jpeg");
  }

  function openAttachmentPicker() {
    if(isLoading) {
      return;
    }
    if(attachmentInput) {
      attachmentInput.value = "";
      attachmentInput.click();
    }
  }

  function onAttachmentInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if(!target.files || target.files.length === 0) {
      return;
    }
    const selected = target.files[0];
    if(!isSupportedAttachment(selected)) {
      alert("Only PNG and JPG images are supported right now.");
      return;
    }
    onAttachmentChange(selected);
  }
</script>

<div class="input-container">
  <input
    class="attachment-input-hidden"
    bind:this={attachmentInput}
    type="file"
    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
    onchange={onAttachmentInputChange}
  />
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
      <span class="attachment-file-name" title={hasAttachment ? attachedFileName : ""}>
        {hasAttachment ? attachedFileName : ""}
      </span>
      <button
        class="consent-button"
        onclick={openAttachmentPicker}
        title="Attach PNG/JPG image"
        disabled={isLoading}
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.44 11.05L12.25 20.24C9.93 22.56 6.16 22.56 3.84 20.24C1.52 17.92 1.52 14.15 3.84 11.83L13.03 2.64C14.58 1.09 17.1 1.09 18.65 2.64C20.2 4.19 20.2 6.71 18.65 8.26L9.46 17.45C8.68 18.23 7.42 18.23 6.64 17.45C5.86 16.67 5.86 15.41 6.64 14.63L14.95 6.32"/>
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
        disabled={!isLoading && !userInput.trim() && !hasAttachment}
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
