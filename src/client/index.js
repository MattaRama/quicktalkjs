const { argv, exit, stdout } = require('process');
const EncryptionManager = require('../encryption-manager');
const { PASSPHRASE } = require('./constants.json');
const rl = require('serverline');
const { Client } = require('./client');
const { ColorCoder, ColorCodes } = require('../color');
const fs = require('fs');
const path = require('path');

// argument parsing
var host = '67.240.214.172',
  port = 6978,
  uID = 'user-' + Math.floor(Math.random() * 1000),
  doNotClear = false;

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

      case '--do-not-clear':
      case '-dc':
        doNotClear = true;
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

function initEventHandlers() {
  /**
   * CLIENT EVENT HANDLERS
   */
  // On message broadcast
  client.on('broadcastMessage', (json) => {
    if (json['author'] === uID) {
      return;
    }
    
    console.log(ColorCoder.convert(
      `[%FG_GREEN%${json['author']}%RESET%] ${json['message']}`
    ));
  });

  // On user connect
  client.on('user.connect', (json) => {
    console.log(ColorCoder.convert(
      `[%FG_CYAN%SERVER%RESET%] User %FG_GREEN%${json.user}%RESET% connected.`
    ));
  });

  // On user disconnect
  client.on('user.disconnect', (json) => {
    console.log(ColorCoder.convert(
      `[%FG_CYAN%SERVER%RESET%] User %FG_GREEN%${json.user}%RESET% disconnected.`
    ));
  });

  /**
   * SOCKET EVENT HANDLERS
   */
  // On socket close
  client.socket.on('close', (hadError) => {
    console.log(ColorCoder.convert(
      `[%FG_RED%FAULT%RESET%] Socket closed (was ${hadError ? '' : 'not'} a client error)`
    ));
  });
}

/**
 * @typedef CommandHandler
 * @prop {string} type
 * @prop {boolean} disabled
 * @prop {(client: Client, input: string[]) => {}} execute 
 */
/**
 * @type {Object.<string, CommandHandler>}
 */
var commandHandlers;
function initCommandHandlers() {
  commandHandlers = [];

  // TODO: there should be a better solution to pathing
  var commandHandlerPath = path.join(require.main.path, 'command-handlers');

  var commandHandlerNames = fs.readdirSync(commandHandlerPath);
  commandHandlerNames.forEach((val) => {
    /**
     * @type {CommandHandler}
     */
    const handler = require(path.join(commandHandlerPath, val));
    if (handler.type == null || handler.execute == null) {
      console.log(`[CommandHandler] Did not initialize "${val}"; missing fields.`);
      return;
    }
    if (handler.disabled) {
      console.log(`[CommandHandler] Did not initialize "${val}; disabled."`);
      return;
    }

    commandHandlers[handler.type] = handler;
  });
}

/**
 * @param {string} input 
 */
function splitCommand(input) {
  var split = [];
  var buff = '';
  var inQuote = false;
  for (var i = 1; i < input.length; i++) {
    if (input[i] === '"') {
      inQuote = !inQuote;
      if (!inQuote) {
        split.push(buff);
        buff = '';
      }
      continue;
    } else if (input[i] === ' ') {
      if (!inQuote) {
        if (buff !== '') {
          split.push(buff);
          buff = '';
        }
        continue;
      }
    }

    buff += input[i];
  }

  if (buff != '') {
    split.push(buff);
  }

  return split;
}

/**
 * @param {string} input 
 */
function onUserInput(input) {
  if (input.startsWith('/')) {
    var split = splitCommand(input);
    if (commandHandlers[split[0]] == null) {
      console.log(ColorCoder.convert(
        `[%FG_CYAN%CLIENT%RESET%] Invalid command.`
      ));
      return;
    }

    commandHandlers[split[0]].execute(client, split)
  } else {
    client.broadcastMessage(input);
  }
}

client.start().then(() => {
  console.log('Done.');

  // start serverline and user input mode
  if (!doNotClear) {
    console.log(ColorCodes.CLEAR);
  }

  rl.init();
  rl.setPrompt(ColorCoder.convert(
    `[%FG_GREEN%${uID} (you)%RESET%] `
  ));

  rl.on('line', (data) => {
    onUserInput(data.toString().trim());
  });

  // event handler initialization
  initEventHandlers(client);

  // command handler initialization
  initCommandHandlers();
})