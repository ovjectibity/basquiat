<script lang="ts">
  export let items: Map<string,string>;
  export let selectedKey: string;
  export let onSelect: (value: string) => void;
  export let position: 'up' | 'down' = 'down';
</script>

<div class="dropdown-list" class:position-up={position === 'up'}>
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
