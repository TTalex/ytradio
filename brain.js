var socket_helper = require('./socket_helper');
var yt = require('./ytapi');
var fs = require('fs');

var list_file = __dirname + '/playlists/' + "default.json";
var list = [];
var seek = 0;
var video_duration;

function extract_list_name(lf) {
    if (lf){
        var splited = lf.split("/");
        var splited2 = splited[splited.length - 1].split(".");
        return splited2[0];
    }
    return lf;
}

function load_list_file(list_file_name, cb) {
    fs.open(list_file_name, "wx", function(err, fd) {
        fs.readFile(list_file_name, function(err, data) {
            if (!err) {
                list_file = list_file_name;
                if (!data || data.length === 0) {
                    list = [];
                } else {
                    list = JSON.parse(data);
                    recompute_start_times(list);
                }
                seek = 0;
                if (list.length === 0) {
                    socket_helper.emit_list({list: list, play: false, list_name: extract_list_name(list_file)})
                }
            }
            cb();
        });
    });
}


function save_list_to_file(list) {
    fs.writeFile(list_file, JSON.stringify(list), function(err) {
        if (err) {
            console.log(err);
        }
    });
}
function compute_last_start_time(list) {
    if (list.length === 1) {
        list[0].start_time = Date.now();
    } else {
        list[list.length - 1].start_time = list[list.length - 2].start_time + list[list.length - 2].duration * 1000;
    }
}

function recompute_start_times(list) {
    var new_list = [];
    if (list.length !== 0) {
        // new_list.push(list[0]);
        for (var i = 0; i < list.length; i++) {
            new_list.push(list[i]);
            compute_last_start_time(new_list);
        }
    }
    return list;
}

function add_to_list(elt, top, cb) {
    var insert_index;
    var i;
    if (top) {
        insert_index = 1;
        // check if second list element is marked with session
        if (list?.[1].session && list[1].session.position != "first") {
            // skip all session marked entries with a loop, and push
            for (i = 1; i < list.length; i++) {
                if(list[i].session && list[i].session.position === "last") {
                    insert_index = i + 1;
                    break;
                }
            }
        }
        list.splice(insert_index, 0, elt);
        list = recompute_start_times(list);
    } else {
        insert_index = list.length - 1;
        // check if last list element is marked with session
        if (list.length > 0 && list[list.length - 1].session) {
            // skip all session marked entries with a descending loop, and push
            for (i = list.length - 1; i >= 0; i--) {
                if(list[i].session && list[i].session.position === "first") {
                    insert_index = i;
                    break;
                }
            }
        }
        // list.push(elt);
        list.splice(insert_index, 0, elt);
        if (insert_index === list.length - 1) {
            compute_last_start_time(list);
        } else {
            list = recompute_start_times(list);
        }
    }
    save_list_to_file(list);
    cb({list: list, play: false, list_name: extract_list_name(list_file)});
}

function skip() {
    var a = list.shift();
    list.push(a);
    seek = 0;
    video_duration = 0;
    if (list.length < 1) {
        socket_helper.emit_list({list: list, play: false, list_name: extract_list_name(list_file)});
    }
    save_list_to_file(list);
}

function add_request_to_list(msg, cb) {
    yt.getbyUrl(msg.request, function(err, video) {
        if (!err) {
            video.requester = msg.requester;
            add_to_list(video, msg.top, cb);
        }
    });
}

function add_requesttext_to_list(msg, cb) {
    var requesttext = {
        type: "text",
        title: "Petit message",
        message: msg.request,
        requester: msg.requester,
        duration: Math.ceil(msg.request.length / 15)
    };
    add_to_list(requesttext, msg.top, cb);
}
function add_requestsound_to_list(msg, cb) {
    var requestsound = {
        type: "sound",
        title: msg.request.title,
        requester: msg.requester,
        duration: msg.request.duration
    };
    add_to_list(requestsound, msg.top, cb);
}

// Called when an user makes modification to a playlist, users can remove or move list content.
function alter_list(msg, cb) {
    var i;
    var start;
    var send_seek_zero = false;
    switch (msg.action) {
        case "delete":
            list.splice(msg.src, 1);
            if (msg.src === 0) {
                // We're deleting the first element, let's break the reading
                seek = 0;
                send_seek_zero = true;
            }
            break;
        case "order":
            if (msg.dst > 0) {
                if (msg.dst === list.length) {
                    msg.dst = 0;
                }
                // check if list is session marked
                if (list[msg.dst].session) {
                    // if yes, check if dst < src -> loop reverse until not session marked (watch for <0)
                    if (msg.dst < msg.src) {
                        start = msg.dst;
                        for (i = start; i >= 0; i--) {
                            if(list[i].session && list[i].session.position == "first") {
                                msg.dst = i;
                                break;
                            }
                        }
                        if (msg.dst === 0) {
                            msg.dst = list.length - 1;
                        }
                        if (i < 0) {
                            // The end of the session wasn't found between msg.dst and the start of the list, we start from the end
                            for (i = list.length - 1; i > msg.dst; i--) {
                                if(list[i].session && list[i].session.position == "first") {
                                    msg.dst = i - 1;
                                    break;
                                }
                            }
                        }
                    } else {
                        // if yes, check if dst > src -> loop until not session marked (watch for >list length)
                        start = msg.dst;
                        for (i = start; i < list.length; i++) {
                            if(list[i].session && list[i].session.position == "last") {
                                msg.dst = i;
                                break;
                            }
                        }
                        if (i === list.length) {
                            // The end of the session wasn't found between msg.dst and the end of the list, we start from 0
                            for (i = 0; i < msg.dst; i++) {
                                if(list[i].session && list[i].session.position == "last") {
                                    msg.dst = i;
                                    break;
                                }
                            }
                        }
                    }

                }
                var elt = list.splice(msg.src, 1);
                list.splice(msg.dst, 0, elt[0]);
            }
            break;
        case "skip":
            skip();
            send_seek_zero = true;
            break;
        default:

    }
    list = recompute_start_times(list);
    var list_dict = {list: list, play: false, list_name: extract_list_name(list_file)};
    cb(list_dict, send_seek_zero);
}

function current_state(cb) {
    var list_dict = {list: list, play: true, list_name: extract_list_name(list_file)};
    cb(list_dict, seek);
}

// Every second, checks if the currently playing content has reached its end
// If so, skip to next content and inform listeners of the updated list
function brain_loop() {
    // console.log("seek", seek)
    // console.log("video_duration", video_duration);
    if (list.length > 0) {
        if (seek === 0) {
            console.log("playing", list[0].title)
            socket_helper.emit_list({list: list, play: true, list_name: extract_list_name(list_file)});

            if (list[0].type === "video") {
                socket_helper.emit_seek(seek);
            }
            seek += 1;
            // Get video duration
            video_duration = list[0].duration;
            // video_duration = 10;
        } else if (seek >= video_duration) {
            skip();
        } else {
            seek += 1;
        }
    }
}

function init() {
    load_list_file(list_file, function(){});
    setInterval(brain_loop, 1000);
}

module.exports = {
    init: init,
    add_request_to_list: add_request_to_list,
    add_requesttext_to_list: add_requesttext_to_list,
    add_requestsound_to_list: add_requestsound_to_list,
    alter_list: alter_list,
    current_state: current_state,
    load_list_file: load_list_file
};
