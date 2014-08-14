/*************************************
//
// battleship-socketio app
//
**************************************/

// connect to our socket server or heroku
// var socket = io.connect('http://10.10.10.10:3000/');
var socket = io.connect(window.location.hostname);

var app = app || {};


// shortcut for document.ready
$(function(){
	//setup some common vars
	var $blastField = $('#blast'),
		$allPostsTextArea = $('#allPosts'),
		$clearAllPosts = $('#clearAllPosts'),
		$sendBlastButton = $('#send');


	//SOCKET STUFF
	socket.on("blast", function(data){
		var copy = $allPostsTextArea.html();
		$allPostsTextArea.html('<p>' + copy + data.msg + "</p>");
		$allPostsTextArea.scrollTop($allPostsTextArea[0].scrollHeight - $allPostsTextArea.height());
		//.css('scrollTop', $allPostsTextArea.css('scrollHeight'));

	});

	socket.on("new game", function(data) {
		var game = data;
		console.log("game", game);
	});
	
	$clearAllPosts.click(function(e){
		$allPostsTextArea.text('');
	});

	// var $sendBlastButton = $('#send');
	// $sendBlastButton.click(function(e){
	// 	console.log("current room name", current_room_name);
	// 	var blast = $blastField.val();
	// 	if(blast.length){
	// 		socket.emit("blast", {msg:blast}, 
	// 			function(data){
	// 				$blastField.val('');
	// 			});
	// 	}
	// });

	$blastField.keydown(function (e){
    if(e.keyCode == 13){
      $sendBlastButton.trigger('click');//lazy, but works
    }
	})
	
});