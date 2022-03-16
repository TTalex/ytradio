var io;
function emit_list(list_dict) {
    io.emit("list", {
        list: list_dict.list,
        play: list_dict.play,
        list_name: list_dict.list_name
    });
}
function emit_seek(seek) {
    io.emit('seek', seek);
}

function init(_io, brain) {
    io = _io;
    io.on('connection', function(socket){
        // Endpoint to add a video to the current playlist
        socket.on('request', function(msg){
            brain.add_request_to_list(msg, function(list_dict) {
                emit_list(list_dict);
            })
        });

        // Endpoint to add a text that will be read outloud to the current playlist
        socket.on('requesttext', function(msg){
            brain.add_requesttext_to_list(msg, function(list_dict) {
                emit_list(list_dict);
            });
        });

        // Endpoint to add an existing sound to the current playlist
        socket.on('requestsound', function(msg){
            brain.add_requestsound_to_list(msg, function(list_dict) {
                emit_list(list_dict);
            });
        });

        // Endpoint to modify the current playlist, users can remove or move list content.
        socket.on('alterlist', function(msg){
            brain.alter_list(msg, function(list_dict, send_seek_zero) {
                if (send_seek_zero) {
                    emit_seek(0);
                }
                emit_list(list_dict);
            });
        });

        // Called when an user loaded the page, sends him the current playlist and position
        socket.on('ready', function(msg){
            brain.current_state(function(list_dict, seek) {
                socket.emit("list", {
                    list: list_dict.list,
                    play: list_dict.play,
                    list_name: list_dict.list_name
                });
                socket.emit('seek', seek);
            })
        });
    });
}

module.exports = {
    init: init,
    emit_list: emit_list,
    emit_seek: emit_seek
};
