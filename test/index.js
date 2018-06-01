var bodyParser = require('body-parser');
var expect = require('chai').expect;
var express = require('express');
var expressAsPromised = require('..');
var expressLogger = require('express-log-url');
var mlog = require('mocha-logger');
var superagent = require('superagent');

var app = express();
var server;

var port = 8181;
var url = 'http://localhost:' + port;

before('Setup server', done => {
	app.use(expressLogger);
	app.use(bodyParser.json());
	app.set('log.indent', '      ');

	expressAsPromised(app);

	// Callbacks {{{
	app.get('/callbacks/string', (req, res) => res.send('Hello'));
	app.get('/callbacks/number', (req, res) => res.json(123));
	app.get('/callbacks/object', (req, res) => res.send({foo: [1, 2, 3], bar: 'Bar!'}));
	app.get('/callbacks/defer', (req, res) => setTimeout(()=> res.send('Defer!'), 100));
	// }}}

	// Promises {{{
	app.get('/promises/string', (req, res) => 'Hello');
	app.get('/promises/number', (req, res) => 123);
	app.get('/promises/object', (req, res) => ({foo: [1, 2, 3], bar: 'Bar!'}));
	app.get('/promises/defer', (req, res) => new Promise(resolve => setTimeout(()=> resolve('Defer!'), 100)));

	app.get('/promises/chain', (req, res) =>
		Promise.resolve()
			.then(()=> 'Foo')
			.then(()=> 'Bar')
			.then(()=> 'Baz')
	);

	app.get('/promises/all', (req, res) =>
		Promise.all([
			new Promise(resolve => setTimeout(()=> resolve('Foo'), 100)),
			new Promise(resolve => setTimeout(()=> resolve('Bar'), 50)),
			new Promise(resolve => setTimeout(()=> resolve('Baz'), 10)),
		])
	);
	// }}}

	// Use cases {{{
	app.get('/use-cases/1',
		(req, res, next) => new Promise(resolve => setTimeout(()=> resolve(), 10)),
		(req, res, next) => new Promise(resolve => setTimeout(()=> resolve(), 20)),
		(req, res, next) => new Promise(resolve => setTimeout(()=> resolve(), 30)),
		(req, res) => res.send('Done!'),
	);

	app.get('/use-cases/2',
		(req, res, next) => next(),
		(req, res, next) => setTimeout(()=> next(), 10),
		(req, res, next) => new Promise(resolve => setTimeout(()=> resolve(), 20)),
		(req, res) => res.send('Done!'),
	);

	app.get('/use-cases/3',
		(req, res, next) => new Promise(resolve => setTimeout(()=> resolve(), 10)),
		(req, res, next) => setTimeout(()=> next(), 20),
		(req, res, next) => new Promise(resolve => setTimeout(()=> resolve('Done!'), 30)),
	);

	app.get('/use-cases/4',
		(req, res, next) => new Promise(resolve => setTimeout(()=> resolve(), 10)),
		(req, res, next) => new Promise((resolve, reject) => reject('Nope!')),
		(req, res, next) => new Promise(resolve => setTimeout(()=> resolve('Done!'), 30)),
	);
	// }}}

	server = app.listen(port, null, function(err) {
		if (err) return done(err);
		mlog.log('Server listening on ' + url);
		done();
	});
});

after('Teardown server', done => server.close(done));

describe('Normal callbacks', ()=> {

	it('should handle string responses', ()=>
		superagent
			.get(`${url}/callbacks/string`)
			.then(res => expect(res.text).to.be.equal('Hello'))
	);

	it('should handle number responses', ()=>
		superagent
			.get(`${url}/callbacks/number`)
			.then(res => expect(res.text).to.be.equal('123'))
	);

	it('should handle object responses', ()=>
		superagent
			.get(`${url}/callbacks/object`)
			.then(res => expect(res.body).to.be.nested.deep.equal({foo: [1, 2, 3], bar: 'Bar!'}))
	);

	it('should handle defered responses', ()=>
		superagent
			.get(`${url}/callbacks/defer`)
			.then(res => expect(res.text).to.be.equal('Defer!'))
	);

});

describe('Promise support', ()=> {

	it('should handle string responses', ()=>
		superagent
			.get(`${url}/promises/string`)
			.then(res => expect(res.text).to.be.equal('Hello'))
	)

	it('should handle number responses', ()=>
		superagent
			.get(`${url}/promises/number`)
			.then(res => expect(res.text).to.be.equal('123'))
	);

	it('should handle object responses', ()=>
		superagent
			.get(`${url}/promises/object`)
			.then(res => expect(res.body).to.be.nested.deep.equal({foo: [1, 2, 3], bar: 'Bar!'}))
	);

	it('should handle defered responses', ()=>
		superagent
			.get(`${url}/promises/defer`)
			.then(res => expect(res.text).to.be.equal('Defer!'))
	);

	it('should correctly resolve promise chains', ()=>
		superagent
			.get(`${url}/promises/chain`)
			.then(res => expect(res.text).to.be.equal('Baz'))
	);

	it('should correctly resolve promise arrays', ()=>
		superagent
			.get(`${url}/promises/all`)
			.then(res => expect(res.body).to.be.nested.deep.equal(['Foo', 'Bar', 'Baz']))
	);

});

describe('Use cases', ()=> {

	it('should correctly resolve [Promise, Promise, Promise, res.send()]', ()=>
		superagent
			.get(`${url}/use-cases/1`)
			.then(res => expect(res.text).to.be.equal('Done!'))
	);

	it('should correctly resolve [cb, cb + delay, Promise, res.send()]', ()=>
		superagent
			.get(`${url}/use-cases/2`)
			.then(res => expect(res.text).to.be.equal('Done!'))
	);

	it('should correctly resolve [Promise, cb, Promise + resolve value]', ()=>
		superagent
			.get(`${url}/use-cases/3`)
			.then(res => expect(res.text).to.be.equal('Done!'))
	);

	it('should correctly reject [Promise, Promise + reject, Promise]', ()=>
		superagent
			.get(`${url}/use-cases/3`)
			.catch(err => expect(err.response.text).to.be.equal('Nope!'))
	);

});

describe('Error catching', ()=> {

	it('should throw if using promises in route construction', ()=>
		expect(()=> {
			app.get('/error/promiseMiddleware',
				new Promise(resolve => setTimeout(()=> resolve('Foo'), 100)),
				new Promise(resolve => setTimeout(()=> resolve('Bar'), 50)),
				new Promise(resolve => setTimeout(()=> resolve('Baz'), 10)),
			);
		}).to.throw
	)

});
