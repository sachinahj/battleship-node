// var app = app || {};


// shortcut for document.ready
$(function() {

  // var name = prompt("What is your name?", "name...");
  var person_name = Date.now().toString();
  var current_room_name;

  // Battle Piece constructor function
  var BattlePiece = function (name, size, start_point, end_point ) {

    this.name = name;
    this.size = size;
    this.start_point = start_point;
    this.end_point = end_point;
    this.hits = [];

    for (var i = 0; i < size; i++) {
      this.hits.push(null);
    }
    this.points = new Array(size);

    this.setStartPoint = function(id) {
      if ($('#'+id).hasClass('chosen')) {
        return false;
      } else {
        this.start_point = id;
        this.points[0] = this.start_point;
        return true;
      }
    }

    this.setEndPoint = function(id) {
      if (id[0] == this.start_point[0] || id.slice(1,3) == this.start_point.slice(1,3)) {
        this.end_point = id;
        this.points[this.size-1] = this.end_point
        this.fillInPoints();
        return true;
      } else {
        return false;
      }
    }

    this.fillInPoints = function (id) {
      if (this.start_point[0] == this.end_point[0]) {
        var letter = this.start_point[0];
        var number = parseInt(this.start_point.slice(1,3));
        var count_up = false;
        if (parseInt(this.end_point.slice(1,3)) > parseInt(this.start_point.slice(1,3))) {
          count_up = true;
        }
        for (var i = 1; i < this.points.length; i++) {
          if (count_up) {
            number += 1;
            this.points[i] = letter.toString() + number;
          } else {
            number -= 1;
            this.points[i] = letter.toString() + number;
          }
        }
        return true;
      } else {
        var letter = this.start_point[0]
        var letter_number = letter_conversion[letter]
        var number = parseInt(this.start_point.slice(1,3));
        var count_up = false;
        if (letter_conversion[this.end_point[0]] > letter_conversion[this.start_point[0]] ) {
          count_up = true;
        }
        for (var i = 1; i < this.points.length; i++) {
          if (count_up) {
            letter_number += 1;
            this.points[i] = letter_conversion[letter_number] + number;
          } else {
            letter_number -= 1;
            this.points[i] = letter_conversion[letter_number] + number;
          }
        }
        return true;
      }
    }

  };

  var piece_carrier = new BattlePiece("Carrier", 5, null, null);
  var piece_battleship = new BattlePiece("Battleship", 4, null, null);
  var piece_submarine = new BattlePiece("Submarine", 3, null, null);
  var piece_destroyer = new BattlePiece("Destroyer", 3, null, null);
  var piece_patrol_boat = new BattlePiece("Patrol Boat", 2, null, null);

  var pieces = [
    piece_carrier,
    piece_battleship,
    piece_submarine,
    piece_destroyer,
    piece_patrol_boat
  ]

  var letter_conversion = {
    "A": 1,
    "B": 2,
    "C": 3,
    "D": 4,
    "E": 5,
    "F": 6,
    "G": 7,
    "H": 8,
    "I": 9,
    "J": 10,
    1: "A",
    2: "B",
    3: "C",
    4: "D",
    5: "E",
    6: "F",
    7: "G",
    8: "H",
    9: "I",
    10: "J"

  };

// ---------------------------------------------------------
  // on WELCOME
  socket.on('welcome', function () {
    $('#join').off('click').show();
    $('#host').off('click').show();
  });


  // on HOST button click
  $('#host').on('click', function() {
      var room_name_to_host;
      input = prompt('Enter the room name of the room name you want to host. (Must be 4 characters)');

      if (input != null) {

        if (input.length === 4) {

          room_name_to_host = input;
          socket.emit("host", {name: person_name, room_name: room_name_to_host});
          
          socket.once("host_success", function () {
            current_room_name = room_name_to_host;
            $('#join').off('click').hide();
            $('#host').off('click').hide();
            $('#status').html('<h4>Waiting on opponent to connect</h4>').show();
          });

          socket.once("host_error", function () {
            alert("Room name already exist, choose another!")
          });

        } else {

          alert('room must be 4 characters');
        }

      }
  });

  // on JOIN button click
  $('#join').on('click', function() {
    
    var room_name_to_join;
    input = prompt('enter room name to join of 4 characters');
    
    if (input.length === 4) {
      room_name_to_join = input;
    }
    
    socket.emit("join", {name: person_name, room_name: room_name_to_join});
    
    socket.once('join_error', function () {
      alert('No room exist with this name!');
    });

    socket.once('join_full', function () {
      alert('Room is full!');
    });
    
    socket.once('join_success', function (room_name_joined) {
      current_room_name = room_name_joined
      $('#join').off('click').hide();
      $('#host').off('click').hide();
    });

  });

  socket.on('set_pieces', function () {
    $('#status').html('<h4>Place Pieces</h4>').show();
    SelectPieces();    
  });

  $('#ready').on('click', function () {
    $('#status').html('<h4>Waiting</h4>');
    socket.emit('ready', {name: person_name, room_name: current_room_name, pieces: pieces, status: 'ready', sID: null})
    $(this).hide();
  });

  socket.on('guess_needed', function () {
    $('#status').html('<h4>Your Turn</h4>');
    $(document).on('click', '.empty-shot', function () {
      var shot_id = $(this).attr('id');
      socket.emit('shot_guess', shot_id);
      $('#status').html('<h4>Waiting</h4>');
    });
  });

  socket.on('shot_hit', function(shot_id) {
    $('.shot-spot#'+shot_id).removeClass('empty-shot');
    $('.shot-spot#'+shot_id).addClass('hit-shot');
  });
  
  socket.on('opposing_shot_hit', function (shot_id) {
    $('.danger-spot#'+shot_id).removeClass('chosen-spot');
    $('.danger-spot#'+shot_id).addClass('hit-spot');
  });
  socket.on('opposing_shot_miss', function (shot_id) {
    $('.danger-spot#'+shot_id).removeClass('empty-spot');
    $('.danger-spot#'+shot_id).addClass('miss-spot');
  });


  socket.on('shot_miss', function(shot_id) {
    $('.shot-spot#'+shot_id).removeClass('empty-shot');
    $('.shot-spot#'+shot_id).addClass('miss-shot');
  });




// -----------------------------------------------

  // function to check if user has correctly placed pieces 
  // by checking if all hit points are unique
  function NumberOfHitPoints () {
    var all_hit_points = [];
    for (var i = 0; i < pieces.length; i++) {
      for (var j = 0; j < pieces[i].points.length; j++) {
        all_hit_points.push(pieces[i].points[j]);
      }
    }

    function onlyUnique(value, index, self) { 
      return self.indexOf(value) === index;
    }

    var hit_points = all_hit_points.filter(onlyUnique);
    console.log("all_hit_points.length", hit_points.length);
    if (hit_points.length == 17) {
      return true;
    } else {
      return false;
    }
  }


  // function to have user set all pieces 
  // check at end to see if peices are set correctly
  function SelectPieces () {
    
    var piece_number = 0;

    $(document).on('click', 'td.empty-spot', function () {
      var id = $(this).attr('id');
      $(this).removeClass('empty-spot');
      $(this).addClass('chosen-spot');
      setStartPoint(id)
    });



    function setStartPoint(id) {
      if (pieces[piece_number].setStartPoint(id)) {
        $(document).off('click', 'td.empty-spot');
        $(document).on('click', 'td.empty-spot', function () {
          var id = $(this).attr('id');
          setEndPoint(id);
        });
        return true;
      } else {
        return false;
      }

    }

    function setEndPoint(id) {
      if (pieces[piece_number].setEndPoint(id)) {
        $(document).off('click', 'td.empty-spot');
        for (var i = 0; i < pieces[piece_number].points.length; i++ ) {
          $('#'+pieces[piece_number].points[i]).removeClass('empty-spot');
          $('#'+pieces[piece_number].points[i]).addClass('chosen-spot');
        }
        if (piece_number < 4) {

          $(document).on('click', 'td.empty-spot', function () {
            var id = $(this).attr('id');
            $(this).removeClass('empty-spot');
            $(this).addClass('chosen-spot');
            setStartPoint(id);
          });
          piece_number += 1;
          return true;

        } else {

          var correctlySet = NumberOfHitPoints();
          console.log("correctlySet", correctlySet);
          if (!correctlySet) {
            $('.danger-spot').addClass('empty-spot');
            $('.danger-spot').removeClass('chosen-spot');
            SelectPieces();
          } else {
            $('#ready').show();
            return true;
          }

        }

      } else {

        return false;

      }
    }


  }



});



