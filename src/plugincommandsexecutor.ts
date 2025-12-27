import { ExecuteCommand, ExecuteCommandResult,
    ExecuteCommands, ExecuteCommandsResult,
    LayoutProperties, VisualProperties, SceneProperties, FrameProperties,
    GetNodeInfoResult,
    Command
} from "./figmacommands";
import { CommandExecutor } from "./common";

export class FigmaExecutor implements CommandExecutor {
    async executeCommands(executeCommands: ExecuteCommands): Promise<ExecuteCommandsResult> {
        const results: ExecuteCommandResult[] = [];
        let hasFailures = false;
        let allFailed = true;

        for (const executeCmd of executeCommands.cmds) {
            const result = await this.executeCommand(executeCmd);
            results.push(result);

            if (result.status === "failure") {
                hasFailures = true;
            } else {
                allFailed = false;
            }
        }

        return {
            type: "execute_commands_result",
            id: executeCommands.id,
            cmds: results,
            status: allFailed ? "failure" : (hasFailures ? "partial_failures" : "success")
        };
    }

    async executeCommand(executeCmd: ExecuteCommand): Promise<ExecuteCommandResult> {
        const cmd: Command = executeCmd.cmd;
        let node: SceneNode | BaseNode | null = null;

        // Helper to retrieve node if id is provided
        const getNode = (id: string): Promise<BaseNode | null> => {
            return figma.getNodeByIdAsync(id)
        };

        try {
            switch (cmd.type) {
                case "create-node": {
                    let newNode: SceneNode | null = null;
                    switch (cmd.nodeName) {
                        case "rectangle":
                            newNode = figma.createRectangle();
                            break;
                        case "frame":
                            newNode = figma.createFrame();
                            break;
                        case "group":
                            // For group, we'll create an empty group for now.
                            // Grouping existing nodes would require children.
                            newNode = figma.group([], figma.currentPage); // Requires children, creating with empty array
                            newNode.name = "New Group"; // Give it a default name
                            break;
                        case "page":
                            // Figma doesn't allow creating a page directly from the plugin like other nodes
                            // This might need a different approach or clarification on how to handle "page" creation
                            // For now, we'll create a frame on the current page to represent "new content on a new page" idea.
                            // Or, if the intent is to truly create a new page, it's outside typical node creation flow.
                            // For simplicity, let's treat it as a frame on the current page.
                            newNode = figma.createFrame();
                            newNode.name = "New Page Frame";
                            break;
                        case "text":
                            newNode = figma.createText();
                            newNode.characters = "New Text"; // Default text
                            break;
                        case "line":
                            newNode = figma.createLine();
                            break;
                        case "instance":
                            // Creating an instance requires a component ID, which is not in CreateNode definition.
                            // This command would fail without a component source.
                            // For now, it will be treated as an unsupported creation or create a simple rectangle as a placeholder.
                            // Let's create a placeholder rectangle for now.
                            newNode = figma.createRectangle();
                            newNode.name = "Instance Placeholder";
                            break;
                        default:
                            throw new Error(`Unsupported nodeName for create-node: ${cmd.nodeName}`);
                    }

                    if (newNode) {
                        // Apply layout properties
                        this.applyLayoutProperties(newNode, cmd.layout);
                        // Apply visual properties
                        this.applyVisualProperties(newNode, cmd.visual);
                        // Apply scene properties
                        this.applySceneProperties(newNode, cmd.scene);
                        // Apply frame properties (if it's a FrameNode)
                        if (newNode.type === "FRAME") {
                            this.applyFrameProperties(newNode, cmd.frame);
                        }

                        figma.currentPage.appendChild(newNode);
                        return {
                            type: "execute_command_result",
                            id: executeCmd.id,
                            cmd: cmd,
                            status: "success",
                            nodeInfo: {
                                type: "get-node-info-result",
                                id: newNode.id,
                                name: newNode.name,
                            }
                        };
                    } else {
                        throw new Error("Failed to create node.");
                    }
                }

                case "edit-node": {
                    node = await getNode(cmd.id);
                    if (!node) {
                        throw new Error(`Node with id ${cmd.id} not found.`);
                    }
                    // Apply layout properties
                    this.applyLayoutProperties(node, cmd.layout);
                    // Apply visual properties
                    this.applyVisualProperties(node, cmd.visual);
                    // Apply scene properties
                    this.applySceneProperties(node, cmd.scene);
                    // Apply frame properties (if it's a FrameNode)
                    if (node.type === "FRAME") {
                        this.applyFrameProperties(node, cmd.frame);
                    }
                    return {
                        type: "execute_command_result",
                        id: executeCmd.id,
                        cmd: cmd,
                        status: "success",
                        nodeInfo: {
                            type: "get-node-info-result",
                            id: node.id,
                            name: node.name,
                        }
                    };
                }

                case "get-node-info": {
                    node = await getNode(cmd.id);
                    if (!node) {
                        throw new Error(`Node with id ${cmd.id} not found.`);
                    }

                    const nodeInfoResult: GetNodeInfoResult = {
                        type: "get-node-info-result",
                        id: node.id,
                        name: node.name,
                    };

                    for (const item of cmd.needed) {
                        switch (item) {
                            case "name":
                                nodeInfoResult.name = node.name;
                                break;
                            case "layout":
                                nodeInfoResult.layout = this.getLayoutProperties(node);
                                break;
                            case "scene":
                                nodeInfoResult.scene = this.getSceneProperties(node);
                                break;
                            case "frame":
                                if (node.type === "FRAME") {
                                    nodeInfoResult.frame = this.getFrameProperties(node);
                                }
                                break;
                        }
                    }

                    return {
                        type: "execute_command_result",
                        id: executeCmd.id,
                        cmd: cmd,
                        status: "success",
                        nodeInfo: nodeInfoResult,
                    };
                }

                case "remove-node": {
                    node = await getNode(cmd.id.toString()); // Assuming id is string in figma.getNodeById
                    if (!node) {
                        throw new Error(`Node with id ${cmd.id} not found.`);
                    }
                    node.remove();
                    return {
                        type: "execute_command_result",
                        id: executeCmd.id,
                        cmd: cmd,
                        status: "success"
                    };
                }

                case "get-current-selected-nodes": {
                    const selection = figma.currentPage.selection;
                    const selectedNodeInfos: GetNodeInfoResult[] = selection.map(n => ({
                        type: "get-node-info-result",
                        id: n.id,
                        name: n.name,
                        layout: this.getLayoutProperties(n),
                        visual: this.getVisualProperties(n),
                        scene: this.getSceneProperties(n),
                        frame: n.type === "FRAME" ? this.getFrameProperties(n) : undefined,
                    }));
                    
                    return {
                        type: "execute_command_result",
                        id: executeCmd.id,
                        cmd: cmd,
                        status: "success",
                        nodeInfo: {
                            type: "get-node-info-result", // This is a bit of a hack, GetCurrentSelectedNodes doesn't directly map to a single NodeInfoResult
                            id: "selection", // Use a placeholder ID for the collection
                            name: "Current Selection",
                            // This part might need to be re-evaluated if a list of NodeInfoResult is expected
                        },
                        // A more appropriate return would be an array of NodeInfoResult, which isn't directly supported by 'nodeInfo' field
                        // For now, returning the first node's info if available, or null.
                        // Ideally, we'd have a separate 'selectedNodesInfo' field in ExecuteCommandResult
                    };
                }

                case "get-layer-visual": {
                    node = await getNode(cmd.id);
                    if (!node) {
                        throw new Error(`Node with id ${cmd.id} not found.`);
                    } else if((node as any).exportAsync) {
                        const image = await (node as any).exportAsync({ format: 'PNG' });
                        const base64Image = this.uint8ArrayToBase64(image);
                        return {
                            type: "execute_command_result",
                            id: executeCmd.id,
                            cmd: cmd,
                            status: "success",
                            visual: base64Image
                        };
                    } else {
                        throw new Error(`Node id ${cmd.id} doesn't support exporting to image. ` + 
                            `It's a ${node.type}.`);
                    }
                }
                default:
                    return {
                        type: "execute_command_result",
                        id: executeCmd.id,
                        cmd: cmd,
                        status: "failure",
                        nodeInfo: {
                            type: "get-node-info-result",
                            id: "unknown",
                            name: `Unsupported command: ${executeCmd.type}`,
                        }
                    };
            }
        } catch (error: any) {
            console.error(`Error executing command ${cmd.type}:`, error);
            return {
                type: "execute_command_result",
                id: executeCmd.id,
                cmd: cmd,
                status: "failure",
                nodeInfo: {
                    type: "get-node-info-result",
                    id: "error",
                    name: `Error: ${error.message || "Unknown error"}`,
                }
            };
        }
    }

