var snabbdom = require("./snabbdom")
var h = require("./h")
var PropertyModule = require("./module/property");
var AttributesModule = require("./module/attributes");
var EventListenersModule = require("./module/eventlisteners");
var classNames = require("classnames");

var patch = snabbdom.init([PropertyModule,AttributesModule,EventListenersModule]);

function createExpression(expression){
  var expression = expression.trim();
  expression = expression.replace(/:[\w-_]+/g,function(name){
    return "this.$evaluateProp(\""+name.substr(1)+"\")";
  })
  expression = expression.replace(/#[\w-_]+/g,function(name){
    return "this.$evaluateAttribute(\""+name.substr(1)+"\")";
  })
  if(expression.trim() === ""){
    expression = "\"\"";
  }
  return expression;
}

function createList(listExpression,h){
  var split = listExpression.split("in")
  var varName = split[0]
  var input = createExpression(split[1])
  return "(function(){var $results = []; var $inputs="+input+"; if($inputs !== undefined && $inputs !== null){for(var $i=0;$i<$inputs.length;$i++){$results.push((function($inputs,$index){ var "+varName+" = $inputs[$index];return "+h+";})($inputs,$i))}} return $results;}).call(this)";
}

function createTextChild(node){
  var text = node.textContent.replace(/{{\s*[\S\s]+\s*}}/g,function(){
    var expression = arguments[0].substr(2,arguments[0].length-4)
    return "\"+"+createExpression(expression)+"+\"";
  });
  text = text.replace(/\n/g,"\\n")
  return "\""+text+"\"";
}

function createTreeChild(node){
  if(node.nodeName === "#comment"){
    return "null";
  }
  if(node.nodeName === "#text"){
    return createTextChild(node);
  }


  var conditionalExpression = null;
  var ifValue = node.getAttribute("%if");
  if(ifValue !== null){
    conditionalExpression = createExpression(ifValue);
  }

  var listExpression = null;
  var listValue = node.getAttribute("%for");
  if(listValue !== null){
    listExpression = listValue;
  }

  var children = [];
  for(var i = 0 ; i < node.childNodes.length; i++){
    children.push(createTreeChild(node.childNodes[i]));
  }

  var attributePairs = [];
  var propertyPairs = [];
  var eventPairs = [];
  for(var i = 0 ; i < node.attributes.length; i++){
    if(node.attributes[i].nodeName[0]=="#"){
      var pair = "\""+node.attributes[i].nodeName.substr(1)+"\":"
      pair += createExpression(node.attributes[i].nodeValue);
      attributePairs.push(pair);
    }
    else if(node.attributes[i].nodeName[0]==":"){
      var pair = "\""+node.attributes[i].nodeName.substr(1)+"\":"
      pair += createExpression(node.attributes[i].nodeValue);
      propertyPairs.push(pair);
    }
    else if(node.attributes[i].nodeName[0]=="@"){
      var pair = "\""+node.attributes[i].nodeName.substr(1)+"\":"
      pair += '(function($event){ '+createExpression(node.attributes[i].nodeValue)+' }).bind(this)';
      eventPairs.push(pair);
    }
    else if(node.attributes[i].nodeName[0]=="%"){
      continue;
    }
    else {
      var pair = "\""+node.attributes[i].nodeName+"\":"
      pair += "\""+node.attributes[i].nodeValue+"\"";
      attributePairs.push(pair);
    }
  }
  var attributes = "{ attrs: { "+attributePairs.join(',')+" }, props: { "+propertyPairs.join(',')+" }, on: { "+eventPairs.join(',')+" } }";
  var h = "h('"+node.nodeName+"', "+attributes+", $$$cleanArray(["+children.join(",")+"]))";
  if(listExpression != null){
    h = createList(listExpression,h);
  }
  if( conditionalExpression != null ){
    return "(("+conditionalExpression+")===true)?"+h+":null"
  }
  return h;
}

function createTree(document){
  return createTreeChild(document.body.children[0]);
}

function compile(html,methods){
  var parser=new DOMParser();
  var dom = parser.parseFromString(html, "text/html");
  var tree = createTree(dom);
  var defaultFunctions = ["$classNames","$emit","$action"];
  var fns = defaultFunctions.concat(Object.keys(methods));
  var localFunctions = [];
  var cleanArrayFn = "function $$$cleanArray(a) { var i = 0; while (i < a.length) { if (a[i] == null ) { a.splice(i, 1); } else if ( Array.isArray(a[i]) ) { var l = a[i].length; a.splice.apply(a, [i, 1].concat(a[i])); i+=l;} else { i++; } } return a; }\n"
  for(var i=0;i<fns.length;i++){
    localFunctions.push("var "+fns[i]+" = this."+fns[i]+".bind(this);\n");
  }
  var compiled = Function("var h = arguments[0];\n"+localFunctions.join("")+cleanArrayFn+"return "+tree);
  return function(){
    if(this.$lifecycle.beforeUpdate){
      this.$lifecycle.beforeUpdate.call(this);
    }
    var newVnode = compiled.call(this,h,this.$evaluateProp.bind(this),this.$evaluateAttribute.bind(this));
    if( newVnode == null){
      this.innerHTML = ""
      return;
    }
    if(this.$vdom){
      patch(this.$vdom, newVnode);
    }
    else {
      patch(this.rootEl, newVnode);
    }
    this.$vdom = newVnode;
    if(this.$lifecycle.updated){
      this.$lifecycle.updated.call(this);
    }
  };
}

