import { z } from 'zod';
import type { ModelMessageO } from './messages';

const UserInputZ = z.object({
  type: z.enum(["user_input"]),
  content: z.string()
});

const AgentWorkflowInstructionZ = z.object({
  type: z.enum(["agent_workflow_instruction"]),
  content: z.string()
});

const UserOutputZ = z.object({
  type: z.enum(["user_output"]),
  content: z.string()
});

const AssistantWorkflowInstructionZ = z.object({
  type: z.enum(["assistant_workflow_instruction"]),
  content: z.enum(["stop"])
});

const UserModelMessageContentsZ = z.union([
  UserInputZ, 
  AgentWorkflowInstructionZ
]);

const AssistantModelMessageContentsZ = z.union([
  UserOutputZ, 
  AssistantWorkflowInstructionZ
]);

export const UserModelMessageZ = z.object({
  role: z.enum(["user"]),
  contents: z.array(UserModelMessageContentsZ)
});

export const AssistantModelMessageZ = z.object({
  role: z.enum(["assistant"]),
  contents: z.array(AssistantModelMessageContentsZ)
});

export const ModelMessageZ = z.discriminatedUnion("role", [
  UserModelMessageZ,
  AssistantModelMessageZ
]) satisfies z.ZodType<ModelMessageO>;

export const ModelMessageSchema = z.toJSONSchema(ModelMessageZ) as any;
export const AssistantModelMessageSchema = z.toJSONSchema(AssistantModelMessageZ) as any;
export const UserModelMessageSchema = z.toJSONSchema(UserModelMessageZ) as any;
