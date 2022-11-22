const bodyParser = require('body-parser');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const cookieParser = require("cookie-parser");
const sessions = require('express-session');

const fs = require('fs');
const assert = require('assert');

const app = express();

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

const halfDay = 1000 * 60 * 60 * 12;
app.use(sessions({
	secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    	saveUninitialized:true,
    	cookie: { maxAge: halfDay },
    	resave: false 
}));

var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://127.0.0.1:27017/";

const generateNickname = require('./helper/sortfunnynames.js');

app.get('/', async (req, res) => {
	res.json({api_name: 'api community', year_creation: 2022, see_more: 'https://github.com/mantovan1'});
	res.status(200);
	res.end();
})

app.get('/temp-user/join', async (req, res) => {
	
	var date_of_creation;
	var date_of_expiration;

	const current_date = Date.now();

	if(!req.session.userName) {
		const userName = await generateNickname() + uuidv4();
		
		req.session.userName = userName;

		req.session.date_of_creation   = current_date;
		req.session.date_of_expiration = current_date + 11 * 60 * 60 * 1000;

		date_of_creation   = new Date(req.session.date_of_creation).toString();
		date_of_expiration = new Date(req.session.date_of_expiration).toString();

		res.json({message: 'temp user created, you can use this account for 12 hours. After that it will be deleted', username: req.session.userName, date_of_creation: date_of_creation, date_of_expiration: date_of_expiration});
		res.status(201);
		res.end();
	} else {
		date_of_creation   = new Date(req.session.date_of_creation);
                date_of_expiration = new Date(req.session.date_of_expiration);

		var timeleft = Math.abs(date_of_creation.getTime() - date_of_expiration.getTime()) / 3600000;

		res.json({message: 'temp user already created', username: req.session.userName, date_of_creation: date_of_creation.toString(), date_of_expiration: date_of_expiration.toString(), timeleft: timeleft});
		res.status(200);
		res.end();
	}	
})

app.get('/temp-user/info', async(req, res) => {	
	if(!req.session.userName) {
		res.status(307);
		res.redirect('/temp-user/join');
		res.end();
	} else {
		res.json({username: req.session.userName});
        	res.status(200);
        	res.end();
	}
})

app.get('/thread/create/:title/:text', async (req, res) => {
	if(req.session.userName) {
		const author = req.session.userName;
		const date = Date.now();
		const title = req.params.title;
		const text = req.params.text;

		const myobj = {author: author, date: date, level: 'parent', childs: [], title: title, text: text}

		MongoClient.connect(url, function(err, db) {
  			if (err) {
				res.json({message: err});
				res.status(500);
				res.end();
			}

  			var dbo = db.db("communityapp");
  			
  			dbo.collection("threads").insertOne(myobj, function(err, response) {
    				if (err) {
					res.json({message: err});
					res.status(500);
					res.end();
				} else {
					res.json({message: 'Thread created', id: myobj._id, author: myobj.author, date: myobj.date, title: myobj.title, text: myobj.text});
                			res.status(201);
                			res.end();
					
					db.close();
				}
  			});
		});

	} else {
		res.status(307);
		res.redirect('/temp-user/join');
		res.end();
	}		

})

app.get('/thread/comment/:layer/:parentid/:title/:text', async (req, res) => {

	if(req.session.userName) {

                const author = req.session.userName;
                const date = Date.now();
                const title = req.params.title;
                const text = req.params.text;

		const layer = req.params.layer;
		const parentid = req.params.parentid;

		var parentObjectID;

		try {
			parentObjectID = new mongo.ObjectID(parentid);
		} catch (e) {
	
		}

                MongoClient.connect(url, async function(err, db) {
                        if (err) {
				res.json({message: err});
				res.status(500);
				res.end();
			}	

                        var dbo = db.db("communityapp");

			var parentdata;
			var myobj;

			var parentcollection;
			var collection;

			if(layer == 1) {
				parentdata = await dbo.collection('threads').findOne({_id: parentObjectID});
				myobj = {author: author, date: date, level: 'layer#1', parntid: parentObjectID, childs: [], title: title, text: text}
				collection = 'comments';
				parentcollection = 'threads';
			}
			else if (layer == 2) {
				parentdata = await dbo.collection('comments').findOne({_id: parentObjectID});
				myobj = {author: author, date: date, level: 'layer#2', parntid: parentObjectID, title: title, text: text}
				collection = 'subcomments';
				parentcollection = 'comments';
			} else {
				res.json({message: 'give a valid number for the layer (1 or 2)'});
                                res.status(200);
                                res.end();
			}

			if(parentdata == null) {
	                        res.json({message: 'parent object does not exist, please give an existing object id'});
                                res.status(200);
                                res.end()
                        } else {
                                dbo.collection(collection).insertOne(myobj, function(err, response) {
        	                        if (err) {
                                		res.json({message: err});
                                		res.status(500);
                                		res.end();
                        		}

					if(parentdata.childs.length == 0) {
						dbo.collection(parentcollection).updateOne({_id: parentObjectID}, {$set: {childs: [myobj._id]}});
					} else {
						dbo.collection(parentcollection).updateOne({_id: parentObjectID}, {$set: {childs: [...parentdata.childs, myobj._id]}});
					}	

                                        res.json({message: "comment created", id: myobj._id, author: myobj.author, date: myobj.date, level: myobj.level, parentid: myobj.parentid, title: myobj.title, text: myobj.text});
                                        res.status(201);
                                        res.end()
                                })

                        }


			//

                });

        } else {
		res.status(307);
                res.redirect('/temp-user/join');
		res.end();
        } 


})

app.get('/thread/resume/', async(req, res) => {
	try {
		MongoClient.connect(url, async function(err, db) {
        		if (err) throw err;
                	var dbo = db.db('communityapp');

                	const data = await dbo.collection('threads').find().toArray();

			for (let i = 0; i < data.length; i++) {
				delete data[i].childs;
			}

			res.json({thread: data});
			res.status(200);
			res.end();
		})
	} catch (err) {
		res.json({message: err});
		res.status(500);
		res.end();
	}	

})

app.get('/thread/search/:threadid', async (req, res) => {
	MongoClient.connect(url, async function(err, db) {
                if (err) throw err;
                var dbo = db.db("communityapp");

		const threadid = req.params.threadid;

		var objectID;

		try {
			objectID = new mongo.ObjectID(threadid)
		} catch (e) {}

                const data = await dbo.collection('threads').findOne({_id: objectID});

                res.json({thread: data});
                res.status(200);
                res.end();
        })
})

app.listen(8080, function() {
	console.log('API rodando na porta :8080');
})

module.exports = app;