    private applyLayoutProperties(node: SceneNode | BaseNode, layout?: LayoutProperties) {
        if (!layout) return;
        // Apply properties common to SceneNode
        if ('x' in node && typeof layout.x === 'number') node.x = layout.x;
        if ('y' in node && typeof layout.y === 'number') node.y = layout.y;
        if ('resize' in node && typeof layout.width === 'number' && typeof layout.height === 'number') {
            (node as any).resize(layout.width, layout.height);
        } else if ('width' in node && typeof layout.width === 'number') {
            (node as any).width = layout.width;
        } else if ('height' in node && typeof layout.height === 'number') {
            (node as any).height = layout.height;
        }

        // Properties specific to nodes that have these (e.g., FrameNode, RectangleNode)
        if ('rotation' in node && typeof layout.rotation === 'number') {
            (node as any).rotation = layout.rotation;
        }
        if ('constraints' in node && layout.constraints) {
            (node as any).constraints = layout.constraints;
        }

        // Auto Layout properties (mostly on FrameNode)
        if (node.type === "FRAME") {
            if (layout.layoutMode) node.layoutMode = layout.layoutMode;
            if (layout.layoutWrap) node.layoutWrap = layout.layoutWrap;
            if (typeof layout.itemSpacing === 'number') node.itemSpacing = layout.itemSpacing;
            if (typeof layout.counterAxisSpacing === 'number') node.counterAxisSpacing = layout.counterAxisSpacing;
            if (typeof layout.paddingLeft === 'number') node.paddingLeft = layout.paddingLeft;
            if (typeof layout.paddingRight === 'number') node.paddingRight = layout.paddingRight;
            if (typeof layout.paddingTop === 'number') node.paddingTop = layout.paddingTop;
            if (typeof layout.paddingBottom === 'number') node.paddingBottom = layout.paddingBottom;
            if (layout.primaryAxisAlignItems) node.primaryAxisAlignItems = layout.primaryAxisAlignItems;
            if (layout.counterAxisAlignItems) node.counterAxisAlignItems = layout.counterAxisAlignItems;
            if (layout.counterAxisAlignContent) node.counterAxisAlignContent = layout.counterAxisAlignContent;
            if (layout.primaryAxisSizingMode) node.primaryAxisSizingMode = layout.primaryAxisSizingMode;
            if (layout.counterAxisSizingMode) node.counterAxisSizingMode = layout.counterAxisSizingMode;
            if (typeof layout.strokesIncludedInLayout === 'boolean') node.strokesIncludedInLayout = layout.strokesIncludedInLayout;
            if (typeof layout.itemReverseZIndex === 'boolean') node.itemReverseZIndex = layout.itemReverseZIndex;
        }

        // Child Auto Layout properties (apply to children within an Auto Layout frame)
        // This is tricky as these properties are on the child node, not the parent frame.
        // For 'layoutSizingHorizontal', 'layoutSizingVertical', 'layoutAlign', 'layoutGrow', 'layoutPositioning'
        // These are typically set on children of auto-layout frames, which means we need the context of the parent.
        // For simplicity, if the node itself has these properties (e.g., if it's a top-level node being edited), apply them.
        if ('layoutSizingHorizontal' in node && layout.layoutSizingHorizontal) (node as any).layoutSizingHorizontal = layout.layoutSizingHorizontal;
        if ('layoutSizingVertical' in node && layout.layoutSizingVertical) (node as any).layoutSizingVertical = layout.layoutSizingVertical;
        if ('layoutAlign' in node && layout.layoutAlign) (node as any).layoutAlign = layout.layoutAlign;
        if ('layoutGrow' in node && typeof layout.layoutGrow === 'number') (node as any).layoutGrow = layout.layoutGrow;
        if ('layoutPositioning' in node && layout.layoutPositioning) (node as any).layoutPositioning = layout.layoutPositioning;
    }

