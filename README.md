# Pe (Promise Evaluation)

[![Build Status](https://travis-ci.org/Tomas-Sereikis/Pe.svg?branch=master)](https://travis-ci.org/Tomas-Sereikis/Pe)
[![devDependency Status](https://david-dm.org/Tomas-Sereikis/Pe/dev-status.svg)](https://david-dm.org/Tomas-Sereikis/Pe#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/Tomas-Sereikis/Pe/badge.png?branch=master)](https://coveralls.io/r/Tomas-Sereikis/Pe?branch=master)

`bower install -g pe`

JavaScript Pe method is used for jobs queue list creation when the actual job or jobs are not able to be started, for example if we still need some data which will be provided in the future.

Pe is very light, it has full test coverage and its only the beginning of it! So if you have some ideas what should be implemented to it feel free to offer.

#### Examples

###### Case 1

You can see real working example in `examples/case1.html`

We are making HTTP request to the server. On our request depends how data will be formatted for e.g. we are requesting translations.

Before HTML Content
```html
<ul id="translate">
	<li data-translate="test1"></li>
	<li data-translate="test2"></li>
	<li data-translate="test3"></li>
</ul>
```

Javascript Implementation
```javascript
var stack = new Pe();
var translate = document.querySelector('#translate');
var elements = translate.querySelectorAll('[data-translate]');

[].forEach.call(elements, function (element) {
	// push element to stack
	stack.push(element);
});

// lest say we have http request implementation like this
makeHttpRequest()
    .success(function (translations) {
        // on success we what get translation and add it as element text
        // add stack evaluation callback
        // this callback will be repeated on every item
        // which is or will be pushed to stack
        stack.evaluate(function (element) {
            var translate = element.dataset.translate;
            // update element text content
            element.textContent = translations[translate];
        });
        
        // and lest say we what to add more element which 
        // needs to be translated too
        var element = document.createElement('li');
        element.dataset.translate = 'test4';
        translate.appendChild(element);
        // push this element to stack too, even if evaluation was defined
        // and other elements was translated already
        stack.push(element);
        
        // and lets say for debug we need to console log all elements 
        // which are pushed to stack
        // so we just add one more evaluation callback
        stack.evaluate(function (element) {
            // because this stack was defined later
            // it will always be called when the previous jobs are finished
            // so this only will be called when element will have translation
            // so we can log element and its translation
            console.log(element, element.textContent);
        });
    });
```

After HTML Content Evaluation
```html
<ul id="translate">
	<li data-translate="test1">Test 1</li>
	<li data-translate="test2">Test 2</li>
	<li data-translate="test3">Test 3</li>
	<li data-translate="test4">Test 4</li>
</ul>
```

###### Case 2

You can see real working example in `examples/case2.html`

We are making async HTTP requests to server e.g. we are requesting geo codded address from coordinates.

Before HTML Content
```html
<div class="marker" data-coordinates="54.690543,25.279189"></div> 
<div class="marker" data-coordinates="54.692789,25.279831"></div>
<div class="marker" data-coordinates="54.693021,25.273138"></div>
```

Javascript Implementation
```javascript
var stack = new Pe()
    .evaluate(function (element) {
        // this will be async request
        // because we only what to make one request per time 
        // when called async this method will only finish and continue to
        // next ones then done will be called
        var done = this.async();
        // coordinates from dom element
        var coordinates = element.dataset.coordinates;
        // lest say we make http request with element coordinates
        makeHttpRequest(coordinates)
            .success(function (response) {
                // attach geo codded address and marker title
                element.textContent = response;
                // this evaluation is done continue to next one
                done();
            });
    });

var markers = document.querySelectorAll('.marker');
[].forEach.call(markers, function (element) {
    stack.push(element);
});
```

After HTML Content Evaluation
```html
<div class="marker" data-coordinates="54.690543,25.279189">
    Some Address In Vilnius 1
</div> 
<div class="marker" data-coordinates="54.692789,25.279831">
    Some Address In Vilnius 2
</div>
<div class="marker" data-coordinates="54.693021,25.273138">
    Some Address In Vilnius 3
</div>
```

###### Case 3

We are making list of HTTP requests and after all of them done we what to save some notice or lest say finish stack and preform some actions.

```javascript
var resolved = {};
var stack = new Pe()
    // note that only one item per time is resolving
    // after done callback triggers queue goes to the next one
    .evaluate(function (content) {
        // get async done method
        var done = this.async();
        // make http request for content resolve
        makeHttpRequest(content)
            .success(function (response) {
                resolved[content] = response;
                done();
            });
    });

stack
    .push('resolve1')
    .push('resolve2')
    .push('resolve3')
    .finish(function () {
        // this will be called when call stack items will be 
        // resolved by HTTP request
        console.log(resolved);
    });
    
// note then this stack is finished and you can not add more items 
// or evaluations to it!

// you can check the closed status 
console.log(stack.isClosed()); // true
// if you try to push items or add evaluations 
// you will get {StackClosedError}
```

###### Case 4

What to preform custom actions if worker fails? You can use it by `throw ...` or use `this.fail(...)` method.

```javascript
// use fast way of stack creation
Pe.stackFromArray(1, 3, 5, 6)
    // define on fail listener before any evaluator
    // keep in mind that you only need one on fail 
    // listener for multiple evaluators
    .on.fail(function (number) {
        console.log(number + ' is even!');
    })
    .evaluate(function (number) {
        // save callback reference of fail for async task
        var fail = this.fail;
        if (number % 2 === 0) {
            throw number;
            // or use alternative for async tasks
            fail(number);
        }
        
        // ...
    });
```

###### Case 5

You can see real working example in `examples/case5/run.js`

Using Pe with node is possible. Lets say we what to create function which concats files content to one string.

```javascript
var fs = require('fs');
// not yet registered to npm
var Pe = require('../../dist/pe.js');

var collection = [];
var stack = new Pe()
    .push('./read/test1.txt') // content: Lorem ipsum
    .push('./read/test2.txt') // content: dolor sit amet
    .push('./read/test3.txt') // content: consectetur adipiscing elit
    .evaluate(function (filename) {
        var done = this.async();
        fs.readFile(filename, function (err, data) {
            if (err) return;
            
            collection.push(data.toString());
            done();
        });
    })
    .finish(function () {
        // output:
        // Lorem ipsum
        // dolor sit amet
        // consectetur adipiscing elit
        console.log(collection.join("\n"));
    });
```

Have questions if `Pe` would work in your case? Ask!

### Todo
* Integrate web worker as a evaluation worker. Method implementation example `.thead.evaluate(function () { ...`
* Enable set count of active workers. This will allow to run more then one worker per time. This will be handy when you will use `.thead.evaluate(...` web workers to be enabled to work with more then one web worker per time.
* Integrate job done reporter usually will be used for web worker jobs e.g. `.on.done(function (arguments...) { ...` and so we can report arguments to on done method by just returning something from evaluator or passing some content to async done callback.
* Integrate async worker call. Now workers is called synced so if you do not move your worker callback content async it will lock your frame. Method call implementation `.async.evaluate(function () { ...`

### Changes
* **0.0.5** - (future release) added new build strategy. Full Pe uncompressed file moved to dist folder.
* **0.0.4** - code refactoring, method `catch()` is deprecated use `.on.fail()` instead. README todo added.
* **0.0.3** - added `catch()` method for evaluations that fail, added `Pe.stackFromArray(...)` which created Pe instance form arguments.
* **0.0.2** - added `finish()` method.

### noConflict
Having conflicts with the name `Pe`?
```javascript
var PromiseEvaluation = Pe.noConflict();
var stack = new PromiseEvaluation();
...
```