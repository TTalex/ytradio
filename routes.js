var mp3Duration = require('mp3-duration');
var sound_helper = require('./db/helper');
var multer = require('multer');
var fs = require('fs');

var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './music');
    },
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }
});
var upload = multer({ storage : storage}).single('mp3');

function init(app, brain) {
    // Retrieve a music file from storage
    app.get('/music', function(req,res){
        var fileId = req.query.id;
        var file = __dirname + '/music/' + fileId;
        fs.exists(file,function(exists){
            if(exists)
            {
                var rstream = fs.createReadStream(file);
                rstream.pipe(res);
            }
            else
            {
                res.send("Its a 404");
                res.end();
            }

        });
    });
    // Retrieve a sound file from database
    app.get('/sounds', function(req,res){
        sound_helper.getsounds(function (err, sounds) {
            res.json({
                err: err,
                sounds: sounds
            });
        });
    });
    // upload a new file, computes its duration and saves the entry in database
    app.post('/uploadmusic', upload, function(req,res){
        //console.log(req);
        mp3Duration(req.file.path, function (err, duration) {
            sound_helper.addsound(req.file.originalname, req.file.path, Math.round(duration), function (err) {
                if (err) {
                    console.error(err);
                }
                res.end();
            });
        });
    });
    // Load a new playlist
    app.get('/selectlist/:list_name', function(req,res){
        var list_file_name;
        if (req.params.list_name) {
            list_file_name = __dirname + '/playlists/' + req.params.list_name + ".json";
        } else {
            list_file_name = __dirname + '/playlists/' + "default.json";
        }
        brain.load_list_file(list_file_name, function() {
            res.json({});
        });
    });
    // Get all the available playlists
    app.get('/playlists', function(req, res) {
        fs.readdir(__dirname + '/playlists/', function(err, files) {
            res.json({err: err, files: files});
        });
    });
}
module.exports = {init: init};
