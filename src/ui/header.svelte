<script lang="ts">
  import { stopPropagation } from 'svelte/legacy';
  import DropdownList from './dropdownlist.svelte';
  import { type DropdownCategory } from '../common';

  interface Props {
    selectedChatKey: number;
    chats: Map<string, DropdownCategory>;
    isThreadSaving: boolean;
    isLoading: boolean;
    saveThread: () => void;
    onChatChange: (chat: string) => void;
    onManageApiKeys: () => void;
    clearThread: () => void;
  }

  let { 
    selectedChatKey, 
    chats, 
    isThreadSaving = $bindable(),
    isLoading,
    onChatChange, 
    onManageApiKeys,
    saveThread,
    clearThread }: Props = $props();

  const moreOptions = new Map([
    [ 'manage-api-keys', {
        key: "manage-api-keys",
        disabled: false,
        items: new Map([
          [
            "manage-api-keys", 
            {
              key: "manage-api-keys",
              label: "Manage Api Keys"
            }
          ]
        ])
      }]
  ]);

  let isMoreDropdownOpen = $state(false);

  const toggleMoreDropdown = () => {
    isMoreDropdownOpen = !isMoreDropdownOpen;
  };

  const onMoreOptionSelect = (key: string) => {
    isMoreDropdownOpen = false;
    if (key === 'manage-api-keys') {
      onManageApiKeys();
    }
  };

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.more-dropdown-wrapper')) {
      isMoreDropdownOpen = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="header">
  <!-- Skipping threads history for now -->
  <!-- <Dropdown
    items={chats}
    selectedItemKey={String(selectedChatKey)}
    onSelect={onChatChange}
    position="down"
  /> -->
  <div class="header-actions">
    <!-- Skipping ability to create new threads for now -->
    <!-- <button class="icon-button" title="New">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button> -->
    <button
      class="clear-button"
      onclick={clearThread}
      title="Clear thread"
      disabled={isLoading}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 3h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path>
        <path d="M3 7v4a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7"></path>
        <path d="M5 12v2"></path>
        <path d="M8 12v2"></path>
        <path d="M11 12v2"></path>
      </svg>
    </button>
    <button
      class="save-button"
      onclick={saveThread}
      title="Save thread"
      disabled={isThreadSaving || isLoading}
    >
      {#if isThreadSaving}
        <div class="loading-spinner-container">
          <div class="loading-spinner"></div>
        </div>
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
      {/if}
    </button>
    <div class="more-dropdown-wrapper" style="position: relative;">
      <button class="icon-button" title="More" onclick={stopPropagation(toggleMoreDropdown)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="4" r="1" fill="currentColor"/>
          <circle cx="8" cy="8" r="1" fill="currentColor"/>
          <circle cx="8" cy="12" r="1" fill="currentColor"/>
        </svg>
      </button>
      {#if isMoreDropdownOpen}
        <DropdownList
          items={moreOptions}
          selectedItemKey=""
          position="down"
          align="right"
          onSelect={onMoreOptionSelect}
        />
      {/if}
    </div>
  </div>
</div>
