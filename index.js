var _ = require('lodash');
var http = require('http');

module.exports = function(options) {
	// Argument mangling {{{
	if (_.isObject(options) && _.isFunction(options.get)) { // Passed an express object
		options = {app: options};
	}
	// }}}

	var settings = {
		app: undefined,
		promise: Promise,
		isPromise: obj => obj && obj.then,
		isResolvable: obj =>
			obj
			&& !(obj instanceof http.ServerResponse)
			&& (
				_.isPlainObject(obj)
				|| _.isString(obj)
				|| _.isNumber(obj)
				|| _.isDate(obj)
				|| _.isArrayLike(obj)
				|| _.isBuffer(obj)
				|| _.isBoolean(obj)
			),
		resolve: (req, res, data) => res.send(_.isNumber(data) ? '' + data : data),
		resolveEmpty: (req, res, data) => res.sendStatus(200),
		error: (req, res, data) => res.sendStatus(400).send(data),
		wrapFunctions: ['get'],
		...options,
	};

	settings.wrapFunctions.forEach(func => {
		var expressHandler = settings.app[func];
		settings.app[func] = function(...args) {
			// Delegate to normal app
			return expressHandler.apply(settings.app, args.map(arg => {
				if (_.isString(arg) || _.isRegExp(arg)) { // Prefix string or matcher - pass on unedited
					return arg;
				} else if (_.isFunction(arg)) { // Middleware callback function - wrap in handler
					return function(req, res, next) {
						var result = arg.call(req, req, res, next);
						if (settings.isPromise(result)) {
							result
								.then(promiseRes => {
									if (promiseRes) { // Returned a value
										settings.resolve(req, res, promiseRes);
									} else if (_.isFunction(next)) { // No value and this promise is in the middle of a chain
										next();
									} else { // No value and this promise is the end of a chain
										settings.resolveEmpty(req, res, promiseRes);
									}
								})
								.catch(promiseErr => {
									settings.error(req, res, promiseErr);
								})
						} else if (settings.isResolvable(result)) { // We got a truthy value - assume its a scalar response
							settings.resolve(req, res, result);
						}
					};
				} else if (settings.isPromise(arg)) { // Promise return
					throw new Error('Promises cannot be passed when constructing a route as they only resolve once - pass in a promise factory function instead');
				} else { // Unknown object
					throw new Error('Unsupported object while constructing a route');
				}
			}));
		};
	});
};
