const fs = require('fs');
const { Client, Intents } = require('discord.js');
let client = new Client();

const config = require("./config.json")
const path = require('path');
const UFCgame = require('ufc-betting-game');
const Bet = require('../UFC-Web-Scraper/utils/Bet');

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
async function displayMatches(textChannel, contents) {
    if (contents) {
        let fightID = contents;
        let fight = await ufc.getFight(fightID);
        if (fight) {
            textChannel.send("`" + `${fight.event_id} - ${fight.away_name}(${fight.away_odds}) vs. ${fight.home_name}(${fight.home_odds})` + "`");
        } else {
            textChannel.send("`This fight doesn't exist.`");
        }
        return true;
    } else {//No user mentioned. Just display all matches.
        const matchesEmbed = {
            title: `__Matches__`,
            url: `https://www.oddsshark.com/ufc`,
            color: 10181046, //this is purple in their weird color system thing https://leovoel.github.io/embed-visualizer/
            footer: {
                icon_url: client.user.displayAvatarURL(),
                text: `Matches listed.`
            },
            author: {
                name: "Matches",
                url: "",
                icon_url: client.user.displayAvatarURL()
            },
            fields: []
        }
        let i = 0;

        for (let upcomingMatch of ufc.upComingMatches) {
            matchesEmbed.fields.push({
                name: `${upcomingMatch.event_id} - Fighters: ${upcomingMatch.away_name} vs. ${upcomingMatch.home_name}`,
                value: `Odds: ${upcomingMatch.away_odds} vs. ${upcomingMatch.home_odds}`,
                url: "",
            })
            i++;
            if (i > 24) break;
        }
        textChannel.send({
            embed: matchesEmbed
        });
        return true;
    }


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
            betsEmbed.fields.push(await prettyOutstandingBet(outstandingBet))
            i++;
            if (i > 24) break;
        }
    } else {//No user mentioned. Just display all bets.
        let i = 0;
        console.log(ufc.outstandingBets);
        for (let outstandingBet of ufc.outstandingBets) {
            betsEmbed.fields.push(await prettyOutstandingBet(outstandingBet))
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
        textChannel.send("`" + `Balance: $${ufcUser.balance}, Current Bets: ${ufcUser.currentBets.length}` + "`")
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

async function prettyOutstandingBet(outstandingBet) {
    if (outstandingBet.betType === "classic") {
        let guildmember1 = await getGuildMemberFromServerIDAndUserID(textChannel.guild.id, outstandingBet.user1.uuid)
        return ({
            name: `${outstandingBet.betType} bet, Match: ${outstandingBet.fightEventID}, Amount: ${outstandingBet.betAmount}`,
            value: `${guildmember1.displayName} voted for winner: ${outstandingBet.user1.fighterName}`,
            url: "",
        });
    } else if (outstandingBet.betType === "1v1") {
        let guildmember1 = await getGuildMemberFromServerIDAndUserID(textChannel.guild.id, outstandingBet.user1.uuid)
        let guildmember2 = await getGuildMemberFromServerIDAndUserID(textChannel.guild.id, outstandingBet.user2.uuid)
        return ({
            name: `${outstandingBet.betType} bet, Match: ${outstandingBet.fightEventID}, Amount: ${outstandingBet.betAmount}`,
            value: `${guildmember1.displayName}-${outstandingBet.user1.fighterName}-${outstandingBet.odds} vs. ${guildmember2.displayName}-${outstandingBet.user2.fighterName}`,
            url: "",
        });
    }
}
async function getUserBets() {

}

function isAdmin(userID) {
    return userID == config.discordDevID;

}

async function giveMoney(mentions, content) {
    let cash = content.split(" ")[1];
    if (!isNaN(cash)) {
        if (mentions.users.size == 1) {
            let targetUser = mentions.users.first().id;
            return (await ufc.addMoney(targetUser, cash));
        }
    }
    return false;
}
async function takeMoney(mentions, content) {
    let cash = content.split(" ")[1];
    if (!isNaN(cash)) {
        if (mentions.users.size == 1) {
            let targetUser = mentions.users.first().id;
            return (await ufc.takeMoney(targetUser, cash));
        }
    }
    return false;
}

//From content, parse fightID, 
async function createClassicBet(userID, content) {
    try {


        //Make sure arguments are proper first.
        let arguments = content.split(" ");
        if (arguments.length != 3) throw new Error("Creating classic bet requires 3 arguments.");
        if (isNaN(arguments[0]) || isNaN(arguments[1]) || isNaN(arguments[2])) throw new Error("Classic bet requires 3 integer arguments.");
        if (arguments[1] != 1 && arguments[1] != 2) throw new Error("Classic bet requires 1 or 2 for winner.");

        //make sure user exists and has enough money.
        let targetUser = await ufc.findUser(userID);
        if (!targetUser) throw new Error("User doesn't have an account.");
        if (targetUser.balance < arguments[2]) throw new Error("User doesn't have enough money to make this bet.");



        let fight = await ufc.getFight(arguments[0]);
        // console.log(fight);
        if (!fight) throw new Error("Fight with this fightEventID doesn't exist");
        if (await ufc.takeMoney(userID, arguments[2])) { //If take money worked.
            let newBet = new Bet("classic", arguments[2], fight.event_id, fight.event_date, { uuid: targetUser.uuid, fighterName: (arguments[1] == 1 ? fight.away_name : fight.home_name) }, null, { user1: (arguments[1] == 1 ? fight.away_odds : fight.home_odds), user2: null });
            if (await ufc.addBet(newBet)) {
                return newBet;
            } else {
                await ufc.addMoney(userID, arguments[2]) // give back money because adding new bet didnt work.
                throw new Error("Couldn't add new bet.");
            }
        }

        // new Bet("classic", 300, 1370716, 1615096800000, { user: john, fighterName: "I Adesanya" }, null, { user1: "-250", user2: null })
        // await test.addBet(new Bet("classic", 300, 1370716, 1615096800000, {user: john, fighterName:"I Adesanya"}, null, {user1: "-250", user2: null} ))
    } catch (err) {
        console.log(err);
        return false;
    }



}
async function create1v1Bet() {

    // await test.addBet(new Bet("1v1", 200, 1382448, 1615694400000, {user: john, fighterName:"M Nicolau"}, {user: bob, fighterName:"T Ulanbekov"}, {user1: "125", user2: "-145"} ))

}

client.on('message', async (msg) => {
    if (msg.content.charAt(0) === config.commandPrefix) {
        textChannel = msg.channel;
        let rawString = msg.content.slice(1);
        let cmd = rawString.split(' ')[0].toLowerCase();

        let tmp = rawString.split(" ");
        tmp.shift();
        let contents = tmp.join(" ");
        //TODO adding more commands. Start with create bet, 1v1, then lastly refresh. 
        switch (cmd) {
            //Display all valid bets. If @ member then display only that members valid bets.
            case 'bets':
                displayBets(textChannel, msg.mentions);
                break;
            //Display all matches and their betting odds.
            case 'matches':
            case 'match':
            case 'upcomingmatches':
                displayMatches(textChannel, contents);
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
                if (await createClassicBet(msg.author.id, contents)) {
                    textChannel.send("`" + `Added a new classic bet successfully.` + "`");
                    displayBets(textChannel, msg.mentions);

                } else {
                    textChannel.send("`" + `Couldn't create this bet. Make sure you use the right arguments. (fightID, winner (1 or 2), amount) Ex. "$bet 1457586 1 300" ` + "`");

                }
                break;
            //Creates a 1v1 bet between the user and the person @ mentioned. Also need a $ amount. Winner takes all.
            case '1v1':
                await create1v1Bet();
                break;

            //Admin Commands:
            //Gives money to user @ mentioned.
            case 'give':
            case 'add':
            case 'addmoney':
            case 'givemoney':
                if (isAdmin(msg.author.id)) {
                    if (await giveMoney(msg.mentions, contents)) {
                        textChannel.send("`" + `Gave user ${contents.split(" ")[1]}.` + "`")
                    } else {
                        textChannel.send("`" + `Failed to give user money.` + "`")
                    }
                } else {
                    textChannel.send("`You don't have permission for that command.`");
                }
                break;
            // Takes money from user @ mentioned.
            case 'take':
            case 'remove':
            case 'takemoney':
            case 'removemoney':
                if (isAdmin(msg.author.id)) {
                    if (await takeMoney(msg.mentions, contents)) {
                        textChannel.send("`" + `Took ${contents.split(" ")[1]} from user.` + "`")
                    } else {
                        textChannel.send("`" + `Failed to take users money.` + "`")
                    }
                } else {
                    textChannel.send("`You don't have permission for that command.`");
                }
                break;
            //Refreshes match data retrieved from oddsharks.
            case 'refresh':
                break;

            case 'off':
            case 'stop':
            case 'disconnect':
            case 'reset':
            case 'restart':
                // stop(msg.member);
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