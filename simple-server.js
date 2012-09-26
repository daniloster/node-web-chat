var WebSocketServer = require('websocket').server;
var http = require('http');

var clients = [], history = [], webSocketsServerPort = 1337;
/**
* Helper function for escaping input strings
*/
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
    
function getClient(id) {
	for (var i in clients) {
		if (clients[i].id === id) return clients[i];
	}
	return null;
}

function iterateAll(handler) {
	for (var i in clients) {
		if (handler) {
			handler(clients[i]);
		}
	}
}

function setName(client, message) {
	var newName = message.substr(6);
	var eventDescription = '';
	if (!client.name) eventDescription += 'Defini meu nome como ' + newName;
	else  eventDescription += 'Alterei meu nome para ' + newName;
	client.name = newName;
	broadcast(client, eventDescription, 'setName');
}

function setColor(client, message) {
	var newColor = message.substr(7);
	var eventDescription = '';
	if (!client.color) eventDescription += 'Defini minha cor como ' + newColor;
	else  eventDescription += 'Alterei minha cor para ' + newColor;
	client.color = newColor;
	broadcast(client, eventDescription,  'setColor');
}

function broadcast(fromClient, message, type) {
	var msg = JSON.stringify({
		'typeMessage': type,
		'fromUser': fromClient.name,
		'withColor': (fromClient.color ? fromClient.color : 'black'),
		'message': message,
		'datetime': new Date().toLocaleString()
	});
	iterateAll(function(currentClient) {
		sendMessage(currentClient.socket, msg);
	});
}

function sendMessage(connection, message) {
	log(message);
	connection.sendUTF(message);
}

function log(message) {
	console.log(new Date() + ': ' + message);
}

var server = http.createServer(function(request, response) {});

server.listen(webSocketsServerPort, function() { 
	log('Servidor aguardando na porta ' + webSocketsServerPort);
});

// create the server
wsServer = new WebSocketServer({
    httpServer: server
});

// WebSocket server
wsServer.on('request', function(request) {
    //var connection = request.accept(null, request.origin);
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    var id = Math.random() + '.' + new Date().getTime();
    log(request.origin); 
    var connection = request.accept(null, request.origin);
    
    clients.push({
    	id: id,
    	socket: connection,
    	name: false,
    	color: false
    });
	
    function handleMessage(message) {
    	var client = getClient(id);
        if (client) {
            if (message.utf8Data.indexOf('/name ') === 0) {
            	setName(client, htmlEntities(message.utf8Data));
            } else if (message.utf8Data.indexOf('/color ') === 0) {
            	setColor(client, htmlEntities(message.utf8Data));
            } else {
            	broadcast(client, htmlEntities(message.utf8Data), 'appendMessage');
            }
       	}
    }
    
    for (var i in history) {
    	handleMessage(history[i]);
    }
    
    connection.on('error', function(data) {
    	log('ERROR: ' + JSON.stringify(data));
    });
    
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            // process WebSocket message
            log('MESSAGE: ' + message.utf8Data);
            history.push(message);
            if (history.length > 10)
            	history.shift();
            handleMessage(message);
        }
    });

    connection.on('close', function(connection) {
    	var i = -1;
    	for (i in clients) {
    		if (clients[i].id == id) {
    			if (clients[i].name != null)
        			log('Cliente ' + clients[i].name + ' desconectado!');
        		else 
        			log('Cliente desconhecido desconectado!');
        			
        		clients.slice(i, 1);
    			break;
    		}
    	}
    });
});
