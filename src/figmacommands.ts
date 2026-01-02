/** 1. Creating new nodes: 
 *      Pages -> 
 *      Rectangles -> DONE
 *      Frames -> 
 *      Component instances -> 
 * 2. Relating nodes: 
 *      Grouping
 *      ungrouping
 *      Getting & setting children
 *      Flattening 
 * 3. Editing visual properties -> DONE
 * 4. Editing layout properties -> DONE
 * 4. Editing scene propertires -> DONE
 * 5. Frame propertires -> DONE
 * 6. Navigation: 
 *      Change current page ->  
 *      Get all nodes in the current page -> 
 *      Get visual (selected node, current page) -> 
 *      Get info on all pages
 *      view current page -> 
 *      view selection ->
 *      Get selection ->  
 *      select/unselect -> 
 * 7. Getting node info: 
 *      Get props info: 
 *      get name: 
 *      Get parent or children info: 
 * **/

/**
 * A comprehensive interface of all layout-related properties
 * available on a FrameNode (and other layout-capable nodes) in Figma.
 * * Modifications:
 * - All properties are mutable (no readonly).
 * - All properties are optional.
 * - 'null' unions have been removed.
 */
export interface LayoutProperties {
  // --- Base Layout (Coordinate System) ---
  
  /** The position of the node relative to its parent. */
  x?: number;
  
  /** The position of the node relative to its parent. */
  y?: number;
  
  /** The width of the node. */
  width?: number;
  
  /** The height of the node. */
  height?: number;
  
  /** The rotation of the node in degrees (-180 to 180). */
  rotation?: number;
  
  /** * The position of the node relative to its parent as a matrix. 
   * Used for advanced transformations (skew, rotate, translate).
   */
  relativeTransform?: Transform;
  
  /** The position relative to the page. */
  absoluteTransform?: Transform;
  
  /** * The bounds excluding effects (shadows/strokes). 
   * x/y represent absolute page position.
   */
  absoluteBoundingBox?: Rect;
  
  /** * The actual bounds including visual effects (shadows, thick strokes). 
   * Useful for exporting.
   */
  absoluteRenderBounds?: Rect;

  // --- Resizing & Constraints ---

  /** Constraints apply when the parent is resized (if not Auto Layout). */
  constraints?: Constraints;

  /** Minimum width for Auto Layout frames or their children. */
  minWidth?: number;
  
  /** Maximum width for Auto Layout frames or their children. */
  maxWidth?: number;
  
  /** Minimum height for Auto Layout frames or their children. */
  minHeight?: number;
  
  /** Maximum height for Auto Layout frames or their children. */
  maxHeight?: number;


  // --- Auto Layout (Container Properties) ---
  
  /** * Determines if the frame is Auto Layout.
   * 'NONE' = Regular Frame
   * 'HORIZONTAL' = Row
   * 'VERTICAL' = Column
   */
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID';
//   layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';

  /** Wrapping behavior for Auto Layout (e.g., multiline flex). */
  layoutWrap?: 'NO_WRAP' | 'WRAP';

  /** Distance between items (Gap). */
  itemSpacing?: number;
  
  /** Distance between lines when wrapping is enabled. */
  counterAxisSpacing?: number;

  /** Padding inside the frame. */
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;

  /** Alignment of children along the primary axis (Justify Content). */
  primaryAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';
  
  /** Alignment of children along the counter axis (Align Items). */
  counterAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER' | 'BASELINE';
  
  /** Alignment of wrapped lines (Align Content). Only if wrapped. */
  counterAxisAlignContent?: 'AUTO' | 'SPACE_BETWEEN';

  /** * How the primary axis size is determined. 
   * 'FIXED' = User defined width/height.
   * 'AUTO' = Hug Contents.
   */
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  
  /** How the counter axis size is determined. */
  counterAxisSizingMode?: 'FIXED' | 'AUTO';

