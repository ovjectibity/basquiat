<script lang="ts">
  import {  } from '../common';
  import Dropdown from './dropdown.svelte';
  import { type Model, type DropdownCategory, modelOptions } from "../common";

  interface Props {
    userInput: string;
    isLoading: boolean;
    onSend: () => void;
    onKeyPress: (event: KeyboardEvent) => void;
    selectedModel: string;
    onModelChange: (model: string) => void;
  }

  let {
    userInput = $bindable(),
    isLoading,
    onSend,
    onKeyPress,
    selectedModel,
    onModelChange
  }: Props = $props();

  let modelCategories = function groupModelsByProvider(
    modelOptions: Map<string, Model>
  ): Map<string, DropdownCategory> {
    const categoryMap = new Map<string, DropdownCategory>();
    for (const model of modelOptions.values()) {
      // A. Identify the group key (e.g., "google")
      const groupKey = model.provider;
      // B. Create the category if it doesn't exist yet
      if (!categoryMap.has(groupKey)) {
        categoryMap.set(groupKey, {
          // Capitalize the provider for the display label (e.g., "Google")
          label: groupKey.charAt(0).toUpperCase() + groupKey.slice(1),
          items: []
        });
      }
      // C. Add the item to the category
      // We map 'name' -> 'label' for the dropdown requirements
      const category = categoryMap.get(groupKey)!;
      category.items.push({
        key: model.key,
        label: model.name
      });
    }
    return categoryMap;
  }(modelOptions);
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
      items={modelCategories}
      selectedKey={selectedModel}
      onSelect={onModelChange}
      disabled={isLoading}
      position="up"
    />
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
