const { argv, exit, stdout } = require('process');
const { createServer } = require('net');
const EncryptionManager = require('../encryption-manager');
const { PASSPHRASE } = require('./constants.json');
const Server = require('./server');

// argument parsing
var
  ip = '127.0.0.1',
  port = 6978;

for (var i = 2; i < argv.length; i++) {
  switch (argv[i]) {
    case '-i':
    case '--ip':
    case '--host':
      ip = argv[++i];
      break;

    case '-p':
    case '--port':
      port = parseInt(argv[++i]);
      if (isNaN(port)) {
        console.log(`Failed to start server: Could not parse argument for --port: "${argv[i]}"`);
        exit(-1);
      }
      break;

    default:
      console.log(`Failed to start server: Invalid Argument: ${argv[i]}`);
      exit(-1);
  }
}

// generate server keys
stdout.write('Starting Server\nGenerating Encryption Keys... ');
var keyBuilder = EncryptionManager.generateLocalSync(PASSPHRASE);
console.log('Done.');

stdout.write('Initializing server... ');
var server = new Server({
  ip,
  port,
  encryptionManager: keyBuilder
});
server.start();
console.log('Done.');