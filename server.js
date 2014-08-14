/*************************************
//
// battleship-socketio app
//
**************************************/

// express magic
var express = require('express');

// create express app, server and io socket
var app = express();
var server = require('http').createServer(app)
var io = require('socket.io').listen(server);
var device  = require('express-device');

var runningPortNumber = process.env.PORT; // run on heroku port


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

// one route, root path which calls board.ejs view
app.get("/", function(req, res){
	res.render('board', {});
});


// ---------------------------------------------------------------
// var game_room
var all_rooms = [];

io.sockets.on('connection', function (socket) {
	
	socket.emit('welcome');
	socket.emit('blast', {msg:"<span style=\"color:red !important\">Welcome! HOST or JOIN a game.</span>"});


	// HOST event
	// when socket emits host, a new room is created from input host room name and a message is sent to the host
	socket.on('host', function (data) {
		// data is --> {name, room_name}
		var room_check = GetRoomByRoomName(data.room_name);

		if (room_check) {

			socket.emit('host_error');

		} else {

			socket.emit('host_success');

			var player = {
				name: data.name,
				sID: socket.id,
				status: 'not ready'
			};

			var game_room = new BattleshipGame(data.room_name, player);

			socket.join(game_room.room_name);
			var msg = player.name + ' hosted room "' + game_room.room_name + '". Invite your friend now!';
			io.sockets.to(game_room.room_name).emit('blast', {msg: msg})

			SaveRoom(game_room);

		}

	});

	// JOIN event
	// when socket emits join, we check for room and if it exist, player 2 joins room
	socket.on('join', function (data) {
		// data is --> {name, room_name}

		var game_room = GetRoomByRoomName(data.room_name);

		// if room exist continue else emit join_error for no room existing
		if (game_room) {

			// if room doesnt have player2, add player to room else emit join_full for full room
			if (!game_room.hasPlayer2()) {

				socket.emit('join_success', game_room.room_name);

				var player = {
					name: data.name,
					sID: socket.id,
					status: 'not ready'
				};
				
				socket.join(game_room.room_name);
				game_room.addPlayerTwo(player);
				
				var msg = player.name + ' joined room "' + game_room.room_name + '".';
				io.sockets.to(game_room.room_name).emit('blast', {msg: msg})
				
				msg = 'Select your pieces and then press ready!';
				io.sockets.to(game_room.room_name).emit('set_pieces')
				io.sockets.to(data.room_name).emit('blast', {msg: msg})

				SaveRoom(game_room);

			} else {

				socket.emit('join_full');

			}

		} else {

			socket.emit('join_error');

		}
	});

	socket.on('ready', function (data) {
		// data is --> {
		// 		name,
		// 		room_name,
		// 		pieces,
		// 		status,
		// 		sID
		// }
		data["sID"] = socket.id;
		var game_room = GetRoomByRoomName(data.room_name);
		var player_number = game_room.whichPlayersName(data.name);

		if (player_number === 1){
			game_room.addPlayerOne(data);
			socket.emit('blast', {msg: "You are ready!"});
		} else {
			game_room.addPlayerTwo(data);
			socket.emit('blast', {msg: "You are ready!"});
		}
		SaveRoom(game_room);
		if (game_room.isStatusReady()) {
			game_room.playGame();
		}
	});





	socket.on('blast', function(data, fn){
		console.log(data);
		if (data.room_name === null ) {
			// io.sockets.emit('blast', {msg:data.msg});
			socket.emit('blast', {msg:"<span style=\"color:red !important\">HOST or JOIN a game to chat</span>"});
		} else {
			io.sockets.to(data.room_name).emit('blast', {msg: data.msg})
		}

		fn();//call the client back to clear out the field
	});

	socket.on('disconnect', function() {
		RemoveRoomsBySID(socket.id);
	});

});


server.listen(runningPortNumber);



// -------------------------------------------------------------------

// Saves room to all_rooms array --- 
// If room_name already exists, it slices it out and 
// adds the new instance back to the end of the array
function SaveRoom (room) {
	
	console.log("all_rooms length before: ", all_rooms.length);

	for (var i = 0; i < all_rooms.length; i++) {
		if (all_rooms[i].room_name === room.room_name) {
			all_rooms.splice(i,1);
		}
	}
	all_rooms.push(room);

	console.log("all_rooms length after: ", all_rooms.length);
	return true;

}

