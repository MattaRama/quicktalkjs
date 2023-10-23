const Server = require("../server");
const User = require("../user");

module.exports = {
  type: 'getUsers',
  disabled: false,

  /**
   * @param {any} json 
   * @param {User} user 
   * @param {Server} server 
   */
  async handleRequest(json, user, server) {
    user.encryptedWrite(JSON.stringify({
      type: 'getUsers',
      users: Object.keys(server.users),
      recv: json
    }));
  }
};