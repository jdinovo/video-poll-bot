const vote = require('../utils/vote.js');
const ownerID = require('../config.json');

module.exports = {
        name: 'winner',
        description: 'Force determine a winner for today. (Owner only)',
        aliases: ['winner', 'w'],
        cooldown: 10,
        execute(message, args) {
                if(message.author.id !== ownerID) return;
                if(args[0] && args[0].toLowerCase() === 'week') {
                        vote.determineWinner(true);
                } else {
                        vote.determineWinner(false);
                }
        },
 };