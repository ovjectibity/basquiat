import { UIDispatchedMessage } from "./messages.js";
import { FigmaExecutor } from "./plugincommandsexecutor.js";
// import figma from "@figma/plugin-typings";

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 400, height: 800 });

// Create the executor instance
const executor = new FigmaExecutor();

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = async (msg: UIDispatchedMessage) => {
  if (msg.type === 'get_api_key') {
    try {
      const apiKey = await figma.clientStorage.getAsync('anthropic_api_key');
      figma.ui.postMessage({
        type: 'api_key_response',
        apiKey: apiKey || null
      });
    } catch(error) {
      console.error('Error getting API key:', error);
      figma.ui.postMessage({
        type: 'get_api_key_repsonse',
        apiKey: null
      });
    }
  } else if(msg.type === 'set_api_key') {
    try {
      await figma.clientStorage.setAsync('anthropic_api_key', msg.apiKey);
      console.log('API key saved successfully');
    } catch (error) {
      console.error('Error saving API key:', error);
    }
  } else if(msg.type === 'close_plugin') {
    figma.closePlugin();
  } else if(msg.type === "execute_commands") {
    try {
      const result = await executor.executeCommands(msg);
      figma.ui.postMessage(result);
    } catch (error) {
      console.error('Error executing commands:', error);
      figma.ui.postMessage({
        type: 'execute_commands_result',
        id: msg.id,
        cmds: [],
        status: 'failure'
      });
    }
  }
};