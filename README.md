Express-As-Promised
===================
A simple wrapper around Express to make it promise compatible.

* **Completely Promise library agnostic** - Use native promises, Q, Bluebird or whatever library you want
* **Backwards compatible** - Mix and match callbacks and promises as needed
* **Low overhead** - While this library does have to wrap all middleware calls the codebase is minimal to prevent drag



```javascript
var express = require('express');
var expressAsPromised = require('..');

var app = express();
expressAsPromised(app);


// Any simple return value gets sent via res.send() automatically
app.get('/api/hello-world', ()=> 'Hello World!'); 

// Use setTimeout to pause for 100 inside a promise
app.get('/api/pause', ()=> new Promise(resolve => setTimeout(()=> resolve('I waited!'), 100)));

// Make a middleware chain of promises
app.get('/api/chain',
	()=> BigComplexPromise(),
	()=> AnotherComplexPromise(),
	()=> YetAnotherPromise()
);

// Normal callback style express functions are still fully supported
app.get('/api/classic', (req, res) => res.send('Old school!'));

// Mix and match approches
app.get('/api/mixed',
	(req, res, next) => next(),
	(req, res, next) => setTimeout(()=> next(), 10),
	(req, res, next) => new Promise(resolve => setTimeout(()=> resolve(), 20)),
	(req, res) => res.send('Done!'),
);
```

API
===
Express-As-Promised exports one function which mutates the Express `app` object, replacing some built in functions so that promises are supported.

The function can either be called with the entire Express object:

```javascript
var app = express();
expressAsPromised(app);
```

... or with options:

```javascript
var app = express();
expressAsPromised({
	app: app,
	setting1: settingValue,
});
```

Supported options are listed below.

| Option          | Type                     | Default                            | Description                                                                                                                             |
|-----------------|--------------------------|------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| `app`           | Express App              | none                               | The Express `app` object you want to mutate                                                                                             |
| `isPromise`     | function(obj)            | (complex, see code)                | How to identify a promise return. By default this function checks that the passed object is an object and contains a `then` property    |
| `isResolvable`  | function(obj)            | (complex, see code)                | How to identify what responses should be resolved. Default is to identify a scalar result that looks like a JS native                   |
| `resolve`       | function(req, res, data) | (see code)                         | When `isResolvable` passes, this function indicates how the response is output. Default is to use `res.send()` with some minor wrapping |
| `resolveEmpty`  | function(req, res, data) | `res.sendStatus(200)`              | How to resolve the last item in a middleware chain if no result has been provided                                                       |
| `error`         | function(req, res, data) | `res.sendStatus(400).send(data)`   | How to output caught errors                                                                                                             |
| `wrapFunctions` | array                    | `['delete', 'get', 'post', 'put']` | What Express functions should be wrapped to add promise support                                                                         |
