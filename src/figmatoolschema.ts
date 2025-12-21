import { z } from 'zod';
import type { FigmaDesignToolInput } from './messages';

const CreateRectangleZ = z.object({
  type: z.literal("create-rectangle"),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  fill: z.string().optional()
});

const GetLayerVisualZ = z.object({
  type: z.literal("get-layer-visual"),
  layerId: z.string().optional()
});

const MoveLayerZ = z.object({
  type: z.literal("move-layer"),
  layerId: z.string(),
  x: z.number(),
  y: z.number()
});

const ClosePluginZ = z.object({
  type: z.literal("close_plugin")
});

const CommandZ = z.discriminatedUnion("type", [
  GetLayerVisualZ,
  CreateRectangleZ,
  ClosePluginZ,
  MoveLayerZ
]);

const ExecuteCommandZ = z.object({
  type: z.literal("execute_command"),
  id: z.number(),
  cmd: CommandZ
});

const ExecuteCommandsZ = z.object({
  type: z.literal("execute_commands"),
  id: z.number(),
  cmds: z.array(ExecuteCommandZ)
});

export const FigmaDesignToolZ = z.object({
  commands: ExecuteCommandsZ,
  objective: z.string()
}).describe("View and modify a user-owned Figma Design files using this tool") satisfies z.ZodType<FigmaDesignToolInput>;

export const FigmaDesignToolSchema = z.toJSONSchema(FigmaDesignToolZ) as any;
