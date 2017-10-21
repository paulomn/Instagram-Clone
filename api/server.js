//Create server objects
var express = require('express'),
	bodyParser = require('body-parser'),
	mongodb = require('mongodb'),
	objectId = require('mongodb').ObjectId;
	multiParty = require('connect-multiparty'), //Capture multipart/form-data
	mv = require('mv'), //Manipulate files
	fileSystem = require('fs');

//Configure app to body-parser and json
var app = express();

app.use(bodyParser.urlencoded({extended: true})); //Capture x-www-form-url-encoded only
app.use(bodyParser.json());
app.use(multiParty()); //Capture multipart/form-data

//Configure pre-flight operations (PUT, DELETE)
app.use(function(req, res, next){

	res.setHeader('Access-Control-Allow-Origin', '*'); //Cross-Domain requests
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); //Methods accepted
	res.setHeader('Access-Control-Allow-Headers', 'content-type'); //Client can overwrite request headers // Allow send JSON string through xhr.send()
	res.setHeader('Access-Control-Allow-Credentials', true); //Security

	next();

});

//Set the port to be listened
var port = 8080;
app.listen(port);

//Connection MongoDB
var db = new mongodb.Db(
	'Instagram-Clone',
	new mongodb.Server('localhost', 27017, {}),
	{}
);

//Send message
console.log('API Server http listening to port ' + port + '...');

////////////////////////////////////////////////////////
//Configure routes (RESTFull: same URI / different verbs)
////////////////////////////////////////////////////////

//POST (Create)
app.post('/api', function(req, res){
	
	//Set header to permit to be called from an application
	//Configured in middlewares
	//res.setHeader('Access-Control-Allow-Origin', 'http://localhost:80');
	//res.setHeader('Access-Control-Allow-Origin', '*');

	//Body parser receives both: urlencoded or json
	var data = req.body;

	var originalFileName = req.files.file.originalFilename; //Populated by connect-multiparty
	var from = req.files.file.path; //Populated by connect-multiparty
	
	//Time stamp for each file
	var date = new Date();
	timeStamp = date.getTime();

	//Append the original file name and time stamp
	data.fileName = originalFileName;
	data.timeStamp = timeStamp;

	//Real application: express-validator here!!
	
	//Open database connection
	db.open(function(error, mongoClient){
		mongoClient.collection('posts', function(error, collection){
			collection.insert(data, function(error, records){

				if(error){
					res.json(error);
					//res.json({status: 0});
				} else {
					res.json(records);

					var to = './uploads/' + records.ops[0]._id; 

					mv(from, to, function(error) {
						if (error){
							res.status(500).json({error: error});
							return;
						}
					});
				}
				mongoClient.close();
			});
		});

	});

	/*//Wrong cross device
	fileSystem.rename(from, to, function(error){

		if (error){
			res.status(500).json({error: error});
			return;
		}
	});*/
});

//GET (Query)
app.get('/api', function(req, res){
	
	//Set header to permit to be called from an application
	//Configured in middlewares
	//res.setHeader('Access-Control-Allow-Origin', 'http://localhost:80');
	//res.setHeader('Access-Control-Allow-Origin', '*');

	//Open database connection
	db.open(function(error, mongoClient){
		mongoClient.collection('posts', function(error, collection){
			collection.find().toArray(function(error, records){

				if(error){
					res.json(error);
					//res.json({status: 0});
				} else {
					res.json(records);
					//res.json({status: 1});
				}

				mongoClient.close();
			});
		});
	});

});

//GET (Query By ID)
app.get('/api/:id', function(req, res){
	
	//Open database connection
	db.open(function(error, mongoClient){
		mongoClient.collection('posts', function(error, collection){
			
			//Only for Id it works
			//collection.find(objectId(req.params.id)).toArray(function(error, records){
			collection.find({_id: objectId(req.params.id)}).toArray(function(error, records){

				if(error){
					res.json(error);
					//res.json({status: 0});
				} else {
					res.status(200).json(records);
					//res.json({status: 1});
				}

				mongoClient.close();
			});
		});
	});

});

//PUT (Update By ID)
app.put('/api/:id', function(req, res){

	//Open database connection
	db.open(function(error, mongoClient){
		mongoClient.collection('posts', function(error, collection){

			//push: insert a new item inside an array
			collection.update(
				{_id: objectId(req.params.id)},
				{$push : {
							comments: {
								id_comment: new objectId(),
								comment: req.body.comment
							}
						 }
				},
				{},
				function(error, records){

					if(error){
						res.json(error);
						//res.json({status: 0});
					} else {
						res.json(records);
						//res.json({status: 1});
					}

					mongoClient.close();
				}
			);
		});
	});

});

//DELETE (Query By ID)
app.delete('/api/:id', function(req, res){
	
	//Open database connection
	db.open(function(error, mongoClient){
		mongoClient.collection('posts', function(error, collection){
			
			//pull: remove an item inside an array
			collection.update(
				{},
				{$pull : {
							comments: {id_comment: objectId(req.params.id)}
						 }
				},
				{multi: true},
				function(error, records){

					if(error){
						res.json(error);
						//res.json({status: 0});
					} else {
						res.json(records);
						//res.json({status: 1});
					}

					mongoClient.close();
				}
			);

		});
	});



});


//Image route
app.get('/uploads/:image', function(req, res){
	
	var img = req.params.image;

	fileSystem.readFile('./uploads/' + img, function(error, content){

		if (error){
			res.status(400).json(error);
			return;
		} 

		//Write binary (setHeader assign one property each)
		res.writeHead(
			200,
			{'content-type': 'image/jpg'}
		);

		res.end(content);

	});

});

