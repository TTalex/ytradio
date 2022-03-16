var YouTube = require('youtube-node');
var moment = require('moment');
var config = require('./config');


var youTube = new YouTube();
youTube.setKey(config.youtubeApiKey);

function extractIdFromUrl(url){
    var id = '';
    url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    if(url[2] !== undefined) {
        id = url[2].split(/[^0-9a-z_\-]/i);
        id = id[0];
    }
    else {
        id = url;
    }
    return id;
}

// Calls youtube API using a video URL to retrieve its title and duration
function getbyUrl(url, cb) {
    var id = extractIdFromUrl(url);
    youTube.getById(id, function(error, result) {
        if (error || !result?.items?.[0]?.contentDetails || !result?.items?.[0]?.snippet) {
            console.log(error);
            cb(true, null);
        }
        else {
            cb(false, {
                "id": id,
                "type": "video",
                "title": result.items[0].snippet.title,
                "duration": moment.duration(result.items[0].contentDetails.duration).asSeconds()
            });
        }
    });
}

module.exports = {
    getbyUrl: getbyUrl
};
