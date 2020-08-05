const fs = require('fs');
const Discord = require("discord.js");
global.bot = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
const { prefix, token } = require('./config.json');
bot.commands = new Discord.Collection();
const vote = require('./utils/vote.js');
const fileType = require('./utils/fileType');
const { startCrons } = require('./utils/vote.js');
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

// get commands
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	bot.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

console.log('~~~~~~~~Running Vote Poll Bot~~~~~~~~');
let botID;

bot.on("ready", () => {
    botID = bot.user.id;
    console.log('botID: ' + botID);
	bot.user.setStatus("online");
	vote.setWinnerChannels();
	vote.startCrons();
});

bot.on('message', message => {

	// prevent responding to self
	if (message.author.bot) return;

	// add vote react to webms posted in server
	if(message.channel.type !== 'dm' && (message.attachments.size > 0 || message.content.match(/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/gm))) {
		// get url
		const url = message.attachments.size > 0 ? message.attachments.first().url : message.content.match(/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/gm);

		console.log(url);

		// check file type
		fileType.getFileTypeFromUrl(url).then(type => {
			if(type) {
				// if its a video add it to DB
				if(type.mime.includes('video')) {
					vote.new(message, message.attachments.first());
				}
			}
		});
		return;
	}

	// ignore anything that does not start with prefix
	if (!message.content.startsWith(prefix)) return;

	// get arguements
	const args = message.content.slice(prefix.length).split(/ +/);
	const commandName = args.shift().toLowerCase();

	// find command 
	const command = bot.commands.get(commandName) || bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	// if the command requires arguements and none are provided display message
	if (command.args && !args.length) {
		let reply = `you didn't provide any arguments, ${message.author}!`;

		if (command.usage) {
			reply += `\nthe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
		}

		return message.channel.send(reply);
	}

	// ---- set up for cooldowns below ----
	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 3) * 1000;

	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(`you cannot use \`${command.name}\` for ${timeLeft.toFixed(1)} more second(s).`);
		}
	}

	timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

	// execute commands
	try {
		command.execute(message, args);
	} catch (error) {
		console.error(error);
		message.reply('there was an error trying to execute that command!');
	}
});

bot.on('messageReactionAdd', async (reaction, user) => {
	// prevent responding to self
	if (user.bot) return;

	// when we receive a reaction we check if the reaction is partial or not
	if (reaction.partial) {
		// if the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
		try {
			await reaction.fetch();
		} catch (error) {
			console.log('Something went wrong when fetching the message: ', error);
			return;
		}
	}

	vote.updateVotes(reaction);
});

bot.on('messageReactionRemove', async (reaction, user) => {
	// prevent responding to self
	if (user.bot) return;

	// when we receive a reaction we check if the reaction is partial or not
	if (reaction.partial) {
		// if the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
		try {
			await reaction.fetch();
		} catch (error) {
			console.log('Something went wrong when fetching the message: ', error);
			return;
		}
	}

	vote.updateVotes(reaction);
});

bot.on('messageDelete', async (message) => {

	// if message exists in db delete it
	vote.deleteWebmVotes(message.id);

});

bot.login(token);