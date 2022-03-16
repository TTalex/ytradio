var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('db/sounds.db');

function getsounds(cb) {
  db.all("SELECT * from Sounds", cb);
}

function addsound(title, path, duration, cb) {
  // console.log("INSERT INTO Sounds (?, ?, ?)", title, path, duration);
  db.run("INSERT INTO Sounds VALUES (NULL, ?, ?, ?)", title, path, duration, cb);
}

if (require.main === module) {
  db.serialize(function() {
    db.run("CREATE TABLE Sounds (id INTEGER PRIMARY KEY, title TEXT UNIQUE, path TEXT, duration INT)");
  });
}

module.exports = {
  getsounds: getsounds,
  addsound: addsound
};
