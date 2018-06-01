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

before('setup server', done => {
	app.use(expressLogger);
	app.use(bodyParser.json());
	app.set('log.indent', '      ');

	expressAsPromised(app);

	app.get('/callbacks/string', (req, res) => res.send('Hello'));
	app.get('/callbacks/number', (req, res) => res.json(123));
	app.get('/callbacks/object', (req, res) => res.send({foo: [1, 2, 3], bar: 'Bar!'}));

	app.get('/promises/string', (req, res) => 'Hello');
	app.get('/promises/number', (req, res) => 123);
	app.get('/promises/object', (req, res) => ({foo: [1, 2, 3], bar: 'Bar!'}));

	server = app.listen(port, null, function(err) {
		if (err) return done(err);
		mlog.log('Server listening on ' + url);
		done();
	});
});

after('close server', done => server.close(done));

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

});
