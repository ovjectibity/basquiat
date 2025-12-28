<script lang="ts">
  import { type DropdownCategory } from '../common';

  interface Props {
    items: Map<string,DropdownCategory>;
    selectedKey: string;
    onSelect: (value: string) => void;
    position?: 'up' | 'down';
    align?: 'left' | 'right';
  }

  let {
    items,
    selectedKey,
    onSelect,
    position = 'down',
    align = 'left'
  }: Props = $props();
</script>

<div class="dropdown-list" class:position-up={position === 'up'} 
  class:align-right={align === 'right'}>
  {#each items as [id, category], index (id)}
    
    {#if index > 0}
      <hr class="dropdown-divider" />
    {/if}

    {#if category.label}
      <div class="dropdown-header">{category.label}</div>
    {/if}

    {#each category.items as item (item.key)}
      <button
        class="dropdown-item"
        class:selected={item.key === selectedKey}
        onclick={() => onSelect(item.key)}
        type="button"
      >
        {item.label}
      </button>
    {/each}
  {/each}
</div>
