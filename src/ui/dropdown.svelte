<script lang="ts">
  import DropdownList from './dropdownlist.svelte';

  export let items: Map<string, string>;
  export let selectedKey: string;
  export let onSelect: (key: string) => void;
  export let disabled: boolean = false;
  export let position: 'up' | 'down' = 'down';

  let isOpen = false;

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

  $: selectedKey = selectedKey
</script>

<svelte:window on:click={handleClickOutside} />

<div class="dropdown" class:disabled>
  <button
    class="dropdown-trigger"
    on:click|stopPropagation={toggleDropdown}
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
