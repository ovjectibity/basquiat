import { z } from 'zod';
import type { FigmaDesignToolInput } from './messages';
import { ExecuteCommandsResult } from './figmacommands';

// Helper Schemas (simplified for illustration, actual Figma types might be more complex)
// For now, using z.any() for complex Figma types not fully defined in the provided files
const TransformZ = z.array(z.array(z.number())).length(3).describe("A 3x2 transformation matrix");
const RectZ = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
}).describe("A rectangle with x, y, width, and height");

const ConstraintsZ = z.object({
  horizontal: z.enum(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']),
  vertical: z.enum(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']),
}).describe("Constraints for resizing in Figma");

const BlendModeZ = z.enum([
  'PASS_THROUGH', 'NORMAL', 'DARKEN', 'MULTIPLY', 'LINEAR_BURN', 'COLOR_BURN',
  'LIGHTEN', 'SCREEN', 'LINEAR_DODGE', 'COLOR_DODGE', 'OVERLAY', 'SOFT_LIGHT',
  'HARD_LIGHT', 'DIFFERENCE', 'EXCLUSION', 'HUE', 'SATURATION', 'COLOR',
  'LUMINOSITY'
]).describe("Blend modes for layers");

const EffectTypeZ = z.enum([
  'DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR'
]).describe("Type of effect");

const EffectZ = z.object({
  type: EffectTypeZ,
  visible: z.boolean(),
  radius: z.number(),
  // More properties for specific effect types would go here
}).partial().describe("An effect applied to a layer");

const SolidPaintZ = z.object({
  type: z.enum(["SOLID"]),
  color: z.object({ r: z.number(), g: z.number(), b: z.number(), a: z.number() }).optional(),
  // Add other paint properties as needed
});

const PaintZ = z.union([
  SolidPaintZ,
  // Add other paint types like 'GRADIENT_LINEAR', 'IMAGE', etc. if needed
]).describe("A fill or stroke paint");

const StrokeCapZ = z.enum([
  'NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL'
]).describe("Stroke cap style");

const StrokeJoinZ = z.enum([
  'MITER', 'BEVEL', 'ROUND'
]).describe("Stroke join style");

const VectorPathZ = z.object({
  windingRule: z.enum(['NONE', 'EVENODD']),
  data: z.string(),
}).describe("Vector path data");

const DetachedInfoZ = z.object({
  componentId: z.string(),
  // Add other properties if necessary
}).describe("Information about a detached component instance");

const LayoutGridTypeZ = z.enum(['GRID', 'ROWS', 'COLUMNS']).describe("Type of layout grid");

const LayoutGridZ = z.object({
  pattern: LayoutGridTypeZ,
  sectionSize: z.number().optional(),
  visible: z.boolean(),
  color: z.object({ r: z.number(), g: z.number(), b: z.number(), a: z.number() }),
  overlayPosition: z.enum(['TOP', 'BOTTOM']),
  alignment: z.enum(['MIN', 'MAX', 'CENTER']),
  gutterSize: z.number().optional(),
  offset: z.number().optional(),
  count: z.number(),
}).describe("A layout grid definition");

const GridTrackSizeZ = z.object({
  // Assuming a simple structure for GridTrackSize, adjust if more details are available
  // e.g., type: z.enum('FIXED') | z.enum('AUTO'), value: z.number()
  value: z.number(), // Placeholder
}).describe("Size of a grid track");


// Property Schemas
const LayoutPropertiesZ = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  relativeTransform: TransformZ.optional(),
  absoluteTransform: TransformZ.optional(),
  absoluteBoundingBox: RectZ.optional(),
  absoluteRenderBounds: RectZ.optional(),
  constraints: ConstraintsZ.optional(),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
  minHeight: z.number().optional(),
  maxHeight: z.number().optional(),
  layoutMode: z.enum(['NONE', 'HORIZONTAL', 'VERTICAL', 'GRID']).optional(),
  layoutWrap: z.enum(['NO_WRAP', 'WRAP']).optional(),
  itemSpacing: z.number().optional(),
  counterAxisSpacing: z.number().optional(),
  paddingLeft: z.number().optional(),
  paddingRight: z.number().optional(),
  paddingTop: z.number().optional(),
  paddingBottom: z.number().optional(),
  primaryAxisAlignItems: z.enum(['MIN', 'MAX', 'CENTER', 'SPACE_BETWEEN']).optional(),
  counterAxisAlignItems: z.enum(['MIN', 'MAX', 'CENTER', 'BASELINE']).optional(),
  counterAxisAlignContent: z.enum(['AUTO', 'SPACE_BETWEEN']).optional(),
  primaryAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional(),
  counterAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional(),
  strokesIncludedInLayout: z.boolean().optional(),
  itemReverseZIndex: z.boolean().optional(),
  layoutSizingHorizontal: z.enum(['FIXED', 'HUG', 'FILL']).optional(),
  layoutSizingVertical: z.enum(['FIXED', 'HUG', 'FILL']).optional(),
  layoutAlign: z.enum(['MIN', 'CENTER', 'MAX', 'STRETCH', 'INHERIT']).optional(),
  layoutGrow: z.number().optional(),
  layoutPositioning: z.enum(['AUTO', 'ABSOLUTE']).optional(),
  gridRowCount: z.number().optional(),
  gridColumnCount: z.number().optional(),
  gridRowGap: z.number().optional(),
  gridColumnGap: z.number().optional(),
  gridRowSpan: z.number().optional(),
  gridColumnSpan: z.number().optional(),
  gridRowAnchorIndex: z.number().optional(),
  gridColumnAnchorIndex: z.number().optional(),
}).describe("Layout properties for Figma nodes");

