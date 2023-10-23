class ColorCoder {
  static INTERRUPT_CHAR = '%';

  /**
   * @param {string} str 
   */
  static convert(str) {
    var ret = '';
    
    for (var i = 0; i < str.length; i++) {
      // detect color interrupt character
      if (str.charAt(i) === this.INTERRUPT_CHAR && i - 1 >= 0 && str.charAt(i - 1) !== '\\') {
        // builds color code
        var code = '';
        for (i++; i < str.length && str.charAt(i) !== this.INTERRUPT_CHAR; i++) {
          code += str.charAt(i);
        }
        
        // adds color code if valid
        if (ColorCodes[code] != null) {
          ret += ColorCodes[code];
        } else {
          ret += `%${code}${i === str.length ? '' : '%'}`;
        }
      } else {
        ret += str.charAt(i);
      }
    }

    return ret;
  }
}

/** @type {Object.<string, string>} */
const ColorCodes = {
  FG_BLACK: '\x1b[30m',
  FG_RED: '\x1b[31m',
  FG_GREEN: '\x1b[32m',
  FG_YELLOW: '\x1b[33m',
  FG_BLUE: '\x1b[34m',
  FG_MAGENTA: '\x1b[35m',
  FG_CYAN: '\x1b[36m',
  FG_WHITE: '\x1b[37m',
  FG_GRAY: '\x1b[90m',

  BG_BLACK: '\x1b[40m',
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
  BG_MAGENTA: '\x1b[45m',
  BG_CYAN: '\x1b[46m',
  BG_WHITE: '\x1b[47m',
  BG_GRAY: '\x1b[100m',

  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  UNDERSCORE: '\x1b[4m',
  BLINK: '\x1b[5m',
  REVERSE: '\x1b[7m',
  HIDDEN: '\x1b[8m',
  CLEAR: '\x1Bc'
};

//console.log(ColorCoder.convert('[%FG_GREEN%Matt%RESET%] %FG_WHITE%testing text%RESET%'));

module.exports = { ColorCoder, ColorCodes };