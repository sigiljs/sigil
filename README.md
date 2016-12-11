<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Squaredcircle.svg/64px-Squaredcircle.svg.png" alt="Sigil.js logo"/>
</p>

#Sigil.js
Sigil.js is a view framework for the modern web. It features the following in one incredibly minimal package:
* re-usable html elements using [web components](http://webcomponents.org)
* virtual dom for super fast re-rendering using [snabbadom](https://github.com/snabbdom/snabbdom)
* html templating language that allows bindings to attributes & properties
* pure functional view component style to reduce re-renderings
* support for immutable flux based stores like [Redux](http://redux.js.org/) and [Kamea](https://github.com/sigiljs/kamea)

# Installation
Simply reference the Web Component polyfill and Sigil from a CDN:

CDN:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/0.7.23/webcomponents.min.js"></script>
<script src="https://unpkg.com/sigiljs@latest/dist/sigil.min.js"></script>
```

# Hello World

```html
<script>
  sigil("hello-world",{
    template: "<div>Hello World!</div>"
  })
</script>

<hello-world></hello-world>
```

# Syntax Highlighting
By default sigil will look for a template of the same id as the tag name. Template tags allow you to specify inert html in your web page. It also has the benefit of giving syntax highlighting.

```html
<template id="hello-world">
    <div>Hello World!</div>
</template>
<script>
  sigil("hello-world")
</script>

<hello-world></hello-world>
```

# Web Component
Sigil.js contains everything you need to use [web components](http://webcomponents.org). This allows us to use HTML imports to put our component in a separate file.

index.html:
```html
<link rel="import" href="hello-world.html" >
<hello-world></hello-world>
```

hello-world.html:
```html  
<template id="hello-world">
    <div>Hello World!</div>
</template>
<script>
  sigil("hello-world")
</script>
```

# Attributes & Props
Sigil.js makes development of functional web components easy. It only supports unidirectional binding of its defined properties and attributes. Both attributes and your defined props are reactive, meaning if you change them it will trigger a re-render of the component. Components by default are [pure](https://en.wikipedia.org/wiki/Pure_function), meaning if you give them the exact same attributes or props no re-render will occur.

```html  
<template id="hello-world">
  <div>{{#greeting}} {{:person}}!</div>
</template>
<script>
  sigil("hello-world",["person"]);
</script>

<hello-world greeting="Hola"></hello-world>
<script>
  document.querySelector("hello-world").person = "Richard";
</script>
```

#Defaults
Elements sometimes need a default value for a prop before they've received any external data.

```html  
<template id="hello-world">
  <div>{{#greeting}} {{:person}}!</div>
</template>
<script>
  sigil("hello-world",["person"],{
    defaults: {
      person: "Richard"
    }
  });
</script>
<hello-world greeting="Hola"></hello-world>
```

# Methods
Methods can be easily added to your components by passing in additional options.

```html  
<template id="hello-world">
  <div>Hello {{:name}}!</div>
</template>
<script>
  sigil("hello-world",["name"],{
    methods: {
      setPerson: function(person) {
        this.name = person.firstName;
      }
    }
  })
</script>

<hello-world></hello-world>
<script>
  document.querySelector("hello-world").setPerson({
    firstName: "Richard",
    lastName: "Anaya"
  });
</script>
```

# Lifecycle Hooks
Sigil offers a number of lifecycle hooks:

```html
<template id="hello-world">
  <div>Hello {{:name}}!</div>
</template>
<script>
  sigil("hello-world",["name"],{
    lifecycle: {
      created: function() {
        //called when a new element is created
      },
      inserted: function() {
        //called when element is added to DOM
      },
      removed: function() {
        //called when element is added to DOM
      },
      attributeChanged: function(attrName, oldValue, newValue) {
        //called when attribute is changed
      },
      propertyChanged: function(propertyName, oldValue, newValue) {
        //called when defined property is changed
      },
      beforeUpdate: function() {
        //called right before virtual dom update of html
      },
      updated: function() {
        //called right before virtual dom update of html
      },
    }
  })
</script>
```

# HTML Bindings
Sigil.js has only three types of html bindings it can perform.
* Bindings prefixed with `#` will bind an expression to an html element's attribute
* Bindings prefixed with `:` will bind an expression to an html element's property
* Bindings prefixed with `@` will bind an expression to an html element's event. This is discussed below.

```html
<template id="hello-international">
  <div>
    <hello-world #greeting="getGreeting('chinese')" :person="#name"></hello-world>
    <hello-world #greeting="getGreeting('spanish')" :person="#name"></hello-world>
    <hello-world #greeting="getGreeting('german')" :person="#name"></hello-world>
  </div>
</template>
<script>
  sigil("hello-international",{
    methods:{
      getGreeting: function(language){
        if(language == "german")
          return "Guten tag";
        else if(language == "spanish")
          return "Hola";
        else if(language == "chinese")
          return "你好";
      }
    }
  });
</script>

<hello-international name="Richard"></hello-international>
```

# Expressions
Sigil utilizes expessions in many areas. These bits of javascript are evaluated in the context of your component.  Underneath the covers your expression get translated into real javascript. For example:

`<div :foo=" :blah + #test + ' ' + getGreetings()[0]">`

get translated to:

`this.$evaluateProperty('blah') + this.$evaluateAttribute('test') + ' ' + this.getGreeting()[0]`

# Event Handling
Event listeners can be created to listen to any dom by creating a property prefixed with `@`. The event can be accessed using `$event` but is not required.

```html
<template id="hello-chooser">
  <div @click="chooseGreeting($event)">
    <button>Hello</button>
    <button>Guten tag</button>
    <button>Hola</button>
  </div>
</template>
<script>
  sigil("hello-chooser",{
    methods:{
      chooseGreeting: function(e){
        console.log(e.target.innerHTML);
      }
    }
  });
</script>
```

# Conditionals
Elements can be conditionally rendered based off a boolean expression.

```html
<template id="hello-world">
  <div>
    <div %if="langauge == 'english'">Hello World!</div>
    <div %if="langauge == 'german'">Hallo Welt</div>
    <div %if="langauge == 'chinese'">你好，世界</div>
  </div>
</template>
<script>
  sigil("hello-world",["language"]);
</script>

<hello-world></hello-world>
<script>
  document.querySelector("hello-world").language = "chinese";
</script>
```

# Lists
Lists of elements can be rendered out from arrays.

```html
<template id="hello-world">
  <div>
    <div %for="person in :people'">Hello {{person}}!</div>
  </div>
</template>
<script>
  sigil("hello-world",["people"]);
</script>
<hello-people></hello-people>
<script>
  document.querySelector("hello-people").people = ["Richard","Howard","Justin"];
</script>
```

# Built-in Functions
A number of built in functions make writing expressions easier to do.

## $classNames( ... )
Exposes the utility library [classNames](https://github.com/JedWatson/classnames) as a function so you can write boolean-driven classnames more concisely.

```html
<template id="hello-world">
  <button #class="$classNames('foo',{'big-font':#is-big})">Say Hello</button>
</template>
<script>
  sigil("hello-button")
</script>

<hello-button is-big="true"></hello-button>
```

## $emit( name, data )
A function for emitting custom events from your function.

Parameters
* name - the name of the custom event
* data - the data you would like to set as the events detail

```html
<template id="hello-button">
  <button @click="$emit('say-hello','Hello')">Say Hello</button>
</template>
<script>
  sigil("hello-button")
</script>

<hello-button></hello-button>
<script>
  document.querySelector("hello-button").addEventHandler("click",function(e){
    console.log(e.details);
  });
</script>
```

## $action( type, data )
A function for emitting actions as custom events. The action data is stored in detail in the following format:
```
{
  type: <name>
  data: <data>
}
```

Parameters
* type - the type of the action
* data - the data you would like to attach to the action

```html
<template id="hello-button">
  <button @click="$action('say-hello','Hello')">Say Hello</button>
</template>
<script>
  sigil("hello-button")
</script>

<hello-button></hello-button>
<script>
  document.querySelector("hello-button").addEventHandler("action",function(e){
    var action = e.details;
    var type = action.type;
    var data = action.data;

    if( type === 'say-hello' ){
      console.log(data);
    }    
  });
</script>
```

# Middleware
Some times the default sigil component creator is not enough.  You can create your own component creator with default features of your own.

```html
<script>
  var store = new Store();

  var connectedComponent = sigil.use({
    methods: {
      $store: function(){
        return store;
      }
    }
  })
</script>

<template id="hello-world">
  <div>{{$store()}}</div>
</template>
<script>
  connectedComponent("hello-world")
</script>
```

# Browser Support
* Edge (all versions and devices), Internet Explorer 9+
* Firefox (all versions, devices, and platforms)
* Chrome (all versions, devices, and platforms), Android 4+ stock browser
* Safari Mac, Safari iOS 5+
* Opera 11+ (all devices and platforms)
