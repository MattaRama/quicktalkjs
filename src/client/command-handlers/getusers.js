const { ColorCoder } = require("../../color");
const { Client } = require("../client");

module.exports = {
  type: 'getusers',
  disabled: false,

  /**
   * 
   * @param {Client} client 
   * @param {string[]} input 
   */
  async execute(client, input) {
    client.getUsers()
      .then((val) => {
        console.log(ColorCoder.convert(
            `[%FG_CYAN%SERVER%RESET%] USERS: %BRIGHT%${val.join(', ')}%RESET%`
        ))
      })
      .catch((err) => {
        console.log(ColorCoder.convert(
          `[%FG_RED%FAULT%RESET%] Failed to fetch users: ${err}`
        ));
      });
  }
};