  /** Whether strokes are included in layout calculations (box-sizing). */
  strokesIncludedInLayout?: boolean;

  /** Visual stacking order (First on top vs Last on top). */
  itemReverseZIndex?: boolean;


  // --- Auto Layout (Child Properties) ---
  // These apply to nodes *inside* an Auto Layout frame.

  /**
   * Shorthand for Horizontal Resizing.
   * Maps to: 'FIXED' | 'HUG' | 'FILL'
   */
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';

  /**
   * Shorthand for Vertical Resizing.
   * Maps to: 'FIXED' | 'HUG' | 'FILL'
   */
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';

  /** * How this child aligns in the counter axis (overrides parent). 
   * 'INHERIT' means follow parent's counterAxisAlignItems.
   */
  layoutAlign?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT';

  /** Flex grow factor. 0 = Fixed, 1 = Fill Container. */
  layoutGrow?: number;

  /** Whether the child ignores Auto Layout and floats freely. */
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';


  // --- Grid Layout Properties (New) ---
  // Only applicable when layoutMode === 'GRID'

  gridRowCount?: number;
  gridColumnCount?: number;
  gridRowGap?: number;
  gridColumnGap?: number;
  
  // Child properties in a Grid
  gridRowSpan?: number;
  gridColumnSpan?: number;
  gridRowAnchorIndex?: number;
  gridColumnAnchorIndex?: number;
}

/**
 * A comprehensive interface of all visual styling properties
 * (Blend, Corners, Geometry, Strokes) available on Figma nodes.
 * * * Modifications:
 * - All properties are mutable (no readonly).
 * - All properties are optional.
 * - 'null' unions have been removed.
 */
export interface VisualProperties {
  // --- Blend Properties (Opacity & Effects) ---
  
  /** The opacity of the layer (0 to 1). */
  opacity?: number;
  
  /** The blend mode (e.g., 'PASS_THROUGH', 'MULTIPLY', 'OVERLAY'). */
  blendMode?: BlendMode;
  
  /** Whether this node acts as a mask for sibling nodes. */
  isMask?: boolean;
  
  /** The list of effects (Shadows, Blurs, etc.). */
  effects?: ReadonlyArray<Effect>;
  
  /** The ID of the effect style linked to this node. */
  effectStyleId?: string;


  // --- Corner Properties (Rounding) ---
  
  /** Global corner radius. Returns 'figma.mixed' if corners differ. */
  cornerRadius?: number | typeof figma.mixed;
  
  /** Corner smoothing (iOS "Squircle" effect), value from 0 to 1. */
  cornerSmoothing?: number;
  
  /** Individual corner radius: Top Left */
  topLeftRadius?: number;
  
  /** Individual corner radius: Top Right */
  topRightRadius?: number;
  
  /** Individual corner radius: Bottom Left */
  bottomLeftRadius?: number;
  
  /** Individual corner radius: Bottom Right */
  bottomRightRadius?: number;


  // --- Geometry Properties (Fills & Strokes) ---
  
  /** The list of fill paints (Solid, Gradient, Image). */
  fills?: ReadonlyArray<Paint> | typeof figma.mixed;
  
  /** The ID of the fill style linked to this node. */
  fillStyleId?: string | typeof figma.mixed;
  
  /** The list of stroke paints. */
  strokes?: ReadonlyArray<Paint>;
  
  /** The ID of the stroke style linked to this node. */
  strokeStyleId?: string;
  
  /** * Global stroke weight. 
   * Returns 'figma.mixed' if sides have different weights.
   */
  strokeWeight?: number | typeof figma.mixed;
  
  /** Alignment of the stroke ('INSIDE', 'OUTSIDE', 'CENTER'). */
  strokeAlign?: 'CENTER' | 'INSIDE' | 'OUTSIDE';
//   strokeAlign?: 'MIN' | 'CENTER' | 'MAX'; // Note: Figma API maps these to INSIDE/CENTER/OUTSIDE often, but internal types use MIN/MAX logic sometimes. 'INSIDE' | 'OUTSIDE' | 'CENTER' is the standard string union for this property.
  
