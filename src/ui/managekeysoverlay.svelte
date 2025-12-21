<script lang="ts">
  export let apiKey: string;
  export let onClose: () => void;
  export let onUpdate: (newApiKey: string) => void;

  let tempApiKey: string = apiKey;
</script>

<div class="overlay">
  <div class="overlay-content">
    <button class="close-button" on:click={onClose}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>

    <h2 class="overlay-title">Manage API Keys</h2>

    <div class="form-field">
      <label for="api-key" class="form-label">Anthropic key</label>
      <input
        id="api-key"
        type="text"
        class="form-input"
        bind:value={tempApiKey}
        placeholder="Enter your Anthropic API key"
      />
    </div>

    <button class="update-button" on:click={() => onUpdate(tempApiKey)}>
      Update
    </button>
  </div>
</div>
