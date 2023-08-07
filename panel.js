let focusNode = undefined;
let focusMeta = undefined;
function iterateTree(node, callback, after) {
    callback(node);
    if(node.children && node.children.length > 0) {
        node.children.forEach(n => {
            iterateTree(n, callback, after);
        })  
    }
    after(node)
}
function clearTree(){
    const treeDom = document.getElementById('tree');
    treeDom.innerHTML = '';
}
function makeTree(domPath, tree) {
    const treeDom = document.getElementById('tree');
    let html = `<div class="treenode"><span class="treetext">- ${domPath}</span>`
    const root = tree.children[0];
    iterateTree(root, (node) => {
        html += `<div class="treenode"><span class="treetext" data-devmeta="${node.domPath},${node.elementPath}">- ${node.type || 'element'}</span>`
    }, () => {
        html += '</div>'
    })
    html += '</div>'
    treeDom.innerHTML += html;

    treeDom.addEventListener('click', e => {
        console.log(e);
        console.log(e.target.dataset.devmeta)
        inspectElement(e.target.dataset.devmeta)
        if(focusNode) {
            focusNode.classList.remove('active');
            focusMeta = undefined;
        }
        focusNode = e.target;
        focusNode.classList.add('active');
        focusMeta = e.target.dataset.devmeta;
    });

    treeDom.addEventListener('mouseover', (e) => {
        console.log(e.target.dataset.devmet);
        makeHoverElement(e.target.dataset.devmeta);
    });

    treeDom.addEventListener('mouseleave', () => {
        makeHoverElement();
    })


}

function handleNode(k, node, type, callback, after) {
    callback(type, k, node);
    if(typeof node === 'object'){
        if(Array.isArray(node)) {
            iterateArray(node, callback, after);
        } else {
            iterateObject(node, callback, after);
        }
    }
    after(type, k, node);
}

function iterateArray(node, callback, after) {
    node.forEach((n, idx) => {
        handleNode(idx, n, 'array', callback, after);
    })
}

function iterateObject(node, callback, after) {
    Object.keys(node).forEach((k) => {
        const t = node[k];
        handleNode(k, t, 'object', callback, after);
    })
}
function makePropertyPanel(node){
    const panel = document.getElementById('property');
    const propertyHeader = document.getElementById('propertyheader');
    const propertyContent = document.getElementById('propertycontent');

    propertyHeader.innerHTML = focusMeta;
    let html = '';
    iterateObject(node, (type, key, node) => {
        let n = '';
        if(typeof node === 'object'){
            if(Array.isArray(node)) {
                n = '['
            } else {
                n = '{'
            }
        } else {
            n = node;
        }
        const pre = type === 'array' ? '' : `${key}: `
        html += `<div class="treenode">${pre}${n}`
    }, (type, key, node) => {
        let m = '';
        if(typeof node === 'object'){
            if(Array.isArray(node)) {
                m = ']'
            } else {
                m = '}'
            }
        }
        html += `${m},</div>`
    })
    propertyContent.innerHTML = html;
    panel.classList.add('active');
}


var backgroundPageConnection;

function closePropertyPanel() {
    const panel = document.getElementById('property');
    panel.classList.remove('active');
    if(focusNode) {
        focusNode.classList.remove('active');
        focusMeta = undefined;
    }
    backgroundPageConnection.postMessage({
        tabId: chrome.devtools.inspectedWindow.tabId,
        name: 'close-inspect-element',
    });
}


function doConnect() {
    backgroundPageConnection = chrome.runtime.connect({
        name: "panel"
    });

    backgroundPageConnection.onMessage.addListener(function (message) {
        // Handle responses from the background page, if any
        switch (message.name) {
            case 'tree-refresh':
                const tree = message.tree;
                clearTree();
                closePropertyPanel();
                Object.keys(tree).forEach(t => {
                    makeTree(t, tree[t]);
                })
                break;
            case 'node-inspect': 
                const node = message.node;
                console.log(node);
                makePropertyPanel(node);
                break;
        }
    });

    backgroundPageConnection.postMessage({
        tabId: chrome.devtools.inspectedWindow.tabId,
        name: 'panel-init',
        // scriptToInject: "content_script.js"
    });
    backgroundPageConnection.onDisconnect.addListener(() => {
        doConnect();
    })
}

var btn = document.getElementById('refreshbtn');
btn.addEventListener('click', function() {
    console.log('refresh tree',  chrome.devtools.inspectedWindow.tabId)
    // document.append('refresh tree')
    backgroundPageConnection.postMessage({
        tabId: chrome.devtools.inspectedWindow.tabId,
        name: 'fresh-tree',
        // scriptToInject: "content_script.js"
    });
})

var btnclose = document.getElementById('headerclosebtn');
btnclose.addEventListener('click', function() {
    closePropertyPanel();
})

function inspectElement(meta) {
    backgroundPageConnection.postMessage({
        tabId: chrome.devtools.inspectedWindow.tabId,
        name: 'inspect-element',
        meta,
    });
}

function makeHoverElement(meta) {
    backgroundPageConnection.postMessage({
        tabId: chrome.devtools.inspectedWindow.tabId,
        name: 'hover-element',
        meta: meta || '',
    });
}

doConnect();