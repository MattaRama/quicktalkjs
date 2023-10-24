const Server = require("../server");
const User = require("../user");

module.exports = {
  type: 'whisper',
  disabled: false,

  /**
   * @param {any} json 
   * @param {User} user 
   * @param {Server} server 
   */
  async handleRequest(json, user, server) {
    // prechecks
    if (typeof json['user'] !== 'string' || typeof json['message'] !== 'string') {
        user.encryptedWrite(JSON.stringify({
            type: 'error.invalidParameters',
            recv: json
        }));
        return;
    }

    if (server.users[json['user']] == null) {
        user.encryptedWrite(JSON.stringify({
            type: 'error.invalidUser',
            recv: json
        }))
        return;
    }

    if (json['message'].trim().length === 0) {
        user.encryptedWrite(JSON.stringify({
            type: 'error.invalidMessage',
            recv: json
        }));
        return;
    }

    // send data to user
    server.users[json['user']].encryptedWrite(JSON.stringify({
        type: 'whisper',
        from: user.userID,
        message: json['message'].trim()
    }));
  }
};