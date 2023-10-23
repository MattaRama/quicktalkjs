const { connect, Socket } = require('net');
const { EventEmitter } = require('events');
const EncryptionManager = require('../encryption-manager');

/**
 * @event Client#broadcastMessage
 * @fires Client#broadcastMessage
 */
class Client extends EventEmitter {
  /** @type {ClientOptions} */
  options;
  /** @type {Socket} */
  socket;

  /** @type {EncryptionManager} */
  enc;

  /**
   * @typedef {Object} ClientOptions
   * @property {number} port
   * @property {string} host
   * @property {string} userID
   * @property {EncryptionManager} encryptionManager
   * 
   * @param {ClientOptions} options 
   */
  constructor(options) {
    super();
    this.options = options;
    this.enc = options.encryptionManager;
  }

  async start() {
    return new Promise((res, rej) => {
      this.socket = connect(this.options.port, this.options.host, async () => {
        var ret = await this.initializeSocket();
        if (typeof ret === 'number') {
          rej(`Failed to start; error ${ret}`)
        } else {
          res(this);
        }
      });
    });
  }

  async initEvents() {
    return new Promise((res, rej) => {
      this.socket.on('data', (data) => {
        var json;
        try {
          json = JSON.parse(this.enc.decryptFromRemote(data).toString());
        } catch {
          console.log('[FAULT] Failed to parse JSON');
          return;
        }

        if (json['type'] == null) {
          console.log('[FAULT] Server provided no type with packet.');
          return;
        }

        this.emit(json['type'], json);
      });

      res();
    });
  }

  async initializeSocket() {
    return new Promise((res, rej) => {
      var state = 0;
      var hasRejected = false;

      this.socket.on('data', (buffer) => {
        if (!isNaN(parseInt(buffer))) {
          rej(parseInt(buffer));
          hasRejected = true;
          return;
        }

        state++;

        switch (state) {
          case 1:
            // get server public
            var serverPublic = buffer.toString().trim();
            if (!EncryptionManager.isValidPublicKey(serverPublic)) {
              this.socket.end();
              rej(-1);
              hasRejected = true;
            }

            this.enc.setRemotePublicFromRaw(serverPublic);

            // send client public
            this.socket.write(this.enc.getLocalPublicRaw());
            state++;
            break;
          case 3:
            // get verification phrase
            var phrase = this.enc.decryptFromRemote(buffer).toString();
            this.socket.write(this.enc.encryptToRemote(phrase));
            state++;
            break;
          case 5:
            var req = JSON.parse(this.enc.decryptFromRemote(buffer).toString());
            if (req['type'] === 'getUserID') {
              this.socket.write(this.enc.encryptToRemote(JSON.stringify({
                type: 'getUserID',
                userID: this.options.userID,
                recv: req
              })));
              state++;
            } else {
              this.socket.end();
              rej(-99);
              hasRejected = true;
              return;
            }
            break;
          case 7:
            var req = JSON.parse(this.enc.decryptFromRemote(buffer).toString());
            this.socket.removeAllListeners();
            if (req['type'] === 'ready') {
              this.initEvents().then(() => {
                res(this);
              });
            }
            break;
        }
      });

      this.socket.on('close', () => {
        if (!hasRejected) {
          rej(-98);
          hasRejected = true;
        }
      });
    });
  }

  async sendData(json) {
    return new Promise((res, rej) => {
      try {
        var encData = this.enc.encryptToRemote(JSON.stringify(json));
        this.socket.write(encData);
        res();
      } catch (e) {
        rej(e);
      }
    });
  }

  async broadcastMessage(rawText) {
    return new Promise((res, rej) => {
      this.sendData({
        type: 'broadcastMessage',
        userID: this.options.userID,
        message: rawText
      })
        .then(() => res())
        .catch(() => rej());
    });
  }
}

module.exports = { Client };