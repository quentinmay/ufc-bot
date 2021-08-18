const fs = require('fs');
const { Client, Intents } = require('discord.js');
let client = new Client();

const config = require("./config.json")
const path = require('path');
const UFCgame = require('ufc-betting-game');

let ufc = new UFCgame();


let textChannel;



client.on('ready', () => {
    setStatus();
    console.log("Started!");
});





/*
Sets discord bot user activity. (My sample uses STREAMING so his icon is purple.)
*/
function setStatus() {
    client.user.setActivity(config.statusActivity, {
        type: config.statusType,
        url: config.statusURL
    }).catch(console.error);
}




/*
Searches guild for member the member with this ID. Useful if you only have userID or user object and need guildMember
*/
async function getGuildMemberFromServerIDAndUserID(serverID, id) {
    for (const guild of client.guilds.cache) {
        if (guild[1].id == serverID) {
            for (const member of guild[1].members.cache) {
                if (member[1].id == id) {
                    return member[1];

                }
            }
        }
    }
    return;

}




client.on('message', (msg) => {
    if (msg.content.charAt(0) === config.commandPrefix) {
        textChannel = msg.channel;
        var rawString = msg.content.slice(1);
        var cmd = rawString.split(' ')[0].toLowerCase();

        var tmp = rawString.split(" ");
        tmp.shift();
        var contents = tmp.join(" ");

        switch (cmd) {
            //Display all valid bets. If @ member then display only that members valid bets.
            case 'bets':
                break;
            //
            case 'test':
                break;
            case 'off':
            case 'stop':
            case 'disconnect':
            case 'reset':
            case 'restart':
                stop(msg.member);
                break;
            case 'crash':
                if (msg.author.id == config.discordDevID) {
                    msg.member.send("Crash command sent.");
                    process.exit(0);
                }
            default:
                break;
        }
    }
});



function stop(member) {

    if (!member || !member.voice.channel) {
        return;
    }

    console.log("Stopping...");
    queue = [];
    if (dispatcher) {
        dispatcher.end();
    }
    if (musicStream) {
        musicStream.end();
    }
    client.voice.connections.forEach(connection => {
        connection.disconnect();
    });
    if (voiceReceivers.get(member.voice.channelID)) {
        voiceReceivers.get(member.voice.channelID).destroy();
        voiceReceivers.delete(member.voice.channelID);
        voiceConnections.get(member.voice.channelID).disconnect();
        voiceConnections.delete(member.voice.channelID);
    }

}

/*
Initial boot sequence to make sure that we properly load our config file first and boot in order to avoid crashes.
Sets up our config global and other necessary stuffs.
*/
async function bootSequence() {
    await client.login(config.discordToken);
    return true;
}

bootSequence().catch(err => console.error(err))