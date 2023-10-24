const { ColorCoder } = require("../../color");
const { Client } = require("../client");

module.exports = {
  type: 'whisper',
  disabled: false,

  /**
   * 
   * @param {Client} client 
   * @param {string[]} input 
   */
  async execute(client, input) {
    if (input.length !== 2) {
        console.log(ColorCoder.convert(
            `[%FG_CYAN%CLIENT%RESET%] Failed to send whisper: invalid argument length`
        ));
    }
    client.whisper(input[1], input[2])
        .then(() => {
            console.log(ColorCoder.convert(
                `[%FG_CYAN%CLIENT%RESET%] Sent whisper.`
            ));
        })
        .catch((err) => {
            console.log(ColorCoder.convert(
                `[%FG_CYAN%CLIENT%RESET%] Failed to send whisper: ${err}`
            ));
        });
  }
};