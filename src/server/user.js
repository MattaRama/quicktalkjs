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
    try {
      this.socket.write(this.encryptionManager.encryptToRemote(str));
    } catch {
      console.log(`[FAULT] failed to encryptedWrite on user ${this.userID}`);
    }
  }
}

module.exports = User;