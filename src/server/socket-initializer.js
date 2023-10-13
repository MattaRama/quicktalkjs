const { Socket } = require('net');
const Server = require('./server');
const EncryptionManager = require('../encryption-manager');
const crypto = require('crypto');
const { ENCRYPTION_VERIFICATION_LEN, USER_ID, MAX_KEY_GEN_ATTEMPTS } = require('./constants.json');
const User = require('./user');

class SocketInitializer {
  /** @type {Socket} */
  socket;
  /** @type {Server} */
  server;

  state = 0;

  /** @type {crypto.KeyObject | undefined} */
  remotePublicKey;

  /** @type {Buffer | undefined} */
  verification;

  /** @type {EncryptionManager | undefined} */
  encryptionManager;

  /** @type {string | undefined} */
  userID;

  /** 
   * @param {Socket} socket 
   * @param {Server} server
   */
  constructor(socket, server) {
    this.socket = socket;
    this.server = server;

    socket.on('data', (buffer) => {
      this.onData(buffer);
    });

    socket.write(server.options.encryptionManager.getLocalPublicRaw());
    this.state++;
  }

  /**
   * @param {Buffer} buffer 
   */
  onData(buffer) {
    this.state++;

    switch (this.state) {
      case 2:
        // receive client public
        var rawKey = buffer.toString();
        if (!EncryptionManager.isValidPublicKey(rawKey)) {
          this.socket.write('-1');
          this.socket.end();
        }

        for (var i = 0; i < MAX_KEY_GEN_ATTEMPTS && this.remotePublicKey == null; i++) {
          try {
            this.remotePublicKey = crypto.createPublicKey(rawKey);
          } catch {
            console.log(`[SockInit] Failed to create public key (attempt ${i})... trying again`);
          }
        }

        // send encrypted packet
        this.state++;
        this.verification = crypto.randomBytes(ENCRYPTION_VERIFICATION_LEN);
        this.socket.write(crypto.publicEncrypt(this.remotePublicKey, this.verification));
        break;
      case 4:
        // receieve client verification
        var decrypt = crypto.privateDecrypt(
          this.server.encryptionManager._private,
          buffer
        ).toString();
        if (!decrypt === this.verification) {
          this.socket.write('-2');
          this.socket.end();
          return;
        }

        // verification passed, setup encryption manager
        this.encryptionManager = this.server.encryptionManager.clone();
        this.encryptionManager.setRemotePublic(this.remotePublicKey);

        // request userID
        this.state++;
        this.socket.write(this.encryptionManager.encryptToRemote(JSON.stringify({
          type: 'getUserID'
        })));
        break;
      case 6:
        // get userID
        var reqRaw = this.encryptionManager.decryptFromRemote(buffer);
        var req;
        try {
          req = JSON.parse(reqRaw);
        } catch {
          this.socket.write(this.encryptionManager.encryptToRemote('-3'));
          this.socket.end();
          return;
        }

        // make sure UID is valid
        /** @type {string} */
        var uID = req['userID'];
        
        if (uID.length > USER_ID.MAX_LENGTH || uID.length < USER_ID.MIN_LENGTH) {
          this.socket.write(this.encryptionManager.encryptToRemote('-4'));
          this.socket.end();
          return;
        }

        for (var i = 0; i < uID.length; i++) {
          if (!USER_ID.DICT.includes(uID.charAt(i))) {
            this.socket.write(this.encryptionManager.encryptToRemote('-4'));
            this.socket.end();
            return;
          }
        }

        // check if userID is already taken
        if (this.server.users[uID] != undefined) {
          this.socket.write(this.encryptionManager.encryptToRemote('-4'));
          this.socket.end();
          return;
        }
        
        this.userID = uID;

        // userID is good, allow connection
        this.socket.removeAllListeners();

        this.server.setupNewUser(new User(
          this.socket,
          this.userID,
          this.encryptionManager
        ));

        this.socket.write(this.encryptionManager.encryptToRemote(JSON.stringify({
          'type': 'ready',
          'userID': this.userID
        })));
        break;
    }  
  }
}

module.exports = SocketInitializer;