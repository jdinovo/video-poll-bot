# Video Poll Bot

A discord bot that allows users to vote on videos posted in a server.

## Installation

1. Assuming node.js or docker is already installed on the device, `cd` to the root of the project

2. Run `cp config.example.json config.json` to duplicate and rename the config example

3. Insert the required information into the `config.json` 

4. 
    1. Run `npm install` to install dependencies

    2. Run `docker build video-bot .` to build the docker container

5. 
    1. Run `node .` to run the bot

    2. Run `docker start -d video-bot` to run the docker container
