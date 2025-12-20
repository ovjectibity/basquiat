<script lang="ts">
  export let items: Map<string,string>;
  export let selectedKey: string;
  export let onSelect: (value: string) => void;
  export let position: 'up' | 'down' = 'down';
  export let align: 'left' | 'right' = 'left';
</script>

<div class="dropdown-list" class:position-up={position === 'up'} class:align-right={align === 'right'}>
  {#each items as [key,val] (key)}
    <button
      class="dropdown-item"
      class:selected={key === selectedKey}
      on:click={() => onSelect(key)}
      type="button"
    >
      {val}
    </button>
  {/each}
</div>
