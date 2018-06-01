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
		isPromise: obj => !! obj.then,
		resolve: (req, res, data) => res.send(_.isNumber(data) ? '' + data : data),
		error: (req, res, data) => res.sendStatus(400).send(data),
		wrapFunctions: ['get'],
		...options,
	};

	settings.wrapFunctions.forEach(func => {
		var expressHandler = settings.app[func];
		settings.app[func] = function(...args) {
			// Delegate to normal app
			return expressHandler.apply(settings.app, args.map(arg => {
				if (!_.isFunction(arg)) return arg; // Probably a string path - ignore

				return function(req, res, next) {
					var result = arg.call(req, req, res, next);
					if (settings.isPromise(result)) {
						console.log('RES TYPE', result);
						result
							.then(promiseRes => {
								settings.resolve(req, res, promiseRes);
							})
							.catch(promiseErr => {
								settings.error(req, res, promiseErr);
							})
					} else if (result && !(result instanceof http.ServerResponse)) { // We got a truthy value - assume its a scalar response
						settings.resolve(req, res, result);
					}
				};
			}));
		};
	});
};