const VisualPropertiesZ = z.object({
  opacity: z.number().optional(),
  blendMode: BlendModeZ.optional(),
  isMask: z.boolean().optional(),
  effects: z.array(EffectZ).optional(),
  effectStyleId: z.string().optional(),
  cornerRadius: z.union([z.number(), z.enum(['figma.mixed'])]).optional(), // figma.mixed is a special global object
  cornerSmoothing: z.number().optional(),
  topLeftRadius: z.number().optional(),
  topRightRadius: z.number().optional(),
  bottomLeftRadius: z.number().optional(),
  bottomRightRadius: z.number().optional(),
  fills: z.union([z.array(PaintZ), z.enum(['figma.mixed'])]).optional(),
  fillStyleId: z.union([z.string(), z.enum(['figma.mixed'])]).optional(),
  strokes: z.array(PaintZ).optional(),
  strokeStyleId: z.string().optional(),
  strokeWeight: z.union([z.number(), z.enum(['figma.mixed'])]).optional(),
  strokeAlign: z.enum(['CENTER', 'INSIDE', 'OUTSIDE']).optional(),
  strokeCap: z.union([StrokeCapZ, z.enum(['figma.mixed'])]).optional(),
  strokeJoin: z.union([StrokeJoinZ, z.enum(['figma.mixed'])]).optional(),
  dashPattern: z.array(z.number()).optional(),
  strokeMiterLimit: z.number().optional(),
  fillGeometry: z.array(VectorPathZ).optional(),
  strokeGeometry: z.array(VectorPathZ).optional(),
  strokeTopWeight: z.number().optional(),
  strokeBottomWeight: z.number().optional(),
  strokeLeftWeight: z.number().optional(),
  strokeRightWeight: z.number().optional(),
}).describe("Visual properties for Figma nodes");

const ScenePropertiesZ = z.object({
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
}).describe("Scene properties for Figma nodes");

const FramePropertiesZ = z.object({
  detachedInfo: DetachedInfoZ.optional(),
  layoutGrids: z.array(LayoutGridZ).optional(),
  gridStyleId: z.string().optional(),
  clipsContent: z.boolean().optional(),
  paddingTop: z.number().optional(),
  paddingBottom: z.number().optional(),
  paddingLeft: z.number().optional(),
  paddingRight: z.number().optional(),
  horizontalPadding: z.number().optional(), // DEPRECATED
  verticalPadding: z.number().optional(),   // DEPRECATED
  primaryAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional(),
  counterAxisSizingMode: z.enum(['FIXED', 'AUTO']).optional(),
  strokesIncludedInLayout: z.boolean().optional(),
  layoutWrap: z.enum(['NO_WRAP', 'WRAP']).optional(),
  primaryAxisAlignItems: z.enum(['MIN', 'MAX', 'CENTER', 'SPACE_BETWEEN']).optional(),
  counterAxisAlignItems: z.enum(['MIN', 'MAX', 'CENTER', 'BASELINE']).optional(),
  counterAxisAlignContent: z.enum(['AUTO', 'SPACE_BETWEEN']).optional(),
  itemSpacing: z.number().optional(),
  counterAxisSpacing: z.number().optional(),
  itemReverseZIndex: z.boolean().optional(),
  gridRowCount: z.number().optional(),
  gridColumnCount: z.number().optional(),
  gridRowGap: z.number().optional(),
  gridColumnGap: z.number().optional(),
  gridRowSizes: z.array(GridTrackSizeZ).optional(),
  gridColumnSizes: z.array(GridTrackSizeZ).optional(),
}).describe("Frame-specific properties for Figma nodes");