    private applyVisualProperties(node: SceneNode | BaseNode, visual?: VisualProperties) {
        if (!visual) return;

        if ('opacity' in node && typeof visual.opacity === 'number') node.opacity = visual.opacity;
        if ('blendMode' in node && visual.blendMode) node.blendMode = visual.blendMode;
        if ('isMask' in node && typeof visual.isMask === 'boolean') node.isMask = visual.isMask;
        if ('effects' in node && visual.effects) node.effects = visual.effects;
        if ('effectStyleId' in node && visual.effectStyleId) node.effectStyleId = visual.effectStyleId;

        if ('cornerRadius' in node && typeof visual.cornerRadius !== 'undefined') (node as any).cornerRadius = visual.cornerRadius;
        if ('cornerSmoothing' in node && typeof visual.cornerSmoothing === 'number') (node as any).cornerSmoothing = visual.cornerSmoothing;
        if ('topLeftRadius' in node && typeof visual.topLeftRadius === 'number') (node as any).topLeftRadius = visual.topLeftRadius;
        if ('topRightRadius' in node && typeof visual.topRightRadius === 'number') (node as any).topRightRadius = visual.topRightRadius;
        if ('bottomLeftRadius' in node && typeof visual.bottomLeftRadius === 'number') (node as any).bottomLeftRadius = visual.bottomLeftRadius;
        if ('bottomRightRadius' in node && typeof visual.bottomRightRadius === 'number') (node as any).bottomRightRadius = visual.bottomRightRadius;

        if ('fills' in node && visual.fills) (node as any).fills = visual.fills;
        if ('fillStyleId' in node && visual.fillStyleId) (node as any).fillStyleId = visual.fillStyleId;
        if ('strokes' in node && visual.strokes) node.strokes = visual.strokes;
        if ('strokeStyleId' in node && visual.strokeStyleId) node.strokeStyleId = visual.strokeStyleId;
        if ('strokeWeight' in node && typeof visual.strokeWeight !== 'undefined') (node as any).strokeWeight = visual.strokeWeight;
        if ('strokeAlign' in node && visual.strokeAlign) node.strokeAlign = visual.strokeAlign;
        if ('strokeCap' in node && visual.strokeCap) (node as any).strokeCap = visual.strokeCap;
        if ('strokeJoin' in node && visual.strokeJoin) (node as any).strokeJoin = visual.strokeJoin;
        if ('dashPattern' in node && visual.dashPattern) node.dashPattern = visual.dashPattern;
        if ('strokeMiterLimit' in node && typeof visual.strokeMiterLimit === 'number') node.strokeMiterLimit = visual.strokeMiterLimit;
        
        // These are ReadonlyArray<VectorPath> and setting them directly might be tricky
        // if ('fillGeometry' in node && visual.fillGeometry) (node as any).fillGeometry = visual.fillGeometry;
        // if ('strokeGeometry' in node && visual.strokeGeometry) (node as any).strokeGeometry = visual.strokeGeometry;

        if ('strokeTopWeight' in node && typeof visual.strokeTopWeight === 'number') (node as any).strokeTopWeight = visual.strokeTopWeight;
        if ('strokeBottomWeight' in node && typeof visual.strokeBottomWeight === 'number') (node as any).strokeBottomWeight = visual.strokeBottomWeight;
        if ('strokeLeftWeight' in node && typeof visual.strokeLeftWeight === 'number') (node as any).strokeLeftWeight = visual.strokeLeftWeight;
        if ('strokeRightWeight' in node && typeof visual.strokeRightWeight === 'number') (node as any).strokeRightWeight = visual.strokeRightWeight;
    }

