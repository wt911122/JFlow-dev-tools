function makeFocusElement() {
    const div = document.createElement('div');
    div.setAttribute('style', `display: none; position: fixed; left:0; top:0; background: rgba(0,0,0,0.2);`)
    return div;
}
function makeHoverElement() {
    const div = document.createElement('div');
    div.setAttribute('style', `display: none; position: fixed; left:0; top:0; background: rgba(0,0,0,0.1);`)
    return div;
}
const _jflowStatus = {
    focus: null,
    hover: null,
    focusElement: makeFocusElement(),
    hoverElement: makeHoverElement(),
}
function iterator(node, path, tree, callback) {
    const data = callback(node, path);
    tree.children.push(data);
    if(node._stack && node._stack.length > 0) {
        if(path){
            path += '.';
        }
        data.children = [];
        node._stack.forEach((n, idx) => {
            if(n.visible) {
                iterator(n, path + `${idx}`, data, callback);
            }
        })
    }
}

function formatJFlowTree(jflowInstance, domPath) {
    const tree = {
        domPath,
        type: 'root',
        elementPath: '',
        children: [],
    };
    iterator(jflowInstance, '', tree, (node, path) => {
        return {
            domPath, 
            type: node._shape ? node._shape.type : node.type,
            elementPath: path
        }
    })
    return tree;
}

function getDomPath(domElem) {
    let path = '';
    while(domElem.parentElement && domElem !== document.body){
        path = domElem.nodeName + path;
        domElem = domElem.parentElement;
        if(domElem) {
            path = ' > ' + path;
        }
    }
    return 'BODY' + path;
}

function getJFlowTrees(){
    const jflowcanvas = document.body.querySelectorAll('canvas[data-jflow=true]')
    // console.log(jflowcanvas[0].$jflow)
    const trees = {};
    window._jflowTreeMap = {}
    Array.prototype.forEach.call(jflowcanvas, (node) => {
        const jflowInstance = node.$jflow;
        if(jflowInstance) {
            const domPath = getDomPath(jflowInstance.DOMwrapper);
            const tree = formatJFlowTree(jflowInstance, domPath);
            trees[domPath] = tree;
            window._jflowTreeMap[domPath] = jflowInstance
        }
    });
    return trees;
}
console.log('contentScript run!');

function resolveJFlowMeta(meta) {
    const [
        domPath,
        elementPath,
    ] = meta.split(',');

    const elPath = elementPath.split('.');
    const jflowInstance = window._jflowTreeMap[domPath];
    let node = jflowInstance;
    while(node && elPath.length) {
        const p = elPath.shift();
        node = node._stack[+p];
    }
    console.log(meta, node);
    return {
        node, 
        jflowInstance
    }
}
function inspectJFlowElement(meta) {
    const {
        node, jflowInstance
    } = resolveJFlowMeta(meta);
    const wrapperdom = jflowInstance.DOMwrapper
    let isInViewBox = false;
    let n = node;
    while(n) {
        if(n.isInViewBox) {
            isInViewBox = true;
            break;
        }
        n = n._belongs
    }
    if(!isInViewBox) {
        jflowInstance.focusOn(node);
    }
    focusNode(node, wrapperdom);
    const obj = {};
    Object.keys(node).forEach(k => {
        if(!k.startsWith('_') && node.hasOwnProperty(k)) {
            obj[k] = node[k];
        }
    })
    return obj
}

function hoverJFlowElement(meta) {
    if(!meta) {
        _jflowStatus.hoverElement.style.display = 'none';
        return;
    }
    const {
        node, jflowInstance
    } = resolveJFlowMeta(meta);
    hoverNode(node, jflowInstance.DOMwrapper);
}

function closeAllJFlowElement() {
    _jflowStatus.focusElement.style.display = 'none';
    _jflowStatus.hoverElement.style.display = 'none';
}

function hoverNode(node, wrapperdom) {
    _jflowStatus.hover = node;
    const [a, b, c, d] = node.getBoundingRect();
    const { left, top } = wrapperdom.getBoundingClientRect();
    const p1 = node._belongs.calculateToRealWorld([a, b]);
    const p2 = node._belongs.calculateToRealWorld([c, d]);
    const shadowElem = _jflowStatus.hoverElement;
    shadowElem.style.display = 'block';
    shadowElem.style.transform = `translate(${p1[0] + left}px, ${p1[1] + top}px)`;
    shadowElem.style.width = [p2[0] - p1[0]] + 'px';
    shadowElem.style.height = [p2[1] - p1[1]] + 'px';
}

function focusNode(node, wrapperdom) {
    _jflowStatus.focus = node;
    const [a, b, c, d] = node.getBoundingRect();
    const { left, top } = wrapperdom.getBoundingClientRect();
    const p1 = node._belongs.calculateToRealWorld([a, b]);
    const p2 = node._belongs.calculateToRealWorld([c, d]);
    const shadowElem = _jflowStatus.focusElement;
    shadowElem.style.display = 'block';
    shadowElem.style.transform = `translate(${p1[0] + left}px, ${p1[1] + top}px)`;
    shadowElem.style.width = [p2[0] - p1[0]] + 'px';
    shadowElem.style.height = [p2[1] - p1[1]] + 'px';    
}


if(!window._jflowStatus) {
    Object.assign(window, {
        getJFlowTrees,
        inspectJFlowElement,
        closeAllJFlowElement,
        _jflowStatus
    });
    document.body.appendChild(_jflowStatus.focusElement);
    document.body.appendChild(_jflowStatus.hoverElement);
}

  