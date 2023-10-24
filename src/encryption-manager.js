const crypto = require('crypto');

/**
 * Provides a manager for AES256 data
 */
class EncryptionManager {
  _public;
  _private;
  _passphrase;

  /** @type {crypto.KeyObject} */
  _remotePublic;
  
  /**
   * @param {string} key 
   * @returns {boolean}
   */
  static isValidPublicKey(key) {
    try {
      crypto.createPublicKey(key);
    } catch {
      return false;
    }

    return true;
  }

  /**
   * @param {crypto.KeyObject} remotePublic 
   */
  setRemotePublic(remotePublic) {
    if (!(remotePublic instanceof crypto.KeyObject)) {
      throw new Error('Invalid remote public type');
    }

    this._remotePublic = remotePublic;
  }

  setRemotePublicFromRaw(remotePublicRaw) {
    if (typeof remotePublicRaw !== 'string') {
      throw new Error('Invalid remote public raw type');
    }

    this._remotePublic = crypto.createPublicKey(remotePublicRaw);
  }

  /**
   * @param {string} data
   */
  encryptToRemote(data) {
    const buff = Buffer.from(data);
    return crypto.publicEncrypt({
      key: this._remotePublic,
      padding: 0
    }, buff);
    //return crypto.publicEncrypt(this._remotePublic, buff);
  }

  /**
   * @param {Buffer} data
   */
  decryptFromRemote(data) {
    if (this._private == null) {
      throw new Error('No remote public declared.');
    }
    return crypto.privateDecrypt({
      key: this._private,
      padding: 0
    }, data);
    //return crypto.privateDecrypt(this._private, data);
  }

  getLocalPublic() {
    return this._public;
  }

  getLocalPublicRaw() {
    return this._public.export({
      type: 'spki',
      format: 'pem'
    });
  }

  getLocalPrivate() {
    return this._private;
  }
  
  getLocalPrivateRaw() {
    return this._private.export({
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: this._passphrase
    });
  }

  /**
   * @param {crypto.KeyObject} publicKeyObject 
   * @param {crypto.KeyObject} privateKeyObject 
   * @param {string} passphrase
   */
  constructor(publicKeyObject, privateKeyObject, passphrase) {
    this._public = publicKeyObject;
    this._private = privateKeyObject;
    this._passphrase = passphrase;
  }

  /**
   * Generates a local pair of keys
   * @param {string} passphrase 
   * @returns { EncryptionManager }
   */
  static generateLocalSync(passphrase) {
    if (passphrase == null || typeof passphrase !== 'string' || passphrase === '') {
      throw new Error('Invalid passphrase provided');
    }

    // generate raw keys
    var { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase
      }
    });
  
    // generate key objects
    var priv = crypto.createPrivateKey({
      key: privateKey,
      format: 'pem',
      type: 'pkcs8',
      cipher: 'aes-256-cbc',
      passphrase
    });
  
    let pub = crypto.createPublicKey(publicKey);

    // return keys
    return new EncryptionManager(pub, priv, passphrase);
  }

  /**
   * @returns {EncryptionManager}
   */
  clone() {
    var ret = new EncryptionManager(this._public, this._private, this._passphrase);
    ret._remotePublic = this._remotePublic;
    return ret;
  }
}

module.exports = EncryptionManager;