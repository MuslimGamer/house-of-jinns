
map = {
    generate: function() {
        // Individual segments that may be a room or part of a room
        // eg. two adjacent locations without a dividing wall make up
        // a tall room. Three connected length-wise make a hallway. 
        // These are RoomData instances.   
        this.locations = [];

        // (x, y) => room (NOT room data)
        this.roomPositions = {};

        // 5x5 mansion
        this.width = 5;
        this.height = 5;

        this.generateAsymmetricalMansion();
    },

    createExit: function() {
        var exit = this.locations[0];
        while (exit.Type == "Entrance") {
            exit = this.locations[randomBetween(0, this.locations.length)];
        }

        exit.type = "Exit";
        exit.Colour = "white";
        console.log("Exit at " + exit.x + ",  " + exit.y);
    },

    setRoomAt: function(x, y, room) {
        var key = x + ", " + y;
        this.roomPositions[key] = room;
    },

    getRoomAt: function(x, y) {
        var key = x + ", " + y;
        return this.roomPositions[key];
    },
	
	findRoomWith: function(e) {
		var x = Math.floor(e.x / parseInt(config("roomWidth")));
		var y = Math.floor(e.y / parseInt(config("roomHeight")));
		return map.getRoomAt(x, y);
	},

    generateAsymmetricalMansion: function() {
        var newRoom = Crafty.e("Entrance");
        newRoom.at(0, 0);
        this.locations.push(newRoom);

        //Move though Locations list, generating/Attaching rooms until EoList or 100 rooms processed.
        for (var roomIndex = 0; roomIndex < this.locations.length && roomIndex < 50; roomIndex++) {
            var attempts = 0;
            var currentRoom = this.locations[roomIndex];

            while (currentRoom.numRoomsToConnect > 0 && attempts < 5) {
                //Attempt to select a direction not already linked
                var free = 1;
                while (free != undefined) {
                    var direction = Math.floor(Math.random() * 4);
                    switch (direction) {
                        case 0:
                            free = currentRoom.N;
                            break;
                        case 1:
                            free = currentRoom.S;
                            break;
                        case 2:
                            free = currentRoom.E;
                            break;
                        case 3:
                            free = currentRoom.W;
                            break;
                    }
                }

                //Good direction selected. Start generating new room
                //ID = array index
                var newRoomId = this.locations.length;
                //Select room type from potential connectable array of room object
                var roomTypeSelect = randomBetween(0, currentRoom.connectionType.length);
                var roomType = currentRoom.connectionType[roomTypeSelect];

                //Setup parameters for room placement functions
                var dir = "";
                var x = currentRoom.x;
                var y = currentRoom.y;
                switch (direction) {
                    case 0:
                        y -= 1;
                        dir = "South";
                        break;
                    case 1:
                        y += 1;
                        dir = "North";
                        break;
                    case 2:
                        x += 1;
                        dir = "West";
                        break;
                    case 3:
                        x -= 1;
                        dir = "East";
                        break;
                }

                //Prevent rooms being placed north of Entrance.
                //Entrance should be placed on edge of building, this prevents rooms wrapping around all sides.
                if (x < 0 || y < 0) {
                    attempts += 1;
                    continue;
                }

                //New room spawn
                var newRoom = Crafty.e(roomType)
                if (newRoom.Type!="Hallway"){
                newRoom.numRoomsToConnect = Math.round(Math.random()*newRoom.numRoomsToConnect)
                }
                //Place room and test if location not yet occupied
                var doesRoomExist = newRoom.at(x, y)

                //If X-Y position already occupied, ID of conflicting room returned
                //If ID returned != ID expected, room not placed. Attempt connection to existing room instead
                if (doesRoomExist == newRoomId) {
                    this.locations.push(newRoom);
                } else {
                    attempts += 1;
                    newRoom.destroy; //Room can not be placed. Purge
                    newRoomId = doesRoomExist; //Use ID of already placed room, attempt to make connection if possible.
                }
                //Create connection with neighbouring room (New or old).
                if (this.locations[newRoomId].canConnect(roomIndex, dir) == true)
                {
                    this.locations[newRoomId].connect(roomIndex, dir);
                }
            }            
        }

        for (var i = 0; i < this.locations.length; i++) {
            // Iterate and finally set direction data. This is to guarantee consistent two-way doors.
            // If we call this before all the rooms are connected, someone may onnect to us and thus
            // cause a one-way connection or a broken connection.
            this.locations[i].setDirectionData();
        }
    },

    // Creates the room entities (graphics). 
    createRoomEntities: function() {
        var roomWidth = config("roomWidth");
        var roomHeight = config("roomHeight");

        var minX = 99999;
        var maxX = 0;
        var minY = 99999;
        var maxY = 0;

        for (var roomIndex = 0; roomIndex < this.locations.length; roomIndex++) {
            var currentRoom = this.locations[roomIndex];
            
            var newRoom = Crafty.e("Room")
            	.create(currentRoom.x * roomWidth, currentRoom.y * roomHeight, roomWidth, roomHeight)
                .setupWalls(currentRoom.openDirections, currentRoom.wallDirections, currentRoom.doorDirections);
            
            newRoom.data = currentRoom;
            
            newRoom.floor.color(currentRoom.Colour)
            
            currentRoom.entity = newRoom;
            this.setRoomAt(currentRoom.x, currentRoom.y, newRoom);

            if (currentRoom.type == "Exit") {
                var stairs = Crafty.e("ExitStairs");
                stairs.move(newRoom.x + (newRoom.width - stairs.width()) / 2, newRoom.y + (newRoom.height - stairs.height()) / 2);
            }

            if (currentRoom.x < minX) {
                minX = currentRoom.x;
            }
            if (currentRoom.x > maxX) {
                maxX = currentRoom.x;
            }
            if (currentRoom.y < minY) {
                minY = currentRoom.y;
            }
            if (currentRoom.y > maxY) {
                maxY = currentRoom.y;
            }
        }

        // Fill any gaps between rooms with darkness
        for (var y = minY; y <= maxY; y++) {
            for (var x = minX; x <= maxX; x++) {
                var room = map.getRoomAt(x, y);
                if (typeof(room) === "undefined") {
                    // Grass patch. Darkness it.
                    Crafty.e("Darkness").move(x * roomWidth, y * roomHeight);
                }
            }
        }
    }
}