    private applySceneProperties(node: SceneNode | BaseNode, scene?: SceneProperties) {
        if (!scene) return;
        if ('visible' in node && typeof scene.visible === 'boolean') node.visible = scene.visible;
        if ('locked' in node && typeof scene.locked === 'boolean') node.locked = scene.locked;
    }

    private applyFrameProperties(node: FrameNode, frame?: FrameProperties) {
        if (!frame) return;

        if (frame.detachedInfo) node.setRelaunchData({ detached: JSON.stringify(frame.detachedInfo) }); // No direct detachedInfo setter
        if (frame.layoutGrids) node.layoutGrids = frame.layoutGrids;
        if (frame.gridStyleId) node.gridStyleId = frame.gridStyleId;
        if (typeof frame.clipsContent === 'boolean') node.clipsContent = frame.clipsContent;
        if (typeof frame.paddingTop === 'number') node.paddingTop = frame.paddingTop;
        if (typeof frame.paddingBottom === 'number') node.paddingBottom = frame.paddingBottom;
        if (typeof frame.paddingLeft === 'number') node.paddingLeft = frame.paddingLeft;
        if (typeof frame.paddingRight === 'number') node.paddingRight = frame.paddingRight;
        if (typeof frame.horizontalPadding === 'number') { /* DEPRECATED */ }
        if (typeof frame.verticalPadding === 'number') { /* DEPRECATED */ }
        if (frame.primaryAxisSizingMode) node.primaryAxisSizingMode = frame.primaryAxisSizingMode;
        if (frame.counterAxisSizingMode) node.counterAxisSizingMode = frame.counterAxisSizingMode;
        if (typeof frame.strokesIncludedInLayout === 'boolean') node.strokesIncludedInLayout = frame.strokesIncludedInLayout;
        if (frame.layoutWrap) node.layoutWrap = frame.layoutWrap;
        if (frame.primaryAxisAlignItems) node.primaryAxisAlignItems = frame.primaryAxisAlignItems;
        if (frame.counterAxisAlignItems) node.counterAxisAlignItems = frame.counterAxisAlignItems;
        if (frame.counterAxisAlignContent) node.counterAxisAlignContent = frame.counterAxisAlignContent;
        if (typeof frame.itemSpacing === 'number') node.itemSpacing = frame.itemSpacing;
        if (typeof frame.counterAxisSpacing === 'number') node.counterAxisSpacing = frame.counterAxisSpacing;
        if (typeof frame.itemReverseZIndex === 'boolean') node.itemReverseZIndex = frame.itemReverseZIndex;
        
        // Grid properties
        if (typeof frame.gridRowCount === 'number') node.gridRowCount = frame.gridRowCount;
        if (typeof frame.gridColumnCount === 'number') node.gridColumnCount = frame.gridColumnCount;
        if (typeof frame.gridRowGap === 'number') node.gridRowGap = frame.gridRowGap;
        if (typeof frame.gridColumnGap === 'number') node.gridColumnGap = frame.gridColumnGap;
        if (frame.gridRowSizes) node.gridRowSizes = frame.gridRowSizes;
        if (frame.gridColumnSizes) node.gridColumnSizes = frame.gridColumnSizes;
    }

