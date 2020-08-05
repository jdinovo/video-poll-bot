const Sequelize = require('sequelize');
exports.sequelize = new Sequelize('db', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'db.sqlite',
});
/*
MIGRATION

ALTER TABLE `WebmVotes` RENAME TO `TempWebmVotes`;
INSERT INTO `WebmVotes` (message_id, message_channel_id, user_id, file, vote_count, createdAt, updatedAt) SELECT message_id, '123', user_id, file, vote_count, createdAt, updatedAt FROM `TempWebmVotes`;
UPDATE WebmVotes SET message_channel_id=595714042086031406;
DROP TABLE `TempWebmVotes`;
*/
exports.WebmVotes = this.sequelize.define('WebmVotes', {
	message_id: {
		type: Sequelize.STRING,
        unique: true,
        allowNull: false,
    },
    message_channel_id: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    user_id: {
        type: Sequelize.STRING,
        allowNull: false,
    },
	file: {
        type: Sequelize.STRING,
        allowNull: false,
        isUrl: true,
    },
	vote_count: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
		allowNull: false,
    },
    winner: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    }
});
exports.UserVotes = this.sequelize.define('UserVotes', {
    user_id: {
        type: Sequelize.STRING,
        allowNull: false,
    },
	votes_received: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
		allowNull: false,
    },
});