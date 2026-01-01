<script lang="ts">
  import { 
    type DropdownCategory 
  } from '../common';

  interface Props {
    items: Map<string,DropdownCategory>;
    selectedItemKey: string;
    onSelect: (value: string) => void;
    position?: 'up' | 'down';
    align?: 'left' | 'right';
  }

  let {
    items,
    selectedItemKey,
    onSelect,
    position = 'down',
    align = 'left'
  }: Props = $props();
</script>

<div class="dropdown-list" class:position-up={position === 'up'} 
  class:align-right={align === 'right'}>
  {#each items as [catkey, cat], index (catkey)}
    
    {#if index > 0}
      <hr class="dropdown-divider" />
    {/if}

    {#if cat.label}
      <div class="dropdown-header" class:disabled={cat.disabled}>{cat.label}</div>
    {/if}

    {#each cat.items as [key,item] (key)}
      <button
        class="dropdown-item"
        class:selected={key === selectedItemKey}
        onclick={() => onSelect(key)}
        type="button"
        disabled={cat.disabled}
      >
        {item.label}
      </button>
    {/each}
  {/each}
</div>
