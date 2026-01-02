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
      <div class="message {message.role}">
        {#each message.contents as content}
          {#if content.type === "user_input" || content.type === "user_output"}
            <div class="message-content">
              {content.content}
            </div>
          {:else if content.type === "tool_use" && content.name === "figma-design-tool"}
            <div class="message-content">
              Invoking Figma tool: 
              {content.content.input.objective}
              <details>
                <summary>Commands</summary>
                {#each content.content.input.commands.cmds as command}
                  <div>
                    {command.cmd.type} {(command.cmd as any).id ? `(ID: ${(command.cmd as any).id})` : ''}
                    <details>
                      <summary>Arguments</summary>
                      <pre>{JSON.stringify(command.cmd, null, 2)}</pre>
                    </details>
                  </div>
                {/each}
              </details>
            </div>
          {:else if content.type === "tool_result" && content.name === "figma-design-tool"}
            <div class="message-content">
              Got this result from the Figma tool:
              {content.content.status}
            </div>
          {/if}
        {/each}
      </div>
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
