const { Client } = require("../client");

module.exports = {
  type: 'exit',
  disabled: false,

  /**
   * 
   * @param {Client} client 
   * @param {string[]} input 
   */
  async execute(client, input) {
    process.exit(0);
  }
};