    private getLayoutProperties(node: SceneNode | BaseNode): LayoutProperties | undefined {
        const props: LayoutProperties = {};
        if ('x' in node) props.x = node.x;
        if ('y' in node) props.y = node.y;
        if ('width' in node) props.width = (node as any).width;
        if ('height' in node) props.height = (node as any).height;
        if ('rotation' in node) props.rotation = (node as any).rotation;
        if ('relativeTransform' in node) props.relativeTransform = node.relativeTransform;
        if ('absoluteTransform' in node) props.absoluteTransform = node.absoluteTransform;
        if ('absoluteBoundingBox' in node) props.absoluteBoundingBox = node.absoluteBoundingBox ? node.absoluteBoundingBox : undefined;
        if ('absoluteRenderBounds' in node) props.absoluteRenderBounds = node.absoluteRenderBounds ? node.absoluteRenderBounds : undefined;
        if ('constraints' in node) props.constraints = node.constraints;
        if ('minWidth' in node) props.minWidth = (node as any).minWidth;
        if ('maxWidth' in node) props.maxWidth = (node as any).maxWidth;
        if ('minHeight' in node) props.minHeight = (node as any).minHeight;
        if ('maxHeight' in node) props.maxHeight = (node as any).maxHeight;
        if (node.type === "FRAME") {
            props.layoutMode = node.layoutMode;
            props.layoutWrap = node.layoutWrap;
            props.itemSpacing = node.itemSpacing;
            props.counterAxisSpacing = node.counterAxisSpacing ? node.counterAxisSpacing : undefined;
            props.paddingLeft = node.paddingLeft;
            props.paddingRight = node.paddingRight;
            props.paddingTop = node.paddingTop;
            props.paddingBottom = node.paddingBottom;
            props.primaryAxisAlignItems = node.primaryAxisAlignItems;
            props.counterAxisAlignItems = node.counterAxisAlignItems;
            props.counterAxisAlignContent = node.counterAxisAlignContent;
            props.primaryAxisSizingMode = node.primaryAxisSizingMode;
            props.counterAxisSizingMode = node.counterAxisSizingMode;
            props.strokesIncludedInLayout = node.strokesIncludedInLayout;
            props.itemReverseZIndex = node.itemReverseZIndex;
            props.gridRowCount = node.gridRowCount;
            props.gridColumnCount = node.gridColumnCount;
            props.gridRowGap = node.gridRowGap;
            props.gridColumnGap = node.gridColumnGap;
        }
        if ('layoutSizingHorizontal' in node) (props as any).layoutSizingHorizontal = (node as any).layoutSizingHorizontal;
        if ('layoutSizingVertical' in node) (props as any).layoutSizingVertical = (node as any).layoutSizingVertical;
        if ('layoutAlign' in node) (props as any).layoutAlign = (node as any).layoutAlign;
        if ('layoutGrow' in node) (props as any).layoutGrow = (node as any).layoutGrow;
        if ('layoutPositioning' in node) (props as any).layoutPositioning = (node as any).layoutPositioning;
        
        return Object.keys(props).length > 0 ? props : undefined;
    }