// Get room object by room name
function GetRoomByRoomName (room_name_lookup) {

	for (var i = 0; i < all_rooms.length; i++) {
		if (all_rooms[i].room_name === room_name_lookup) {
			return all_rooms[i];
		}
	}
	return null;

}

// Removes room from all_rroms array by socket ids
function RemoveRoomsBySID (sid) {
	console.log("all_rooms length before: ", all_rooms.length);

	for (var i = 0; i < all_rooms.length; i++) {
		if (all_rooms[i].hasSocketID(sid)) {
			all_rooms.splice(i,1);
			i -= 1;
		}
	}
	console.log("all_rooms length after: ", all_rooms.length);
	return true;

}



// ------------------------------------------------------------
// code for game instance
var BattleshipGame = function (room_name_host, player1_join) {
	this.room_name = room_name_host;
	var player1 = player1_join;
	var player2 = null;
	var turn = 1;
	this.hasPlayer2 = function () {
		if (player2 !== null) {
			return true;
		} else {
			return false;
		}
	}
	this.isStatusReady = function () {
		if (player1.status === "ready" && player2.status === "ready") {
			return true;
		}
		return false;
	}
	this.whichPlayersName = function (name) {
		if (player1.name === name) {
			return 1;
		} else {
			return 2;
		}
	}
	this.playGame = function () {
		io.sockets.to(this.room_name).emit('blast', {msg: "The game has begun!"});
		io.sockets.to(this.room_name).emit('game_start');
		PlayTurn();
	}
	this.addPlayerTwo = function (player2_join) {
		 player2 = player2_join;
	}
	this.addPlayerOne = function (player1_join) {
		 player1 = player1_join;
	}
	this.hasSocketID = function(sid) {
		if (player1) {
			if (player1.sID === sid) {
				return true;
			}
		} 
		
		if (player2) {
			if (player2.sID === sid) {
				return true;
			}
		} 
		
		return false;
	}

	function PlayTurn () {
		if (turn === 1) {
			io.sockets.socket(player1.sID).emit('guess_needed');
			io.sockets.socket(player1.sID).once('shot_guess', function (shot_id) {
				var isHit = CheckHit(shot_id, 1);
				if (isHit) {
					var shipSunk = CheckShip(1);
					if (shipSunk) {
						io.sockets.socket(player1.sID).emit('opposing_ship_sunk', shipSunk);
						io.sockets.socket(player2.sID).emit('own_ship_sunk', shipSunk);
					}
					io.sockets.socket(player1.sID).emit('shot_hit', shot_id);
					io.sockets.socket(player2.sID).emit('opposing_shot_hit', shot_id);
				} else {
					io.sockets.socket(player1.sID).emit('shot_miss', shot_id);
					io.sockets.socket(player2.sID).emit('opposing_shot_miss', shot_id);
				}
				turn = 2;
				PlayTurn();
			});


		} else {

			io.sockets.socket(player2.sID).emit('guess_needed');
			io.sockets.socket(player2.sID).once('shot_guess', function (shot_id) {
				var isHit = CheckHit(shot_id, 2);
				if (isHit) {
					var shipSunk = CheckShip(2);
					if (shipSunk) {
						io.sockets.socket(player2.sID).emit('opposing_ship_sunk', shipSunk);
						io.sockets.socket(player1.sID).emit('own_ship_sunk', shipSunk);
					}
					io.sockets.socket(player2.sID).emit('shot_hit', shot_id);
					io.sockets.socket(player1.sID).emit('opposing_shot_hit', shot_id);
				} else {
					io.sockets.socket(player2.sID).emit('shot_miss', shot_id);
					io.sockets.socket(player1.sID).emit('opposing_shot_miss', shot_id);

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

	CheckShip = function (player) {
		function allTrue(element, index, array) {
			if (element === true) {
		  	return true ;
		  } else {
		  	return false;
		  }
		}	

		if (player === 1) {

			var pieces = player2.pieces;
			for (var i = 0; i < pieces.length; i++) {

				var piece_name = pieces[i].name;
				var piece_hits = pieces[i].hits;
				var isSunk = piece_hits.every(allTrue);
				if (isSunk) {
					pieces.splice(i,1);
					return piece_name;
				}
				
			}
			return null;

		} else {

			var pieces = player1.pieces;
			for (var i = 0; i < pieces.length; i++) {

				var piece_name = pieces[i].name;
				var piece_hits = pieces[i].hits;
				var isSunk = piece_hits.every(allTrue);
				if (isSunk) {
					pieces.splice(i,1);
					return piece_name;
				}
				
			}
			return null;

		}


	}

}









