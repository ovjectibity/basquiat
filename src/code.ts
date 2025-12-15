import { Commands } from "./commands.js";

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 400, height: 800 });

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = (cmd: Commands) => {
  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.
  if (cmd.type === "create-rectangle") {
    const nodes: SceneNode[] = [];

    for (let i = 0; i < 2; i++) {
      const rect = figma.createRectangle();
      rect.x = i * 150;
      rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }];
      figma.currentPage.appendChild(rect);
      nodes.push(rect);
    }

    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
  }

  if (cmd.type === 'close_plugin') {
    figma.closePlugin();
  }
};