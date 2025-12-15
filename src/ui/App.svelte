<script lang="ts">
  let count = 5;

  function onCreate() {
    parent.postMessage(
      {
        pluginMessage: {
          type: 'create-rectangles',
          count: count
        }
      },
      '*'
    );
  }

  function onCancel() {
    parent.postMessage(
      {
        pluginMessage: {
          type: 'cancel'
        }
      },
      '*'
    );
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      onCreate();
    }
  }
</script>

<div class="container">
  <h2>Create Rectangles</h2>
  <label for="count">Number of rectangles:</label>
  <input
    id="count"
    type="number"
    bind:value={count}
    min="1"
    max="100"
    on:keypress={handleKeyPress}
  />

  <div class="button-group">
    <button class="secondary" on:click={onCancel}>Cancel</button>
    <button class="primary" on:click={onCreate}>Create</button>
  </div>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    margin: 0;
    padding: 0;
    background: white;
  }

  .container {
    padding: 16px;
  }

  h2 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 16px 0;
    color: #333;
  }

  label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    margin-bottom: 4px;
    color: #333;
  }

  input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 16px;
  }

  input:focus {
    outline: none;
    border-color: #18a0fb;
  }

  .button-group {
    display: flex;
    gap: 8px;
  }

  button {
    flex: 1;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  button.primary {
    background-color: #18a0fb;
    color: white;
  }

  button.primary:hover {
    background-color: #0d8ce8;
  }

  button.secondary {
    background-color: #f0f0f0;
    color: #333;
  }

  button.secondary:hover {
    background-color: #e5e5e5;
  }

  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