  /** Decoration at the ends of open paths ('NONE', 'ROUND', 'SQUARE', etc.). */
  strokeCap?: StrokeCap | typeof figma.mixed;
  
  /** Decoration at corners ('MITER', 'BEVEL', 'ROUND'). */
  strokeJoin?: StrokeJoin | typeof figma.mixed;
  
  /** The dash pattern for dashed strokes (e.g., [10, 5]). */
  dashPattern?: ReadonlyArray<number>;
  
  /** The limit for miter joins. */
  strokeMiterLimit?: number;
  
  /** The vector paths for the fill. */
  fillGeometry?: ReadonlyArray<VectorPath>;
  
  /** The vector paths for the stroke. */
  strokeGeometry?: ReadonlyArray<VectorPath>;


  // --- Individual Stroke Weights ---
  // These allow defining borders like CSS (e.g., only top border)
  
  strokeTopWeight?: number;
  strokeBottomWeight?: number;
  strokeLeftWeight?: number;
  strokeRightWeight?: number;
}

/**
 * Interface representing the specific properties found in the 
 * "Frame-related properties" section of the Figma FrameNode API.
 * * Modifications:
 * - All properties are optional (?)
 * - Readonly modifiers removed
 * - Null unions removed
 */
export interface FrameProperties {
  /** * Includes the id or key of the component the node was detached from.
   * (Typically read-only in the API, but mutable here per request).
   */
  detachedInfo?: DetachedInfo;

  /** * Array of LayoutGrid objects used as layout grids on this node. 
   */
  layoutGrids?: ReadonlyArray<LayoutGrid>;

  /** * The id of the GridStyle object linked to the layoutGrids property. 
   */
  gridStyleId?: string;

  /** * Whether the frame clips its contents. 
   */
  clipsContent?: boolean;

  /** * Applicable only on auto-layout frames. 
   * Determines the top padding between the border and children. 
   */
  paddingTop?: number;

  /** * Applicable only on auto-layout frames. 
   * Determines the bottom padding between the border and children. 
   */
  paddingBottom?: number;

  /** * Applicable only on auto-layout frames. 
   * Determines the left padding between the border and children. 
   */
  paddingLeft?: number;

  /** * Applicable only on auto-layout frames. 
   * Determines the right padding between the border and children. 
   */
  paddingRight?: number;

  /** * DEPRECATED: Use paddingLeft and paddingRight instead. 
   */
  horizontalPadding?: number;

  /** * DEPRECATED: Use paddingTop and paddingBottom instead. 
   */
  verticalPadding?: number;

  /** * Applicable only on auto-layout frames. 
   * Determines if the primary axis has fixed or auto length.
   */
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';

  /** * Applicable only on auto-layout frames. 
   * Determines if the counter axis has fixed or auto length.
   */
  counterAxisSizingMode?: 'FIXED' | 'AUTO';

  /** * Applicable only on auto-layout frames. 
   * Determines whether strokes are included in layout calculations (box-sizing).
   */
  strokesIncludedInLayout?: boolean;

  /** * Determines whether this layer should use wrapping auto-layout. 
   */
  layoutWrap?: 'NO_WRAP' | 'WRAP';

  /** * Determines how the auto-layout frame's children should be aligned in the primary axis. 
   */
  primaryAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';

  /** * Determines how the auto-layout frame's children should be aligned in the counter axis. 
   */
  counterAxisAlignItems?: 'MIN' | 'MAX' | 'CENTER' | 'BASELINE';

  /** * Applicable only on auto-layout frames with layoutWrap set to "WRAP". 
   * Determines how wrapped tracks are spaced out.
   */
  counterAxisAlignContent?: 'AUTO' | 'SPACE_BETWEEN';