// Command Schemas
const CreateNodeZ = z.object({
  type: z.enum(["create-node"]),
  nodeName: z.enum(["rectangle", "frame", "group", "page", "text", "line", "instance"]),
  layout: LayoutPropertiesZ.optional(),
  visual: VisualPropertiesZ.optional(),
  scene: ScenePropertiesZ.optional(),
  frame: FramePropertiesZ.optional(),
}).describe("Command to create a new node");

const EditNodePropertiesZ = z.object({
  type: z.enum(["edit-node"]),
  id: z.string(),
  layout: LayoutPropertiesZ.optional(),
  visual: VisualPropertiesZ.optional(),
  scene: ScenePropertiesZ.optional(),
  frame: FramePropertiesZ.optional(),
}).describe("Command to edit properties of an existing node");

const NodeInfoItemsZ = z.enum(["name", "layout", "scene", "frame"]).describe("Items to request for node info");

const GetNodeInfoZ = z.object({
  type: z.enum(["get-node-info"]),
  id: z.string(),
  needed: z.array(NodeInfoItemsZ),
}).describe("Command to get information about a node");

export const GetNodeInfoResultZ = z.object({
  type: z.enum(["get-node-info-result"]),
  id: z.string(),
  name: z.string().optional(),
  layout: LayoutPropertiesZ.optional(),
  visual: VisualPropertiesZ.optional(),
  scene: ScenePropertiesZ.optional(),
  frame: FramePropertiesZ.optional(),
}).describe("Result of getting node information");

const RemoveNodeZ = z.object({
  type: z.enum(["remove-node"]),
  id: z.number(),
}).describe("Command to remove a node");

const GetCurrentSelectedNodesZ = z.object({
  type: z.enum(["get-current-selected-nodes"]),
}).describe("Command to get currently selected nodes");

const GetLayerVisualZ = z.object({
  type: z.enum(["get-layer-visual"]),
  id: z.string(),
}).describe("Command to get visual information of a layer");

// Main Command Union Type
export const CommandZ = z.discriminatedUnion("type", [
  CreateNodeZ,
  EditNodePropertiesZ,
  GetNodeInfoZ,
  RemoveNodeZ,
  GetCurrentSelectedNodesZ,
  GetLayerVisualZ,
]).describe("Union of all possible Figma commands");

// Execute command schemas
export const ExecuteCommandZ = z.object({
  type: z.enum(["execute_command"]),
  id: z.string(),
  cmd: CommandZ,
}).describe("A single command to be executed");

export const ExecuteCommandsZ = z.object({
  type: z.enum(["execute_commands"]),
  id: z.string(),
  cmds: z.array(ExecuteCommandZ),
}).describe("A collection of commands to be executed in sequence");

export const ExecuteCommandResultZ = z.object({
  type: z.enum(["execute_command_result"]),
  cmd: CommandZ,
  id: z.string(),
  status: z.enum(["success", "failure"]),
  visual: z.string().optional(),
  nodeInfo: GetNodeInfoResultZ.optional(),
}).describe("Result of a single command execution");

export const ExecuteCommandsResultZ = z.object({
  type: z.enum(["execute_commands_result"]),
  cmds: z.array(ExecuteCommandResultZ),
  id: z.string(),
  status: z.enum(["success", "failure", "partial_failures"]),
}).describe("Result of a collection of commands execution") satisfies z.ZodType<ExecuteCommandsResult>;

// Figma Design Tool Input Schema
export const FigmaDesignToolZ = z.object({
  commands: ExecuteCommandsZ,
  objective: z.string(),
}).describe("View and modify a user-owned Figma Design files using this tool") satisfies z.ZodType<FigmaDesignToolInput>;

export const FigmaDesignToolSchema = z.toJSONSchema(FigmaDesignToolZ) as any;
export const FigmaDesignToolResponseSchema = z.toJSONSchema(ExecuteCommandsResultZ) as any;
