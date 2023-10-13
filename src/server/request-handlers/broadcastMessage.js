const Server = require("../server");
const User = require("../user");

module.exports = {
  type: 'broadcastMessage',
  disabled: false,
  
  /**
   * @param {any} json 
   * @param {User} user 
   * @param {Server} server 
   */
  async handleRequest(json, user, server) {
    if (typeof json['message'] !== 'string' || json['message'].trim().length === 0) {
      user.encryptedWrite(JSON.stringify({
        type: 'error.invalidParameters',
        recv: json
      }));
      return;
    }

    console.log(`[Message] ${user.userID}: "${json['message']}"`);
    
    server.broadcast(JSON.stringify({
      type: 'broadcastMessage',
      author: user.userID,
      message: json['message']
    }));
  }
};