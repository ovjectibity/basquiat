<script lang="ts">
  import { run, stopPropagation } from 'svelte/legacy';

  import DropdownList from './dropdownlist.svelte';
  import { type DropdownCategory } from '../common';

  interface Props {
    items: Map<string,DropdownCategory>;
    selectedKey: string;
    onSelect: (key: string) => void;
    disabled?: boolean;
    position?: 'up' | 'down';
  }

  let {
    items,
    selectedKey = $bindable(),
    onSelect,
    disabled = false,
    position = 'down'
  }: Props = $props();

  let isOpen = $state(false);

  function toggleDropdown() {
    if (!disabled) {
      isOpen = !isOpen;
    }
  }

  function selectItem(key: string) {
    onSelect(key);
    isOpen = false;
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      isOpen = false;
    }
  }

  run(() => {
    selectedKey = selectedKey
  });
</script>

<svelte:window onclick={handleClickOutside} />

<div class="dropdown" class:disabled>
  <button
    class="dropdown-trigger"
    onclick={stopPropagation(toggleDropdown)}
    {disabled}
    type="button"
  >
    <span>{items.get(selectedKey)}</span>
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="chevron" class:open={isOpen}>
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>

  {#if isOpen}
    <DropdownList
      {items}
      selectedKey={selectedKey}
      {position}
      onSelect={selectItem}
    />
  {/if}
</div>
