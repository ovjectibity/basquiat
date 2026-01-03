import { 
  GetApiKeysResponse, 
  UIDispatchedMessage, 
  GetThreadsListResponse,
  ThreadBase,
  Thread,
  GetThreadsResponse,
  SaveThreads,
  SaveThreadsResponse
} from "./messages.js";
import { FigmaExecutor } from "./plugincommandsexecutor.js";

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 400, height: 800 });

// Create the executor instance
const executor = new FigmaExecutor();

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = async (msg: UIDispatchedMessage) => {
  if (msg.type === 'get_api_keys') {
    try {
      const anthropicKey = 
        await figma.clientStorage.getAsync('anthropic_api_key');
      const googleKey = 
        await figma.clientStorage.getAsync('google_api_key');
      const res: GetApiKeysResponse = {
        type: "get_api_keys_response",
        anthropicKey: anthropicKey,
        googleKey: googleKey
      }
      figma.ui.postMessage(res);
    } catch(error) {
      console.error('Error getting API keys:', error);
      const res: GetApiKeysResponse = {
        type: "get_api_keys_response"
      }
      figma.ui.postMessage(res);
    }
  } else if(msg.type === 'set_api_keys') {
    try {
      await figma.clientStorage.setAsync('anthropic_api_key', msg.anthropicKey);
      await figma.clientStorage.setAsync('google_api_key', msg.googleKey);
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
  } else if(msg.type === "get_threads_list") {
    try {
      let keys = await figma.clientStorage.keysAsync();
      let threads = new Array<ThreadBase>();
      for(let key of keys) {
        if(key.startsWith("agent_thread_")) {
          //TODO: Is this enough to not send the msgs prop?
          let thread: ThreadBase = await figma.clientStorage.getAsync(key);
          threads.push(thread);
        }
      };
      const res: GetThreadsListResponse = {
        type: "get_threads_list_response",
        threads: threads
      }
      figma.ui.postMessage(res);
    } catch(e) {
        console.error("Encountered error while getting threads list");
    }
  } else if(msg.type === "get_threads") {
    try {
      let threads = new Array<Thread>();
      for(let id of msg.ids) {
        let thread: Thread = 
          await figma.clientStorage.getAsync(
            "agent_thread_" + String(id));
          threads.push(thread);
      }
      const res: GetThreadsResponse = {
        type: "get_threads_response",
        threads: threads
      }
      figma.ui.postMessage(res);
    } catch(e) {
        console.error("Encountered error while getting threads");
    }
  } else if(msg.type === "save_threads") {
    // console.log(`Save thread requested: ${msg}`);
    for(let thread of msg.threads) {
      try {
        // console.log(`Save thread item requested: ${thread}`);
        await figma.clientStorage.setAsync(
          "agent_thread_" + String(thread.id),thread);
        // console.log(`Save thread item done: ${thread}`);
      } catch(e) {
        console.error("Encountered error while saving threads");
      }
    }
    const res: SaveThreadsResponse = {
      type: "save_threads_response",
      id: msg.id
    };
    figma.ui.postMessage(res);
  }
};