  /** * Determines distance between children of the frame. 
   */
  itemSpacing?: number;

  /** * Applicable only with layoutWrap set to "WRAP". 
   * Determines the distance between wrapped tracks. 
   */
  counterAxisSpacing?: number;

  /** * Determines the canvas stacking order of layers in this frame. 
   */
  itemReverseZIndex?: boolean;

  /** * Applicable only on 'GRID' layoutMode. 
   * Determines the number of rows in the grid.
   */
  gridRowCount?: number;

  /** * Applicable only on 'GRID' layoutMode. 
   * Determines the number of columns in the grid.
   */
  gridColumnCount?: number;

  /** * Applicable only on 'GRID' layoutMode. 
   * Determines the gap between rows in the grid.
   */
  gridRowGap?: number;

  /** * Applicable only on 'GRID' layoutMode. 
   * Determines the gap between columns in the grid.
   */
  gridColumnGap?: number;

  /** * Applicable only on 'GRID' layoutMode. 
   * Returns an array representing the rows in the grid.
   */
  gridRowSizes?: Array<GridTrackSize>;

  /** * Applicable only on 'GRID' layoutMode. 
   * Returns an array representing the columns in the grid.
   */
  gridColumnSizes?: Array<GridTrackSize>;
}

/**
 * A comprehensive interface of generic scene properties 
 * (Visibility, Locking, Variables, Connections) available on SceneNodes.
 * * Modifications:
 * - All properties are mutable (no readonly).
 * - All properties are optional.
 * - 'null' unions have been removed.
 */
export interface SceneProperties {
  // --- Basic State ---
  /** Whether the node is visible on the canvas. */
  visible?: boolean;

  /** Whether the node is locked (preventing selection/editing). */
  locked?: boolean;
}

export interface CreateNode {
  type: "create-node",
  nodeName: "rectangle" | "frame" | "group" | 
      "page" | "text" | "line" | 
      "instance",
  layout?: LayoutProperties,
  visual?: VisualProperties,
  scene?: SceneProperties,
  frame?: FrameProperties
}

export interface EditNodeProperties {
  type: "edit-node"
  id: string,
  layout?: LayoutProperties,
  visual?: VisualProperties,
  scene?: SceneProperties,
  frame?: FrameProperties
}

//TODO: fine tune this to expose 
// the exact properties to be queried
export type NodeInfoItems = 
  "name" | "layout" | 
  "scene" | "frame";

export interface GetNodeInfo {
  type: "get-node-info",
  id: string
  needed: Array<NodeInfoItems>
}

export interface GetNodeInfoResult {
  type: "get-node-info-result",
  id: string,
  name?: string,
  layout?: LayoutProperties,
  visual?: VisualProperties,
  scene?: SceneProperties,
  frame?: FrameProperties
}

export interface RemoveNode {
  type: "remove-node",
  id: number
}

export interface GetCurrentSelectedNodes {
  type: "get-current-selected-nodes"
}

export interface GetLayerVisual {
  type: "get-layer-visual"
  id: string
}

export type Command = 
  CreateNode | EditNodeProperties | 
  GetNodeInfo | RemoveNode | 
  GetLayerVisual | GetCurrentSelectedNodes;

export interface ExecuteCommand {
  type: "execute_command",
  id: string, 
  cmd: Command
}

export interface ExecuteCommands {
  type: "execute_commands",
  id: string, 
  cmds: ExecuteCommand[]
}

export interface ExecuteCommandResult {
  type: "execute_command_result",
  cmd: Command,
  id: string,
  status: "success" | "failure",
  visual?: string,
  nodeInfo?: Array<GetNodeInfoResult>,
  error?: string
}

export interface ExecuteCommandsResult {
  type: "execute_commands_result",
  cmds: ExecuteCommandResult[],
  id: string,
  status: "success" | "failure" | "partial_failures",
  error?: string
}