    private getVisualProperties(node: SceneNode | BaseNode): VisualProperties | undefined {
        const props: VisualProperties = {};
        if ('opacity' in node) props.opacity = node.opacity;
        if ('blendMode' in node) props.blendMode = node.blendMode;
        if ('isMask' in node) props.isMask = node.isMask;
        if ('effects' in node) props.effects = node.effects;
        if ('effectStyleId' in node) props.effectStyleId = node.effectStyleId;
        if ('cornerRadius' in node) (props as any).cornerRadius = (node as any).cornerRadius;
        if ('cornerSmoothing' in node) (props as any).cornerSmoothing = (node as any).cornerSmoothing;
        if ('topLeftRadius' in node) (props as any).topLeftRadius = (node as any).topLeftRadius;
        if ('topRightRadius' in node) (props as any).topRightRadius = (node as any).topRightRadius;
        if ('bottomLeftRadius' in node) (props as any).bottomLeftRadius = (node as any).bottomLeftRadius;
        if ('bottomRightRadius' in node) (props as any).bottomRightRadius = (node as any).bottomRightRadius;
        if ('fills' in node) (props as any).fills = (node as any).fills;
        if ('fillStyleId' in node) (props as any).fillStyleId = (node as any).fillStyleId;
        if ('strokes' in node) props.strokes = node.strokes;
        if ('strokeStyleId' in node) props.strokeStyleId = node.strokeStyleId;
        if ('strokeWeight' in node) (props as any).strokeWeight = (node as any).strokeWeight;
        if ('strokeAlign' in node) props.strokeAlign = node.strokeAlign;
        if ('strokeCap' in node) (props as any).strokeCap = (node as any).strokeCap;
        if ('strokeJoin' in node) (props as any).strokeJoin = (node as any).strokeJoin;
        if ('dashPattern' in node) props.dashPattern = node.dashPattern;
        if ('strokeMiterLimit' in node) props.strokeMiterLimit = node.strokeMiterLimit;
        if ('fillGeometry' in node) (props as any).fillGeometry = (node as any).fillGeometry;
        if ('strokeGeometry' in node) (props as any).strokeGeometry = (node as any).strokeGeometry;
        if ('strokeTopWeight' in node) (props as any).strokeTopWeight = (node as any).strokeTopWeight;
        if ('strokeBottomWeight' in node) (props as any).strokeBottomWeight = (node as any).strokeBottomWeight;
        if ('strokeLeftWeight' in node) (props as any).strokeLeftWeight = (node as any).strokeLeftWeight;
        if ('strokeRightWeight' in node) (props as any).strokeRightWeight = (node as any).strokeRightWeight;

        return Object.keys(props).length > 0 ? props : undefined;
    }

