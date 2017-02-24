const express = require('express');
const app = express();
const fs = require('fs');
const pug = require('pug');
const pg = require('pg');
const bodyParser = require('body-parser');
const session = require('express-session');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(`postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@localhost/nodeblog`);

app.use(express.static('static'));
app.use(bodyParser.urlencoded( { extended: true }  ));
app.set('view engine', 'pug');
app.set('views', __dirname + '/views');

//Session settings
app.use(session({
	secret: 'bobs your uncle and lily is your aunt',
	resave: true,
	saveUninitialized: false
}));

//Model table user
const User = sequelize.define('user', {
	username: Sequelize.STRING,
	email: Sequelize.STRING,
	password: Sequelize.STRING
})

//Model table post
const Post = sequelize.define('post', {
	title: Sequelize.STRING,
	body: Sequelize.STRING(1024)
})


// Relationships
User.hasMany(Post)
Post.belongsTo(User)

//Routes
app.get('/', function (request, response) {
	response.render('index', {
		message: request.query.message,
		user: request.session.user
	});
});

app.post('/login', bodyParser.urlencoded({extended: true}), function (request, response) {
	if(request.body.email.length === 0) {
		response.redirect('/?message=' + encodeURIComponent("Please fill out your email address."));
		return;
	}

	if(request.body.password.length === 0) {
		response.redirect('/?message=' + encodeURIComponent("Please fill out your password."));
		return;
	}

	User.findOne({
		where: {
			email: request.body.email
		}
	}).then(function (user) {
		if (user !== null && request.body.password === user.password) {
			request.session.user = user;
			response.redirect('/ownposts');
		} else {
			response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
		}
	}, function (error) {
		response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
	});
});


app.get('/allposts', (req, res) => {
	let user = req.session.user;
		if (user === undefined) {
			res.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
		} else {
		let result = [];
		Post.findAll().then(function(data) {
			for(var i = 0; i < data.length; i++) {
				result.push({'title': data[i].title,'body': data[i].body})
			}
			res.render('allposts', {
				user: user,
				magicKey: result})
		});
	}
});


app.get('/ownposts', function (request, response) {
	let user = request.session.user;
	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
	} else {
		Post.findAll()
		.then(function(data){
		console.log(data)
		let result = []
		for(i=0;i<data.length;i++){
			result.push({'title':data[i].title,'body':data[i].body})
		} 
		response.render('ownposts', {
			user: user,
			mypostInfo:result
		});
	});
	}
});


app.get('/createpost', function (request, response) {
	let user = request.session.user;
	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to create a post."));
	} else {
		response.render('createpost', {
			user: user
		});
	}
});

app.post('/createpost', (req, res) => {
	let userInputTitle = req.body.title;
	let userInputStory = req.body.body;

	return Post.create({
        title: userInputTitle,
        body: userInputStory
    }).then(function() {
		res.redirect('ownposts');
	})
});

app.get('/register', (req, res) => {
	let user = req.session.user;
	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to create a post."));
	} else {
		res.render('register', {
			user: user
		});
	}
})


app.post('/register', (req, res) => {
	let userInputUsername = req.body.username;
	let userInputEmail = req.body.email;
	let userInputPassword = req.body.password;

	return User.create({
		username: userInputUsername,
		email: userInputEmail,
		password: userInputPassword
	}).then(function() {
		res.redirect('ownposts');
	})	
});

app.get('/logout', function (request, response) {
	request.session.destroy(function(error) {
		if(error) {
			throw error;
		}
		response.redirect('/?message=' + encodeURIComponent("Successfully logged out."));
	})
});

//Sync library before starting route
sequelize.sync(/*{force: true}*/).then(function () {
	User.create({//testdata otherise undefined if we run app
		username: "bob",
		email: "bob@bob.com",
		password: "bob"
	})
	Post.create({
		title: "testtitle",
		body: "testbody"
	}).then(function () {
		const server = app.listen(3000, function () {
			console.log('Server has started')
		})
	})
}, function (error) {
	console.log('sync failed: ')
	console.log(error)
});