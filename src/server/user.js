const EncryptionManager = require("../encryption-manager");
const { Socket } = require('net');

class User {
  /** @type {Socket} */
  socket;
  /** @type {string} */
  userID;
  /** @type {EncryptionManager} */
  encryptionManager;

  constructor(socket, userID, encryptionManager) {
    this.socket = socket;
    this.userID = userID;
    this.encryptionManager = encryptionManager;
  }

  /** @param {string} str */
  encryptedWrite(str) {
    console.log(str);
    this.socket.write(this.encryptionManager.encryptToRemote(str));
  }
}

module.exports = User;