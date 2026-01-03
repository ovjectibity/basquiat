<script lang="ts">
  import { stopPropagation } from 'svelte/legacy';

  import Dropdown from './dropdown.svelte';
  import DropdownList from './dropdownlist.svelte';
  import { type DropdownCategory } from '../common';

  interface Props {
    selectedChatKey: number;
    chats: Map<string, DropdownCategory>;
    onChatChange: (chat: string) => void;
    onManageApiKeys: () => void;
  }

  let { selectedChatKey, chats, onChatChange, onManageApiKeys }: Props = $props();

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
