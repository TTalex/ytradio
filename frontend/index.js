function say(m){
    var msg = new SpeechSynthesisUtterance();
    var voices = window.speechSynthesis.getVoices();
    msg.voice = voices[10];
    msg.voiceURI = "native";
    msg.volume = 1;
    msg.rate = 1;
    msg.pitch = 0.8;
    msg.text = m;
    msg.lang = 'fr-FR';
    speechSynthesis.speak(msg);
}

var socket = io();
// 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
var flush;
var sound_list;
var currently_playing_type;

function loadandplaysound(filename) {
    flush = new Audio('/music?id=' + filename);
    flush.play();
}

function get_video_div(video, first ,index) {
    // console.log(video);
    var date = new Date(video.start_time);
    var timeformat = date.toTimeString().substr(0,8);
    var session = "";
    if (video.session) {
        switch (video.session.position) {
            case "first":
                session = "┌";
                break;
            case "last":
                session = "└";
                break;
            default:
                session = "│";
        }
        session = "<span style='margin-left: 5px; margin-right: 5px'>" + session + "</span>";
    }
    if (first) {
        var delete_button = '<div onClick="alterlist(0, ' + index + ')" style="display: inline; margin-left: 10px; cursor: pointer;"><i class="far fa-times-circle"></i></div>';
        if (video.session) {
            // No deleting in a session
            delete_button = "";
        }
        return '<li class="list-group-item list-group-item-success">' +
        '<div style="float:left; white-space: nowrap; width:80%; overflow:hidden;">' +
        '<span style="color:grey; font-size:11px; margin-right: 8px;">' + timeformat + "</span> " +
        session +
        video.title + " (" + video.requester + ')' +
        '</div><div style="float:right">' +
        delete_button +
        '<div onClick="alterlist(3, ' + index + ')" style="display: inline; margin-left: 10px; cursor: pointer;"><i class="fa fa-angle-double-right"></i></span></div>' +
        '</div>' +
        '</li>';
    } else {
        var up_down_controls = '<div onClick="alterlist(0, ' + index + ')" style="display: inline; margin-left: 10px; cursor: pointer;"><i class="far fa-times-circle"></i></div>' +
        '<div onClick="alterlist(1, ' + index + ')" style="display: inline; margin-left: 10px; cursor: pointer;"><i class="fas fa-caret-up"></i></span></div>' +
        '<div onClick="alterlist(2, ' + index + ')" style="display: inline; margin-left: 10px; cursor: pointer;"><i class="fas fa-caret-down"></i></div>';
        if (video.session) {
            // No moving in a session
            up_down_controls = "";
        }
        return '<li class="list-group-item">' +
        '<div style="float:left; white-space: nowrap; width:80%; overflow:hidden;">' +
        '<span style="color:grey; font-size:11px; margin-right: 8px;">' + timeformat + "</span> " +
        session +
        video.title + " (" + video.requester + ')' +
        '</div><div style="float:right">' +
        up_down_controls +
        '</div>' +
        '</li>';
    }
}
// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '300',
        width: '640',
        playerVars: {
            rel: 0,
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
    socket.on('list', function(list_obj){
        var list = list_obj.list;
        console.log("list_obj", list_obj);
        $('#list').empty();
        for (var i = 0; i < list.length; i++) {
            $('#list').append(get_video_div(list[i], i === 0, i));
        }
        $('#session_display').empty();
        if (list.length > 0 && list[0].session) {
            $('#session_display').append("(Session en cours: " + list[0].session.name + ")");
        }
        $('#playlist_name').empty();
        $('#playlist_name').append(list_obj.list_name);
        if (list_obj.play && list.length > 0) {
            currently_playing_type = list[0].type;
            switch (list[0].type) {
                case "video":
                    player.loadVideoById(list[0].id);
                    break;
                case "text":
                    say(list[0].message);
                    break;
                case "sound":
                    loadandplaysound(list[0].title);
                    break;
                default:

            }
        }
    });
    socket.on('seek', function(msg){
        setTimeout(function () {
            if (currently_playing_type == "video") {
                player.seekTo(msg + 1);
            }
        }, 1000);
        if (flush) {
            flush.currentTime = msg;
        }
        //player.playVideo();
    });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
    console.log("Ready ! play");
    socket.emit('ready', "true");
    // console.log(event);
    console.log(player.getPlayerState());
    if (player.getPlayerState() != 5) {
        event.target.playVideo();
    }
}

// 5. The API calls this function when the player's state changes.
function onPlayerStateChange(event) {
}

function add_request (top) {
    socket.emit('request', {
        request: $('#mrequest').val(),
        requester: $('#who').val(),
        top: top
    });
    //$('#m').val('');
    return false;
}

function add_requesttext (top) {
    socket.emit('requesttext', {
        request: $('#mrequesttext').val(),
        requester: $('#who').val(),
        top: top
    });
    //$('#m').val('');
    return false;
}

function add_requestsound (top) {
    socket.emit('requestsound', {
        request: sound_list[$('#mrequestsound').val()],
        requester: $('#who').val(),
        top: top
    });
    //$('#m').val('');
    return false;
}

$('#upload').submit(function(){
    $(this).ajaxSubmit({

        error: function(xhr) {
            console.log('Error: ' + xhr.status);
        },

        success: function(response) {
            //console.log(response);
        }
    });
    //Very important line, it disable the page refresh.
    return false;
});

function stop_currently_playing() {
    if (flush) {
        flush.pause();
        flush.currentTime = 0;
    } else {
        player.stopVideo();
    }
}
function alterlist(type, index) {
    switch (type) {
        case 0:
            stop_currently_playing();
            socket.emit('alterlist', {
                action: "delete",
                src: index
            });
            break;
        case 1:
            // Up one
            socket.emit('alterlist', {
                action: "order",
                src: index,
                dst: index - 1
            });
            break;
        case 2:
            // Down one
            socket.emit('alterlist', {
                action: "order",
                src: index,
                dst: index + 1
            });
            break;
        case 3:
            stop_currently_playing();
            // Skip
            socket.emit('alterlist', {
                action: "skip"
            });
            break;
        default:

    }
}

function refresh_list() {
    $.get("/sounds", function (data) {
        // console.log(data);
        sound_list = data.sounds;
        $('#mrequestsound').empty();
        for (var i = 0; i < data.sounds.length; i++) {
            $('#mrequestsound').append("<option value='" + i + "'>" + data.sounds[i].title + "</option>");
        }
    });
}
refresh_list();

function select_list(new_list) {
    var list_name;
    if (new_list) {
        list_name = $('#mplaylist').val();
    } else {
        list_name = $('#mselectplaylist').val();
    }
    console.log(list_name);
    $.get("/selectlist/" + list_name);
}

function get_playlists() {
    $.get("/playlists", function(data) {
        var files = data.files;
        for (var i = 0; i < files.length; i++) {
            name = files[i].split(".")[0];
            $('#mselectplaylist').append("<option value='" +name + "'>" +name + "</option>");
        }
    });
}
get_playlists();
