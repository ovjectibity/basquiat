import { z } from 'zod';
import type { ModelMessage } from './messages';
import { FigmaDesignToolZ, ExecuteCommandsResultZ } from './figmatoolschema';

const UserInputZ = z.object({
  type: z.literal("user_input"),
  content: z.string()
});

const AgentWorkflowInstructionZ = z.object({
  type: z.literal("agent_workflow_instruction"),
  content: z.string()
});

const UserOutputZ = z.object({
  type: z.literal("user_output"),
  content: z.string()
});

const AssistantWorkflowInstructionZ = z.object({
  type: z.literal("assistant_workflow_instruction"),
  content: z.literal("stop")
});

const FigmaDesignToolResultZ = z.object({
  type: z.literal("tool_result"),
  name: z.literal("figma-design-tool"),
  content: ExecuteCommandsResultZ,
});

const ToolResultZ = FigmaDesignToolResultZ;

const FigmaDesignToolUseZ = z.object({
  type: z.literal("tool_use"),
  name: z.literal("figma-design-tool"),
  content: z.object({
    input: FigmaDesignToolZ,
  }),
});

const ToolUseZ = FigmaDesignToolUseZ;

const UserModelMessageContentsZ = z.union([
  UserInputZ, 
  AgentWorkflowInstructionZ, 
  ToolResultZ
]);

const AssistantModelMessageContentsZ = z.union([
  UserOutputZ, 
  AssistantWorkflowInstructionZ, 
  ToolUseZ
]);

export const UserModelMessageZ = z.object({
  role: z.literal("user"),
  contents: z.array(UserModelMessageContentsZ)
});

export const AssistantModelMessageZ = z.object({
  role: z.literal("assistant"),
  contents: z.array(AssistantModelMessageContentsZ)
});

export const ModelMessageZ = z.discriminatedUnion("role", [
  UserModelMessageZ,
  AssistantModelMessageZ
]) satisfies z.ZodType<ModelMessage>;

export const ModelMessageSchema = z.toJSONSchema(ModelMessageZ) as any;
export const AssistantModelMessageSchema = z.toJSONSchema(AssistantModelMessageZ) as any;
