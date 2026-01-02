<script lang="ts">
  import type { ModelMessage } from "../messages.js";
  import type { AgentToolConsentLevel } from "./agent.js";

  interface Props {
    messages: Array<ModelMessage>;
    consentLevel: AgentToolConsentLevel;
    isLoading: boolean;
  }

  let { messages, consentLevel, isLoading }: Props = $props();
</script>

<div class="messages">
  {#if messages.length === 0}
    <div class="empty-state">
      <p>Start a conversation to modify your Figma design</p>
    </div>
  {:else}
    {#each messages as message}
      {#each message.contents as content}
        {#if content.type === "user_input" || content.type === "user_output"}
        <div class="message {message.role}">
          <div class="message-content">
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
                  <!-- <div class="command-item"> -->
                    <details class="arguments-details">
                      <summary>
                        {command.cmd.type} {(command.cmd as any).id ? `(ID: ${(command.cmd as any).id})` : ''}
                      </summary>
                      <pre>{JSON.stringify(command.cmd, null, 2)}</pre>
                    </details>
                  <!-- </div> -->
                {/each}
              </details>
            </div>
          </fieldset>
        </div>
        <!-- Skipping the tool result UI for now -->
        <!-- {:else if content.type === "tool_result" && content.name === "figma-design-tool"}
          <div class="message-content">
            Got this result from the Figma tool:
            {content.content.status}
          </div> -->
        {/if}
      {/each}
    {/each}
  {/if}
  {#if isLoading}
    <div class="message assistant">
      <div class="message-content loading">
        <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
      </div>
    </div>
  {/if}
</div>
