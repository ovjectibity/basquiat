<script lang="ts">
  import type { ModelMessage } from "../messages.js";
  import { type UserToolConsentResponse } from "./agent.js";

  interface Props {
    messages: Array<ModelMessage>;
    needConsent: boolean;
    isLoading: boolean;
    onUserConsentResponse: (UserToolConsentResponse, boolean) => void;
  }

  let { messages, needConsent, isLoading, onUserConsentResponse }: Props = $props();

  let messagesContainer: HTMLDivElement;

  $effect(() => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  function isAgentErrorMessage(content: { type: string; content?: string }) {
    return content.type === "user_output" && 
      typeof content.content === "string" &&
      content.content.startsWith("Agent request failed");
  }
</script>

<div class="messages" bind:this={messagesContainer}>
  {#if messages.length === 0}
    <div class="empty-state">
      <p>Start a conversation to modify your Figma design</p>
    </div>
  {:else}
    {#each messages as message, messageIndex}
      {#each message.contents as content, contentIndex}
        {#if content.type === "user_input" || content.type === "user_output"}
        <div class="message {message.role}">
          <div class="message-content" class:error-message={isAgentErrorMessage(content)}>
            {content.content}
          </div>
        </div>
        {:else if content.type === "tool_use" && content.name === "figma-design-tool"}
        <div class="message {message.role}">
          <fieldset class="tool-use-fieldset">
            <legend class="tool-use-legend">Invoking Figma tool</legend>
            <div class="message-content">
              {content.content.input.objective}
              <details class="commands-details">
                <summary>Commands</summary>
                {#each content.content.input.commands.cmds as command}
                  <details class="arguments-details">
                    <summary>
                      {command.cmd.type} {(command.cmd as any).id ? `(ID: ${(command.cmd as any).id})` : ''}
                    </summary>
                    <pre>{JSON.stringify(command.cmd, null, 2)}</pre>
                  </details>
                {/each}
              </details>
            </div>
          </fieldset>
          {#if needConsent && messageIndex === messages.length - 1 && contentIndex === message.contents.length - 1}
            <div class="approval-ui">
              <button class="approval-button approve-button" onclick={onUserConsentResponse.bind(null,"user-consented",false)}>Approve</button>
              <button class="approval-button approve-and-dont-ask-button" onclick={onUserConsentResponse.bind(null,"user-consented",true)}>Approve & don't ask again</button>
              <button class="approval-button reject-button" onclick={onUserConsentResponse.bind(null,"user-rejected",false)}>Reject</button>
            </div>
          {/if}
        </div>
        <!-- {:else if content.type === "tool_result" && content.name === "figma-design-tool"}
        <div class="message {message.role}">
          <div class="message-content">
            Got this result from the Figma tool:
            {content.content.status}
          </div>
        </div> -->
        {/if}
      {/each}
    {/each}

    {#if isLoading && !needConsent}
      <div class="message assistant">
        <div class="message-content">
          <span class="loading-ellipsis"><span>.</span><span>.</span><span>.</span></span>
        </div>
      </div>
    {/if}
  {/if}
</div>