function createAccessor(accessors,prop){
  accessors[prop] = {
      set: function(val){
        var oldVal = this.$props[prop];
        if(oldVal !== val){
            this.$props[prop] = val;
            if(this.$lifecycle.propertyChanged){
              this.$lifecycle.propertyChanged.call(this,prop,oldVal,val)
            }
            this.render();
        }
      },
      get: function(){
        return this.$props[prop];
      }
    }
}

function sigil(){
  var name = arguments[0];
  var props = arguments[1];
  var options = arguments[2];
  if(typeof arguments[1] === 'object' && !Array.isArray(arguments[1])){
    options = arguments[1];
    props = [];
  }
  var html = "";
  if(options.template){
    html = options.template;
  }
  else {
    var currentScript = document._currentScript || document.currentScript;
    var currentNode = currentScript.parentNode;
    html = currentNode.querySelector("#"+name).innerHTML;
  }
  html = "<div>"+html+"</div>";


  var methods = {};
  if(options && options.methods){
    methods = options.methods;
  }
  var render = compile(html,methods)

  var accessors = {};
  var defaults = {};
  if(options && options.defaults){
    defaults = options.defaults;
  }
  if(props !== undefined){
    for(var i = 0 ; i < props.length; i++){
      createAccessor(accessors,props[i])
    }
  }

  var proto = Object.create(HTMLElement.prototype);

  proto.createdCallback = function(){
    this.$props = {};
    this.$lifecycle = {};
    this.$originalContent = [];

    while(this.childNodes.length>0){
      var child = this.childNodes[0];
      this.$originalContent.push(child);
      child.remove();
    }

    //accessors
    for(var i in accessors){
      Object.defineProperty(this, i, {
        get: accessors[i].get.bind(this),
        set: accessors[i].set.bind(this),
        enumerable: true,
        configurable: true
      });
    }

    //methods
    var allMethods = Object.assign({},{
      $classNames: function(){
        return classNames.apply(null,arguments);
      },
      $emit: function(name,data){
        var event = new CustomEvent(name, { 'detail': data, 'bubbles': true, 'cancelable': true });
        this.dispatchEvent(event);
      },
      $action: function(type,data){
        var event = new CustomEvent('action', { 'detail': {type:type,data:data}, 'bubbles': true, 'cancelable': true});
        this.dispatchEvent(event);
      },
      $evaluateProp: function(prop){
        var val = this.$props[prop];
        if(val === undefined || val === null){
          return ""
        }
        return val;
      },
      $evaluateAttribute: function(attr){
        var attr = this.getAttribute(attr);
        if(attr === undefined || attr === null){
          return ""
        }
        return attr;
      }
    },
    methods)

    for(var i in allMethods){
      this[i]=allMethods[i].bind(this);
    }

    for(var i in defaults){
      this.$props[i] = defaults[i];
    }

    if(options && options.lifecycle){
      this.$lifecycle = options.lifecycle;
    }
    this.rootEl = document.createElement("div");
    this.appendChild(this.rootEl);
    this.render = render;

    if(this.$lifecycle.created){
      options.lifecycle.created.call(this);
    }
    this.render();
  }

  proto.attachedCallback = function(){
    if(this.$lifecycle.attached){
      this.$lifecycle.attached.call(this);
    }
  },
  proto.detachedCallback = function(){
    if(this.$lifecycle.detached){
      this.$lifecycle.detached.call(this);
    }
  },
  proto.attributeChangedCallback = function(attrName, oldValue, newValue){
    this.render();
    if(this.$lifecycle.attributeChanged){
      this.$lifecycle.attributeChanged.call(this,attrName, oldValue, newValue)
    }
  }
  document.registerElement(name, {prototype: proto});
}

sigil.use = function(defaultOptions){
  return function(){
    var name = arguments[0];
    var props = arguments[1];
    var options = arguments[2];
    if(typeof arguments[1] === 'object' && !Array.isArray(arguments[1])){
      options = arguments[1];
      props = [];
    }
    options = Object.assign(options,defaultOptions);
    return sigil(name,props,options);
  }
}

module.exports = sigil;
