<script lang="ts">
  interface Props {
    anthropicApiKey: string;
    googleApiKey: string;
    onClose: () => void;
    onUpdate: (keys: {
      anthropicApiKey: string,
      googleApiKey: string
    }) => void;
  }

  let { anthropicApiKey, googleApiKey, onClose, onUpdate }: Props = $props();

  let anthropicKey: string = $state(anthropicApiKey);
  let googleKey: string = $state(googleApiKey);
</script>

<div class="overlay">
  <div class="overlay-content">
    <button class="close-button" onclick={onClose}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>

    <div class="overlay-title">Manage API Keys</div>

    <div class="form-field">
      <label for="api-key" class="form-label">Anthropic API key</label>
      <input
        id="api-key"
        type="text"
        class="form-input"
        bind:value={anthropicKey}
        placeholder="Enter your Anthropic API key"
      />
      <label for="api-key" class="form-label">Google AI Studio API key</label>
      <input
        id="api-key"
        type="text"
        class="form-input"
        bind:value={googleKey}
        placeholder="Enter your Google AI Studio API key"
      />
    </div>

    <button class="update-button" onclick={() => onUpdate({
      anthropicApiKey: anthropicKey,
      googleApiKey: googleKey
    })}>
      Update
    </button>
  </div>
</div>
