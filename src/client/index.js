const { argv, exit, stdout } = require('process');
const EncryptionManager = require('../encryption-manager');
const { PASSPHRASE } = require('./constants.json');
const rl = require('serverline');
const { Client } = require('./client');
const { ColorCoder } = require('../color');

// argument parsing
var host = '67.240.214.172',
  port = 6978,
  uID = 'user-' + Math.floor(Math.random() * 1000);

for (var i = 2; i < argv.length; i++) {
  switch (argv[i]) {
    case '-i':
    case '--ip':
    case '--host':
      host = argv[++i];
      break;
    
      case '-p':
      case '--port':
        if (isNaN(parseInt(argv[++i]))) {
          console.log(`Failed to start client: Could not parse argument "--port": "${argv[i]}"`);
          exit(-1);
        }

        port = parseInt(argv[i]);
        break;

      case '-u':
      case '--uid':
      case '--userid':
        uID = argv[++i];
        break;
  }
}


// generate local keys
stdout.write('Starting Client\nGenerating Encryption Keys... ');
var encryptionMan = EncryptionManager.generateLocalSync(PASSPHRASE);
console.log('Done.');

stdout.write('Initializing client... ');
var client = new Client({
  port,
  host,
  userID: uID,
  encryptionManager: encryptionMan
});

client.start().then(() => {
  console.log('Done.');

  // start serverline and input mode
  //stdout.write('\x1Bc');
  rl.init();
  rl.setPrompt('> ');

  rl.on('line', (data) => {
    // TODO: broadcast message here
    client.broadcastMessage(data.toString());
  });

  client.socket.on('data', (buf) => {
    var json;
    try {
      json = JSON.parse(encryptionMan.decryptFromRemote(buf).toString());
    } catch {
      console.log('[FAULT] Failed to parse JSON');
    }

    switch (json['type']) {
      case 'broadcastMessage':
        if (json['author'] === uID) {
          return;
        }
        
        console.log(ColorCoder.convert(
          `[%FG_GREEN%${json['author']}%RESET%] %FG_WHITE%${json['message']}%RESET%`
        ));
        break;
    }
  });
});