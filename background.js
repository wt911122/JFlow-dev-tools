var tabIdToConnectionMap = {};
var connectionIdToTabIdMap = {};
var connectionIdToConnectionMap = {};
var lastconnectionId = 0;

chrome.runtime.onConnect.addListener(function(devToolsConnection) {
    var connectionId;

    function onMessage(message, sender, sendResponse) {
      console.log(message.name)
      const meta = message.meta;
        switch (message.name) {
          case 'panel-init':
            connectionId = ++lastconnectionId;
            tabIdToConnectionMap[message.tabId] = devToolsConnection;
            connectionIdToTabIdMap[connectionId] = message.tabId;
            connectionIdToConnectionMap[connectionId] = devToolsConnection;
            chrome.scripting.executeScript( {
                target: {tabId: message.tabId},
                files: ['contentScript.js'],
                world: 'MAIN'
            })
            break;

          case 'fresh-tree':
            chrome.scripting.executeScript( {
                target: {tabId: message.tabId},
                func: function() {
                  return window.getJFlowTrees();
                },
                world: 'MAIN'
            }, (tree) => {
              console.log(tree)
              devToolsConnection.postMessage({
                name: 'tree-refresh',
                tree: tree[0].result,
              })
             
            });
            break;

          case 'inspect-element':
            chrome.scripting.executeScript( {
              target: {tabId: message.tabId},
              args: [meta],
              func: function(meta) {
                return window.inspectJFlowElement(meta);
              },
              world: 'MAIN'
            }, (result) => {
              console.log(result);
              devToolsConnection.postMessage({
                name: 'node-inspect',
                node: result[0].result
            })
           
          });
          break;
          case 'close-inspect-element':
            chrome.scripting.executeScript( {
                target: {tabId: message.tabId},
                func: function() {
                  return window.closeAllJFlowElement();
                },
                world: 'MAIN'
            });
            break;
          
          case 'hover-element':
            chrome.scripting.executeScript( {
                target: {tabId: message.tabId},
                args: [meta],
                func: function(meta) {
                  return window.hoverJFlowElement(meta);
                },
                world: 'MAIN'
            });
            break;
        }
      }
    // add the listener
    devToolsConnection.onMessage.addListener(onMessage);

    devToolsConnection.onDisconnect.addListener(function() {
        devToolsConnection.onMessage.removeListener(onMessage);
        tabId = connectionIdToTabIdMap[connectionId];
        // Delete all associations
        delete connectionIdToTabIdMap[connectionId];
        delete connectionIdToConnectionMap[connectionId];
        delete tabIdToConnectionMap[tabId];
    });
})

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    var connection = tabIdToConnectionMap[sender.tab.id];
    if (!connection) {
        return;
    }
    switch (message.name) {
        case 'jflow-reflowed':
            port.postMessage({
                name: 'jflow-reflowed',
                tree: message.tree
            });
            break;
    }
});