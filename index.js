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

async function displayBets(textChannel, mentions) {
    const betsEmbed = {
        title: `__Bets__`,
        url: `https://google.com`,
        color: 10181046, //this is purple in their weird color system thing https://leovoel.github.io/embed-visualizer/
        footer: {
            icon_url: client.user.displayAvatarURL(),
            text: `Bets listed.`
        },
        author: {
            name: "Bets",
            url: "",
            icon_url: client.user.displayAvatarURL()
        },
        fields: []
    }

    if (mentions.users.size > 0) {
        let targetUser = mentions.users.first().id;
        let ufcUser = await ufc.findUser(targetUser);
        let outstandingBets = ufcUser.currentBets;

        let i = 0;
        for (let outstandingBet of outstandingBets) {
            betsEmbed.fields.push(prettyOutstandingBet(outstandingBet))
            i++;
            if (i > 24) break;
        }
    } else {//No user mentioned. Just display all bets.
        let i = 0;
        for (let outstandingBet of ufc.outstandingBets) {
            betsEmbed.fields.push(prettyOutstandingBet(outstandingBet))
            i++;
            if (i > 24) break;
        }
    }
    textChannel.send({
        embed: betsEmbed
    });

}

async function displayUser(textChannel, mentions, author) {
    let ufcUser;
    if (mentions.users.size > 0) {
        let targetUser = mentions.users.first().id;
        ufcUser = await ufc.findUser(targetUser);
    } else {//No user mentioned. Just display the authors.
        ufcUser = await ufc.findUser(author.id);
    }
    if (ufcUser) {
        textChannel.send("`" + `Balance: ${ufcUser.balance}, # of Current Bets: ${ufcUser.currentBets.length}` + "`")
    } else {
        textChannel.send("`User doesn't have an account.`");
    }
}

async function registerUser(textChannel, mentions, author, cash) {
    let targetUser;
    if (mentions.users.size > 0) {
        targetUser = mentions.users.first().id;
    } else {//No user mentioned. Just display the authors.
        targetUser = author.id;
    }
    let ufcUser = await ufc.findUser(targetUser);
    if (ufcUser) {
        return false;
    } else {
        await ufc.addUser(targetUser, "defaultName");
        await ufc.addMoney(targetUser, cash);
        return true;
    }
}

function prettyOutstandingBet(outstandingBet) {
    if (outstandingBet.type === "classic") {
        return ({
            name: `${outstandingBet.betType} bet, Match: ${outstandingBet.fightEventID}, Amount: ${outstandingBet.betAmount}`,
            value: `For winner: ${outstandingBet.user1.fighterName}`,
            url: "",
        });
    } else if (outstandingBet.type === "1v1") {
        return ({
            name: `${outstandingBet.betType} bet, Match: ${outstandingBet.fightEventID}, Amount: ${outstandingBet.betAmount}`,
            value: `${outstandingBet.user1.uuid}-${outstandingBet.user1.fighterName}-${outstandingBet.odds} vs. ${outstandingBet.user2.uuid}-${outstandingBet.user2.fighterName}`,
            url: "",
        });
    }
}
async function getUserBets() {

}



client.on('message', async (msg) => {
    if (msg.content.charAt(0) === config.commandPrefix) {
        textChannel = msg.channel;
        let rawString = msg.content.slice(1);
        let cmd = rawString.split(' ')[0].toLowerCase();

        let tmp = rawString.split(" ");
        tmp.shift();
        let contents = tmp.join(" ");
        //TODO adding more commands. Start with matches (copied from bets), create checkAdmin, then give, take, bet, 1v1, then lastly refresh. 
        switch (cmd) {
            //Display all valid bets. If @ member then display only that members valid bets.
            case 'bets':
                displayBets(textChannel, msg.mentions);
                break;
            //Display all matches and their betting odds.
            case 'matches':
            case 'match':
                break;
            //Display user details
            case 'user':
                displayUser(textChannel, msg.mentions, msg.author);
                break;

            //Action Commands:
            //Registers a user account for the person @ mentioned.
            case 'register':
                if (await registerUser(textChannel, msg.mentions, msg.author, config.defaultCash)) {
                    textChannel.send("`Created user account.`");
                    displayUser(textChannel, msg.mentions, msg.author);
                } else {
                    textChannel.send("`Couldn't create user account.`");

                }

                break;
            //Creates a normal bet for the user using oddshark odds.
            case 'bet':
                break;
            //Creates a 1v1 bet between the user and the person @ mentioned. Also need a $ amount. Winner takes all.
            case '1v1':
                break;

            //Admin Commands:
            //Gives money to user @ mentioned.
            case 'give':
                break;
            // Takes money from user @ mentioned.
            case 'take':
                break;
            //Refreshes match data retrieved from oddsharks.
            case 'refresh':
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
    await ufc.refreshUpComingMatches();
    return true;
}

bootSequence().catch(err => console.error(err))