const Discord = require("discord.js");
const db = require('./db.js');
const { wotdChannelID, wotwChannelID, upVoteID, dailyBestPostRoleID, weeklyBestPostRoleID } = require('../config.json');
const { Op } = require('sequelize');
const CronJob = require('cron').CronJob;
const fileType = require('../utils/fileType');

// sync DBs
db.WebmVotes.sync();
db.UserVotes.sync();

let wotdChannel;
let wotwChannel;

module.exports = {
    async setWinnerChannels() {
        try {
            wotdChannel = await bot.channels.fetch(wotdChannelID);
            wotwChannel = await bot.channels.fetch(wotwChannelID);
        } catch(e) {
            console.error(e);
        }
    },
    async new(message, attachement) {

        try {
            // get url 
            const url = attachement ? attachement.url : message.content.match(/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/gm);

            // create record
            const webm = await db.WebmVotes.create({
                message_id: message.id,
                message_channel_id: message.channel.id,
                user_id: message.author.id,
                // `` to convert to string
                file: `${url}`

            });
            // add react 
            return message.react(upVoteID);
        }
        catch (e) {
            if (e.name === 'SequelizeUniqueConstraintError') {
                console.log(`Message ${message.id} already exists`);
            }
            console.log(`Vote storage failed ${e}`);
        }
        
    },
    async updateVotes(reaction) {

        try {
            if (reaction.emoji.id != upVoteID) throw Error('Not Vote Emoji');

            console.log('Vote Recieved');

            const voteCount = reaction.count - 1;
            // attempt to update webm votes (if fails then reaction was not on a votable webm)
            const affectedRows = await db.WebmVotes.update({ vote_count: voteCount }, { where: { message_id: reaction.message.id } });
            if (affectedRows > 0) {
                console.log(`Message ${reaction.message.id} had its votes updated to ${voteCount}.`);
            }
        } catch(e) {
            console.log(`Reaction not counted as vote\n ${e}`);
        }
    },
    async deleteWebmVotes(messageId) {
        await db.WebmVotes.destroy({
            where: {
            message_id: messageId
            }
        });

        console.log(`records of message ${messageId} deleted from DB`)
    },
    async determineWinner(weekly) {
        try {

            const winningChannel = weekly ? wotwChannel : wotdChannel;

            // create dates
            const currentDate = new Date();
            const pastDate = new Date();

            // set past date based on whether or not it is weekly check
            pastDate.setDate(weekly ? pastDate.getDate() - 7 : pastDate.getDate() - 1);
            
            // DB query to retrieve winner
            const winner = await db.WebmVotes.findOne({
                attributes: [
                    'id',
                    'message_id',
                    'message_channel_id',
                    'user_id',
                    'file',
                    'createdAt',
                    [db.sequelize.fn('MAX', db.sequelize.col('vote_count')), 'vote_count']
                ], where: {
                    createdAt: {
                        [Op.between]: [pastDate, currentDate]
                    }
                }
            });

            if(!winner) {
                return;
            }

            // get channel it was sent it
            const ch = await bot.channels.fetch(winner.message_channel_id);

            try {
                // get message
                await ch.messages.fetch(winner.message_id);
            } catch(e) {
                // if the message no longer exists remove it from DB and fetch again
                this.deleteWebmVotes(winner.message_id);
                console.log('Winner Invalid\n' + e);
                // determine winner again
                this.determineWinner();
            }


            // attempt to update webm votes (if fails then reaction was not on a votable webm)
            const affectedRows = await db.WebmVotes.update({ winner: true }, { where: { id: winner.id } });
            if (affectedRows > 0) {
                console.log(`Message ${winner.message_id} has been set as a winning webm.`);

                // get date
                const posted = Date.parse(`${winner.createdAt}`);

                // create winner message
                const embed = new Discord.MessageEmbed()
                .setColor(weekly?'#F2B41E':'#B8860B')
                .setTitle(`Best Content of the ${weekly?'Week':'Day'}`)
                .setDescription('')
                .addField('Submitted by', `<@${winner.user_id}>`)
                .addField('In Channel', `<#${winner.message_channel_id}>`)
                .addField('Votes', `${winner.vote_count}`)
                .setTimestamp(posted);

                // get file
                const file = new Discord.MessageAttachment(winner.file);

                // send message and file to hall of fame channel
                winningChannel.send({embed: embed, files: [file]}).catch(e => {
                    console.log(`FILE FAILED TO SEND ${e}`);
                    
                    // resend with just link 
                    winningChannel.send(winner.file);
                    winningChannel.send({embed: embed});
                });

                // get winning user
                let winningUser = await wotdChannel.guild.members.fetch(winner.user_id);

                // get role
                let winningRole = await wotdChannel.guild.roles.fetch(weekly?weeklyBestPostRoleID:dailyBestPostRoleID);

                // get all members who currently have the role
                let roleMembers = await winningRole.members;

                // remove role from anyone who currently has it 
                roleMembers.each(member => {
                    member.roles.remove(winningRole);
                });

                // assign role to user
                winningUser.roles.add(winningRole);

                

            }
        } catch(e) {
            console.log(`Webm could not be set as winner\n ${e}`);
        }
    },
    startCrons() {
        // determine weekly winner cron job 
        let weeklyWinner = new CronJob(
            // every satuday at midnight
            '00 00 00 * * 6',
            () => {
                this.determineWinner(true);
            },
            null,
            true
        );

        let dailyWinner = new CronJob(
            // every day at midnight
            '00 00 00 * * *',
            () => {
                this.determineWinner(false);
            },
            null,
            true
        );
    },
    async addPollsToWebms(channel) {
        const msgs = await channel.messages.fetch();
        msgs.array().forEach(async message => {
            // add vote react to webms posted in server
            if(!message.author.bot && message.channel.type !== 'dm' && (message.attachments.size > 0 || message.content.match(/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/gm))) {
                const webm = await db.WebmVotes.findOne({ where: { message_id: message.id } });
                if (!webm) {
                    // get url
                    const url = message.attachments.size > 0 ? message.attachments.first().url : message.content.match(/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/gm);

                    console.log(url);

                    // check file type
                    fileType.getFileTypeFromUrl(url).then(type => {
                        if(type) {
                            // if its a video add it to DB
                            if(type.mime.includes('video')) {
                                this.new(message, message.attachments.first());
                            }
                        }
                    });
                }
            }
        })
    }
};