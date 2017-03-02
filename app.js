const express = require('express');
const app = express();
const fs = require('fs');
const pug = require('pug');
const pg = require('pg');
const bodyParser = require('body-parser');
const session = require('express-session');
const Sequelize = require('sequelize');
const sequelize = new Sequelize(`postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@localhost/nodeblog`);
const bcrypt = require('bcrypt')

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

//Model table comment
const Comment = sequelize.define('comment',{
	body:Sequelize.STRING(1024)
})

//Relationships
User.hasMany(Post)
Post.belongsTo(User)

User.hasMany(Comment)
Comment.belongsTo(User)
Post.hasMany(Comment)
Comment.belongsTo(Post)

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
		bcrypt.compare(request.body.password, user.password, (err, result)=>{
			if (err) throw err;
			console.log(result)
			if (user !== null && result) {
				request.session.user = user;
				response.redirect('/ownposts');
			}
			else {
				response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
			}
		})
	}, function (error) {
		response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
	});
});


app.get('/allposts', (req, res) => {
	let user = req.session.user;
	if (user === undefined) {
		let result = [];
		Post.findAll().then(function(data) {
			for(var i = 0; i < data.length; i++) {
				result.push({'title': data[i].title,'body': data[i].body})
			}
			res.render('allposts',{
				magicKey:result
			})
		})
	} else {
		let result = [];
		Post.findAll()
		.then(function(data) {
			// console.log('all posts from all users:')
			// console.log(data)
			for(var i = 0; i < data.length; i++) {
				result.push({'id':data[i].id,'title': data[i].title,'body': data[i].body})
			}
			res.render('allposts', {
				user: user,
				magicKey: result,
			})
		});
	}
});


app.get('/ownposts', function (request, response) {
	let user = request.session.user;
	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to view your profile."));
	} else {
		Post.findAll({
			include: [{
				model: User,
				where: 
				{
					id: user.id
				}
			}]
		})
		.then(function(data){
		let result = []
		for(i=0;i<data.length;i++){
			result.push({'id':data[i].id,'title':data[i].title,'body':data[i].body})
		} 
		response.render('ownposts', {
			user: user,
			mypostInfo:result
		})
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
	let user = req.session.user;
	//console.log(user);
	if (user === undefined) {
		res.redirect('/?message=' + encodeURIComponent("Please log in to create a post."));
	} 
	else {
		User.findById(user.id)
		.then(function(user){
			user.createPost({
				title: userInputTitle,
				body: userInputStory
			})
			.then(function(post) {
				console.log('redirecting to ownposts')
				res.redirect('/ownposts');
			})
		})
		
	}
});


app.get('/register', (req, res) => {
	res.render('register')
})


app.post('/register', (req, res) => {
	console.log('the register post is working')
	let userInputUsername = req.body.username;
	let userInputEmail = req.body.email;
	let userInputPassword = req.body.password;

	bcrypt.hash(userInputPassword, 8, (err,hash) =>{
		if (err) throw err

			return User.create({
				username: userInputUsername,
				email: userInputEmail,
				password: hash
			})

		.then(function() {
			res.redirect('/ownposts');
		})
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



app.get('/specpost',function(req,res){
	let user = req.session.user;
	//console.log(req.query.id)
	if (user === undefined) {
		res.redirect('/?message=' + encodeURIComponent("Please log in to create a post."));
	} else {
		Post.findOne(
			{where: {id: req.query.id},
			include: [
			{
				model: Comment}
				]}
				)
		.then(function(data){
			console.log(data)
			res.render('specpost', {user: user, commentInfo:data})
		// let result = [] //all comments
		// let result2 = data[0].dataValues.post

		// for(i=0;i<data.length;i++){
		// 	result.push({'id':data[i].dataValues.id, 'body':data[i].dataValues.body})
		// } 		
		// res.render('specpost', {
		// 	user: user,
		// 	commentInfo:result,
		// 	result2
		// });
	});
	}
})


app.post('/specpost/', function(req,res){
	let user = req.session.user;
	let userInputComment = req.body.magic
	console.log(userInputComment)
	if (user === undefined) {
		res.redirect('/?message=' + encodeURIComponent("Please log in to see a post."));
	} 
	else {
		Post.findOne({
			where: {id: req.body.postId}
		})
		.then(function(post){
			// console.log('post info is:')
			// console.log(post)
			const value = {
				body: userInputComment,
				userId: user.id
			}
			const opts = {
				include:[User]
			}
			return post.createComment(value, opts) 
			
		})
		.then(function(data){
			console.log('data is:')
			console.log(data)
			console.log(data.dataValues.body)
			let newComment = data.dataValues.body
			res.send({magic:newComment})	
		})
		.catch( e => console.log(e))
	}
});


//Sync library before starting route
sequelize.sync({force: true})
.then(function () {
		return User.create({//testdata otherise undefined if we run app
			username: "john",
			email: "john@john.com",
			password: "john"
		})
		.then(function(user){
			return user.createPost({
				title: "John's post",
				body: "Hi everybody."
			})
		})		
		.then(function(post){
			return post.createComment({
				body:"This is test comment.",
				userId: 1
			})
		})


	.then(function () {
		const server = app.listen(3000, function () {
			console.log('Server has started')
		})
	})
}, function (error) {
	console.log('sync failed: ')
	console.log(error)
});