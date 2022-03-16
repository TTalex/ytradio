# YT Radio
![YT Radio](frontend/ytradio.png)

YT Radio is a collaborative radio playing Youtube videos and other sounds in sync to listeners.

Users can add various types of content:
* Youtube videos
* Custom mp3
* Text that will be read out loud

The content is divided in playlists, any listener can reorder the playlist and skip content at anytime. The content is always playing and cannot be paused.

Modifications are applied in real time to all other listeners. If someone skips some content, the content is skipped for everyone.

This tool was originally made for music, but it could be used as a way of watching youtube videos in sync with friends.

## Deployment
First, be sure to edit `config.js` with your Youtube API Key.

Then, install the dependencies
```
npm install
```

Executing the database helper will create a new sound database
```
node db/helper.js
```

The server runs on port 3000 by default
```
node index.js
```
