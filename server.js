/*************************************
//
// battleship-socketio app
//
**************************************/

// express magic
var express = require('express');
var app = express();
var server = require('http').createServer(app)
var io = require('socket.io').listen(server);
var device  = require('express-device');

var runningPortNumber = process.env.PORT;


app.configure(function(){
	// I need to access everything in '/public' directly
	app.use(express.static(__dirname + '/public'));

	//set the view engine
	app.set('view engine', 'ejs');
	app.set('views', __dirname +'/views');

	app.use(device.capture());
});


// logs every request
app.use(function(req, res, next){
	// output every request in the array
	console.log({method:req.method, url: req.url, device: req.device});

	// goes onto the next function in line
	next();
});

// app.get("/chat", function(req, res){
// 	res.render('index', {});
// });

app.get("/", function(req, res){
	res.render('board', {});
});

// var game_room
var all_rooms = [];

io.sockets.on('connection', function (socket) {


	socket.on('host', function (data) {
		socket.join(data.room_name);
		var player = {
			name: data.name,
			id: socket.id,
			status: 'not ready'
		};
		var game_room = new BattleshipGame(data.room_name, player);
		all_rooms.push(game_room);
		var msg = player.name + ' hosted room "' + data.room_name + '". Invite your friend now!';
		io.sockets.to(data.room_name).emit('blast', {msg: msg})
	});


	socket.on('join', function (data) {
		var player = {
			name: data.name,
			id: socket.id,
			status: 'not ready'
		};

		var room = GetGameByRoomName(data.room_name);

		if (room) {

			socket.emit('room_joined', data.room_name);
			socket.join(data.room_name);
			room.addPlayerTwo(player);
			SaveGameByRoomName(room);
			
			var msg = player.name + ' joined room "' + data.room_name + '".';
			io.sockets.to(data.room_name).emit('blast', {msg: msg})

			var count = io.sockets.clients(data.room_name).length;

			if (count == 2) {
				io.sockets.to(data.room_name).emit('set_pieces')
				var msg = 'Select your pieces and then press ready!';
				io.sockets.to(data.room_name).emit('blast', {msg: 'Select your pieces and then press ready!'})
			}

		} else {

			socket.emit('no_room');

		}
	});

	socket.on('ready', function (data) {
		data.id = socket.id;
		var room = GetGameByRoomName(data.room_name);
		var player_number = room.whichPlayersName(data.name);
		if (player_number == 1){
			room.addPlayerOne(data);
			socket.emit('blast', {msg: "you are ready!"});
		} else {
			room.addPlayerTwo(data);
			socket.emit('blast', {msg: "you are ready!"});
		}
		SaveGameByRoomName(room);
		if (room.isStatusReady()) {
			room.playGame();
		}
	});




	// io.sockets.emit('blast', {msg:"<span style=\"color:red !important\">someone connected</span>"});

	socket.on('blast', function(data, fn){
		console.log(data);
		io.sockets.emit('blast', {msg:data.msg});

		fn();//call the client back to clear out the field
	});

});


server.listen(runningPortNumber);



function GetGameByRoomName (room_name_lookup) {

	for (var i = 0; i < all_rooms.length; i++) {
		if (all_rooms[i].room_name === room_name_lookup) {
			return all_rooms[i];
		}
	}
	return null;

}

function SaveGameByRoomName (room) {
	for (var i = 0; i < all_rooms.length; i++) {
		if (all_rooms[i].room_name === room.room_name) {
			all_rooms.slice(1,1);
			all_rooms.push(room)
			return true
		}
	}
	return false

}

var BattleshipGame = function (room_name_host, player1_join) {
	this.room_name = room_name_host;
	var player1 = player1_join;
	var player2;
	var turn = 1;
	this.isStatusReady = function () {
		console.log("player1 status", player1.status);
		console.log("player2 status", player2.status);
		if (player1.status === "ready" && player2.status === "ready") {
			return true;
		}
		return false;
	}
	this.whichPlayersName = function (name) {
		if (player1.name == name) {
			return 1;
		} else {
			return 2;
		}
	}
	this.playGame = function () {
		console.log("this.room_name", this.room_name);
		io.sockets.to(this.room_name).emit('blast', {msg: "The game has begun!"});
		PlayTurn();
	}
	this.addPlayerTwo = function (player2_join) {
		 player2 = player2_join;
	}
	this.addPlayerOne = function (player1_join) {
		 player1 = player1_join;
	}


	function PlayTurn () {
		if (turn === 1) {
			io.sockets.socket(player1.id).emit('guess_needed');
			io.sockets.socket(player1.id).once('shot_guess', function (shot_id) {
				var isHit = CheckHit(shot_id, 1);
				if (isHit) {
					io.sockets.socket(player1.id).emit('shot_hit', shot_id)
				} else {
					io.sockets.socket(player1.id).emit('shot_miss', shot_id)
				}
				turn = 2;
				PlayTurn();
			});


		} else {

			io.sockets.socket(player2.id).emit('guess_needed');
			io.sockets.socket(player2.id).once('shot_guess', function (shot_id) {
				var isHit = CheckHit(shot_id, 2);
				if (isHit) {
					io.sockets.socket(player2.id).emit('shot_hit', shot_id)
				} else {
					io.sockets.socket(player2.id).emit('shot_miss', shot_id)
				}
				turn = 1;
				PlayTurn();
			});


		}
		



	}


	CheckHit = function (shot_id, player) {
		
		if (player === 1) {

			var pieces = player2.pieces;
			for (var i = 0; i < pieces.length; i++) {

				var points = pieces[i].points
				for (var j = 0; j < points.length; j++) {
					if (points[j] === shot_id) {
						player2.pieces[i].hits[j] = true;
						return true;
					}
				}
			}
			return false;

		} else {

			var pieces = player1.pieces;
			for (var i = 0; i < pieces.length; i++) {

				var points = pieces[i].points
				for (var j = 0; j < points.length; j++) {
					if (points[j] === shot_id) {
						player1.pieces[i].hits[j] = true;
						return true;
					}
				}
			}
			return false;

		}
	}

}









