const vote = require('../utils/vote.js');
const ownerID = require('../config.json');

module.exports = {
        name: 'scan',
        description: 'Scan for un-polled webms. (Owner only)',
        aliases: ['scan', 's'],
        cooldown: 10,
        execute(message, args) {
                if(message.author.id !== ownerID) return;
                vote.addPollsToWebms(message.channel);
        },
 };