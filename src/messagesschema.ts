import { z } from 'zod';
import type { ModelMessage, ModelMessageO } from './messages';

const UserInputZ = z.object({
  type: z.literal("user_input"),
  content: z.string()
});

const AgentWorkflowInstructionZ = z.object({
  type: z.literal("workflow_instruction"),
  content: z.string()
});

const UserOutputZ = z.object({
  type: z.literal("user_output"),
  content: z.string()
});

const AssistantWorkflowInstructionZ = z.object({
  type: z.literal("workflow_instruction"),
  content: z.literal("stop")
});

const UserModelMessageZ = z.object({
  role: z.literal("user"),
  contents: z.array(z.union([UserInputZ, AgentWorkflowInstructionZ]))
});

const AssistantModelMessageZ = z.object({
  role: z.literal("assistant"),
  contents: z.array(z.union([UserOutputZ, AssistantWorkflowInstructionZ]))
});

export const ModelMessageZ = z.discriminatedUnion("role", [
  UserModelMessageZ,
  AssistantModelMessageZ
]) satisfies z.ZodType<ModelMessageO>;

export const ModelMessageSchema = z.toJSONSchema(ModelMessageZ) as any;
export const AssistantModelMessageSchema = z.toJSONSchema(AssistantModelMessageZ) as any;