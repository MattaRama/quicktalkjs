const EncryptionManager = require("../encryption-manager");
const { createServer } = require('net');
const SocketInitializer = require("./socket-initializer");
const User = require("./user");
const fs = require('fs');
const { PATHS } = require('./constants.json')

/** 
 * @typedef {Object} RequestHandler
 * @prop {string} type
 * @prop {boolean?} disabled
 * @prop {(json: any, user: User, server: Server) => {}} handleRequest
 */

class Server {
  /** @type {ServerOptions} */
  options;
  encryptionManager;

  /** @type {Object.<string, User>} */
  users;

  /**
   * @type {Object.<string, RequestHandler>}
   */
  requestHandlers;

  /**
   * @typedef {Object} ServerOptions
   * @property {number} port
   * @property {string} ip
   * @property {EncryptionManager} encryptionManager
   * 
   * @param {ServerOptions} options
   */
  constructor(options) {
    this.options = options;

    this.encryptionManager = options.encryptionManager;

    this.users = {};

    this._initRequestHandlers();
  }

  _initRequestHandlers() {
    this.requestHandlers = {};
    
    var handlerFileNames = fs.readdirSync(PATHS.REQUEST_HANDLERS);
    for (var i = 0; i < handlerFileNames.length; i++) {
      const handler = require(`${PATHS.REQUEST_HANDLERS}${handlerFileNames[i]}`);
      
      // check for required properties
      if (typeof handler['type'] !== 'string' ||
          typeof handler['handleRequest'] !== 'function'
      ) {
        console.log(`"[Handlers] ${handlerFileNames[i]}" was not started: missing parameters`);
        continue;
      }

      if (handler['disabled'] === true) {
        console.log(`[Handlers] "${handlerFileNames[i]}" was not started: disabled.`);
        continue;
      }

      this.requestHandlers[handler.type] = handler;
      console.log(`[Handlers] "${handlerFileNames[i]} was started."`);
    }
  }

  start() {
    var srv = createServer((socket) => {
      this.onConnection(socket);
    });

    srv.listen(this.options.port);
  }

  onConnection(socket) {
    new SocketInitializer(socket, this);
  }

  /** @param {User} user */
  setupNewUser(user) {
    this.users[user.userID] = user;

    // setup listeners
    user.socket.on('error', () => {
      if (!user.socket.closed) {
        user.socket.end();
      }
      if (this.users[user.userID] != null) {
        this.killUser(user)
      }
    });
    user.socket.on('data', async (buffer) => this.packetHandler(buffer, user));
    user.socket.on('end', () => this.killUser(user));

    console.log(`JOINED ${user.userID}; len: ${Object.keys(this.users).length}`);
    this.broadcast(JSON.stringify({
      type: 'user.connect',
      user: user.userID
    }));
  }

  /**
   * @param {User} user
   */
  killUser(user) {
    delete this.users[user.userID];
    console.log(`KILLED ${user.userID}; len: ${Object.keys(this.users).length}`);
    this.broadcast(JSON.stringify({
      type: 'user.disconnect',
      user: user.userID
    }));
  }

  /**
   * @param {Buffer} buffer
   * @param {User} user 
   */
  async packetHandler(buffer, user) {
    var decrypt = user.encryptionManager.decryptFromRemote(buffer).toString();
    console.log(`${user.userID}: ${decrypt}`);

    // parse json
    var json;
    try {
      json = JSON.parse(decrypt);
    } catch {
      user.encryptedWrite(JSON.stringify({
        type: 'error.invalidJSON',
        recv: decrypt
      }));
      return;
    }

    // check for valid type
    if (typeof json['type'] !== 'string' || this.requestHandlers[json['type']] == null) {
      user.encryptedWrite(JSON.stringify({
        type: 'error.invalidPacketType',
        recv: json
      }));
      return;
    }

    // handle packet
    this.requestHandlers[json['type']].handleRequest(json, user, this);
  }

  /**
   * Sends data to all connected clients
   * @param {string} str
   */
  broadcast(str) {
    var userIDs = Object.keys(this.users);
    for (var i = 0; i < userIDs.length; i++) {
      this.users[userIDs[i]].encryptedWrite(str);
    }
  }
}

module.exports = Server;