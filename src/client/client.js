const { connect, Socket } = require('net');
const { EventEmitter } = require('events');
const EncryptionManager = require('../encryption-manager');
const { ColorCoder } = require('../color');

class Client extends EventEmitter {
  /** @type {ClientOptions} */
  options;
  /** @type {Socket} */
  socket;

  /** @type {EncryptionManager} */
  enc;

  /** @type {number[]} */
  reqIdsInUse = [];

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
          console.log(ColorCoder.convert('[%FG_RED%FAULT%RESET%] Failed to parse JSON'));
          return;
        }

        this.emit('data', json);

        if (json['type'] == null) {
          console.log(ColorCoder.convert(
            '[%FG_RED%FAULT%RESET%] Server provided no type with packet.'
          ));
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

  /**
   * Sends a packet with a unique ID and gets the response
   * @param {any} jsonData
   */
  async getResponseByID(jsonData) {
    return new Promise((res, rej) => {
      if (jsonData?.type == null) {
        rej('No type or data provided.');
      }

      // generate unique ID
      var id;
      do {
        id = Math.floor(Math.random() * 1000000);
      } while (this.reqIdsInUse.includes(id));

      // tag ID on to message
      jsonData['SENDER_ID'] = id;
      this.reqIdsInUse.push(id);

      // setup res handler
      const handler = (json) => {
        if (json?.recv?.SENDER_ID != null && json.recv.SENDER_ID == id) {
          this.removeListener('data', handler);
          
          // remove req from array
          for (var i = 0; i < this.reqIdsInUse.length; i++) {
            if (this.reqIdsInUse[i] === id) {
              this.reqIdsInUse.splice(i);
              break;
            }
          }

          res(json);
        }
      };
      this.on('data', handler);

      // send request
      this.sendData(jsonData).catch((err) => {
        rej(err);
      });
    });
  }

  async getUsers() {
    return new Promise((res, rej) => {
      this.getResponseByID({
        type: 'getUsers'
      }).then((data) => {
        res(data.users);
      }).catch((err) => {
        rej(err);
      });
    });
  }

  async whisper(userID, content) {
    return new Promise((res, rej) => {
      this.getResponseByID({
        type: 'whisper',
        user: userID,
        message: content
      })
        .then((response) => {
          if (response['type'] !== 'whisper.ok') {
            rej(response['type']);
          } else {
            res();
          }
        })
        .catch((err) => rej(err));
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
        .catch((err) => rej(err));
    });
  }
}

module.exports = { Client };