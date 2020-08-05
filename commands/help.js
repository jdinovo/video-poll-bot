const { prefix } = require('../config.json');
const Discord = require("discord.js");

module.exports = {
        name: 'help',
        description: 'List all commands.',
        aliases: ['commands'],
        usage: '[command name]',
        cooldown: 5,
        execute(message, args) {
                const data = [];
                const { commands } = message.client;

                if (!args.length) {

                    data.push('Commands:');
                    data.push(commands.map(command => command.name).join(', '));

                    return message.author.send(data, { split: true }).then(() => {
                            if (message.channel.type === 'dm') return;
                                    message.reply('check your DMs');
                            })
                            .catch(error => {
                                    console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
                                    message.reply('i can\'t DM you');
                            });
                }

                const name = args[0].toLowerCase();
                const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

                if (!command) {
                    return message.reply('invalid command!');
                }

                const embed = new Discord.MessageEmbed()
                .setColor('#00ff00')
                .setTitle('Command Information')
                .addField('Name', `${command.name}`);

                if (command.aliases) embed.addField('Aliases', `${command.aliases.join(', ')}`);
                if (command.description) embed.addField('Description', `${command.description}`);
                if (command.usage) embed.addField('Usage', `${prefix}${command.name} ${command.usage}`);
                embed.addField('Cooldown', `${command.cooldown || 3} second(s)`);

                message.channel.send(embed);
        },
 };