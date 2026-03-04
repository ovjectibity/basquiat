# Release Notes

## Version 3
- Added image attachment support in chat (PNG/JPG, one file at a time).
- Improved attachment UI so filename display does not shift action buttons.
- Fixed Anthropic tool-use/tool-result history issues when switching providers mid-conversation.
- Updated Anthropic Sonnet/Opus model IDs to current supported aliases.
- Added backward-compatible model key normalization for older saved threads.
- Added automatic Anthropic fallback when a selected model does not support structured output format.

## Version 2
- Added support for discovering and importing library components.
- Added support for creating and styling text nodes more reliably.
- Improved model selection so switching between Anthropic and Google models works correctly.
- Fixed turn-stop behavior to avoid active-turn errors when sending a new message.
- Added better error handling and clearer error messages in the chat.
- Added schema-recovery feedback so the agent can retry invalid model responses.
- Added prompt guidance for library component usage and text styling workflows.