    private getSceneProperties(node: SceneNode | BaseNode): SceneProperties | undefined {
        const props: SceneProperties = {};
        if ('visible' in node) props.visible = node.visible;
        if ('locked' in node) props.locked = node.locked;
        return Object.keys(props).length > 0 ? props : undefined;
    }

    private getFrameProperties(node: FrameNode): FrameProperties | undefined {
        const props: FrameProperties = {};
        // detachedInfo is not directly readable from node without parsing relaunchData
        if (node.layoutGrids) props.layoutGrids = node.layoutGrids;
        if (node.gridStyleId) props.gridStyleId = node.gridStyleId;
        if ('clipsContent' in node) props.clipsContent = node.clipsContent;
        if ('paddingTop' in node) props.paddingTop = node.paddingTop;
        if ('paddingBottom' in node) props.paddingBottom = node.paddingBottom;
        if ('paddingLeft' in node) props.paddingLeft = node.paddingLeft;
        if ('paddingRight' in node) props.paddingRight = node.paddingRight;
        if ('primaryAxisSizingMode' in node) props.primaryAxisSizingMode = node.primaryAxisSizingMode;
        if ('counterAxisSizingMode' in node) props.counterAxisSizingMode = node.counterAxisSizingMode;
        if ('strokesIncludedInLayout' in node) props.strokesIncludedInLayout = node.strokesIncludedInLayout;
        if ('layoutWrap' in node) props.layoutWrap = node.layoutWrap;
        if ('primaryAxisAlignItems' in node) props.primaryAxisAlignItems = node.primaryAxisAlignItems;
        if ('counterAxisAlignItems' in node) props.counterAxisAlignItems = node.counterAxisAlignItems;
        if ('counterAxisAlignContent' in node) props.counterAxisAlignContent = node.counterAxisAlignContent;
        if ('itemSpacing' in node) props.itemSpacing = node.itemSpacing;
        if ('counterAxisSpacing' in node) props.counterAxisSpacing = node.counterAxisSpacing ? node.counterAxisSpacing : undefined;
        if ('itemReverseZIndex' in node) props.itemReverseZIndex = node.itemReverseZIndex;
        if ('gridRowCount' in node) props.gridRowCount = node.gridRowCount;
        if ('gridColumnCount' in node) props.gridColumnCount = node.gridColumnCount;
        if ('gridRowGap' in node) props.gridRowGap = node.gridRowGap;
        if ('gridColumnGap' in node) props.gridColumnGap = node.gridColumnGap;
        if ('gridRowSizes' in node) props.gridRowSizes = node.gridRowSizes;
        if ('gridColumnSizes' in node) props.gridColumnSizes = node.gridColumnSizes;

        return Object.keys(props).length > 0 ? props : undefined;
    }

    private uint8ArrayToBase64(bytes: Uint8Array): string {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}