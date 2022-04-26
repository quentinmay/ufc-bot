/*
    Program name: "UFC Bot" The UFC Bot enables users of a discord server to play a fake UFC betting game with friends.
    Copyright (C) 2021  Quentin May

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
/*
Author information:
    Authors: Quentin May, Ethan Santos, Brian Lucero
    Emails: quentinemay@csu.fullerton.edu, ethansantos@csu.fullerton.edu, 13rianlucero@csu.fullerton.edu
*/

/*
Program information:
    Program name: UFC Bot
    Programming language: JavaScript
    Files: index.js
    Date project began: 2022-February-17
    Date of last update: 2022-April-25
    Status: Unfinished
    Purpose: The UFC Bot enables users of a discord server to play a fake UFC betting game with friends.
    Base test system: Ubuntu 20.04.3 LTS
*/
/*
This Module:
    File name: index.js
    Description: This is the entry point for the Discord bot that allows front-end capabilities and interpretation of user commands.
*/
const fs = require('fs');
const { Client, Intents } = require('discord.js');
let client = new Client();

const config = require("./config.json")
const path = require('path');
const UFCgame = require('ufc-betting-game');
const Bet = require('./node_modules/ufc-betting-game/utils/Bet');

let ufc = new UFCgame(config.mongoDBURI);

let textChannel;



client.on('ready', () => {
    setStatus();
    setDefaultTextChannel();
    console.log("Started!");
});


/*
Sets default textChannel from the defaultGuild.
*/
function setDefaultTextChannel() {
    try {
        let firstGuild = client.guilds.cache.find(guild => guild.id === config.defaultGuildID);
        textChannel = firstGuild.channels.cache.find(channel => channel.name === config.defaultBotChannelName && channel.type == "text");
    } catch (err) {
        console.log(err);
        console.log("Error loading default textChannel/guild.");
    }
}

/*
Sets discord bot user activity. (My sample uses STREAMING so his icon is purple.)
*/
function setStatus() {
    client.user.setActivity(config.statusActivity, {
        type: config.statusType,
        url: config.statusURL
    }).catch(console.error);
}


ufc.on("betResolved", async (bet, decision, winnerID, cashWon) => {
    try {
        const resolvedBetEmbed = {
            color: 10181046, //this is purple in their weird color system thing https://leovoel.github.io/embed-visualizer/
            footer: {
                icon_url: client.user.displayAvatarURL(),
                text: `footer text.`
            },
            title: "title",
            author: {
                name: "author"
            },
            fields: []
        }
        let thisUser = [bet.user1, bet.user2].find(u => u.uuid == winnerID);
        console.log(thisUser)
        if (decision == "WON") {
            resolvedBetEmbed.color = 3654934; //Green
            resolvedBetEmbed.author = ""
            if (!isNaN(cashWon)) //If its not a number, that means its a dare bet.
                resolvedBetEmbed.title = `$${cashWon}💰 was added to your account.`
            else resolvedBetEmbed.title = `You don't have to do "${cashWon}"`
            resolvedBetEmbed.footer.text = `${thisUser.fighterName} won the fight.`
            let member = await getGuildMemberFromServerIDAndUserID(textChannel.guild.id, winnerID)
            textChannel.send({
                content: `${member}`,
                embed: resolvedBetEmbed
            });
        } else if (decision == "DRAW") {
            resolvedBetEmbed.color = 16314400; //Yellow
            resolvedBetEmbed.author = ""
            if (!isNaN(cashWon))
                resolvedBetEmbed.title = `$${cashWon}💰 was added back to your account.`
            else resolvedBetEmbed.title = `Neither of you has to do the dare.`
            resolvedBetEmbed.footer.text = `${thisUser.fighterName}'s fight was a draw.`
        } else if (decision == "LOST") {
            resolvedBetEmbed.color = 14951429; //Red
            resolvedBetEmbed.author = ""
            if (!isNaN(cashWon))
                resolvedBetEmbed.title = `You lost your $${cashWon}.`
            else resolvedBetEmbed.title = `You lost your bet. You have to do "${cashWon}"`
            resolvedBetEmbed.footer.text = `${thisUser.fighterName} lost the fight.`
        }
        

    } catch (err) {
        console.log(err);
    }

});




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
            textChannel.send("`" + `${fight.event_id} - 🟥1.${fight.away_name}(${(fight.away_odds > 0) ? "+" : ""}${fight.away_odds}) vs. 🟦2. ${fight.home_name}(${(fight.home_odds > 0) ? "+" : ""}${fight.home_odds})` + "`");
        } else {
            textChannel.send("`This fight doesn't exist.`");
        }
        return true;
    } else {//No user mentioned. Just display all matches.
        const matchesEmbed = {
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
            if (!upcomingMatch.away_odds || !upcomingMatch.home_odds) continue; //skip matches with unknown odds.
            matchesEmbed.fields.push({
                name: `${upcomingMatch.event_id} - 🟥1. ${upcomingMatch.away_name} vs. 🟦2. ${upcomingMatch.home_name}`,
                value: `Odds: ${(upcomingMatch.away_odds > 0) ? "+" : ""}${upcomingMatch.away_odds} vs. ${(upcomingMatch.home_odds > 0) ? "+" : ""}${upcomingMatch.home_odds}`,
                url: "",
            })
            i++;
            if (i > 24) break;
        }
        matchesEmbed.footer.text = `${i} matches listed`
        textChannel.send({
            embed: matchesEmbed
        });
        textChannel.send("`Do $bet 'fightid' 'winner#' 'money'\n(Ex. $bet 1458441 2 300)`")
        return true;
    }


}

async function displayBets(textChannel, mentions) {
    try {
        const betsEmbed = {
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
            betsEmbed.footer.text = `${i} Bets listed`

        } else {//No user mentioned. Just display all bets.
            let i = 0;
            for (let outstandingBet of ufc.outstandingBets) {
                betsEmbed.fields.push(await prettyOutstandingBet(outstandingBet))
                i++;
                if (i > 24) break;
            }
            betsEmbed.footer.text = `${i} Bets listed`
        }
        textChannel.send({
            embed: betsEmbed
        });
        return true;
    } catch (err) {
        console.log(err)
        return false;
    }

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
            name: `💵$${outstandingBet.betAmount}💵: ${guildmember1.displayName} bet for winner: 👑${outstandingBet.user1.fighterName}`,
            value: `Classic bet, Match ID: ${outstandingBet.fightEventID}, Fight date: ${new Date(outstandingBet.fightEventDate).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric' })}`,
            url: "",
        });
    } else if (outstandingBet.betType === "1v1") {
        let guildmember1 = await getGuildMemberFromServerIDAndUserID(textChannel.guild.id, outstandingBet.user1.uuid)
        let guildmember2 = await getGuildMemberFromServerIDAndUserID(textChannel.guild.id, outstandingBet.user2.uuid)
        return ({
            name: `💵$${outstandingBet.betAmount}💵: ${guildmember1.displayName}-${outstandingBet.user1.fighterName}(${(outstandingBet.odds.user1 > 0) ? "+" : ""}${outstandingBet.odds.user1}) 🆚 ${guildmember2.displayName}-${outstandingBet.user2.fighterName}(${(outstandingBet.odds.user2 > 0) ? "+" : ""}${outstandingBet.odds.user2})`,
            value: `1v1 bet, Match ID: ${outstandingBet.fightEventID}, Fight date: ${new Date(outstandingBet.fightEventDate).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric' })}`,
            url: "",
        });
    }
}

function isAdmin(userID) {
    return config.discordDevID.indexOf(userID) != -1;

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
            let newBet = new Bet("classic", parseInt(arguments[2]), fight.event_id, fight.event_date, { uuid: targetUser.uuid, fighterName: (arguments[1] == 1 ? fight.away_name : fight.home_name) }, null, { user1: (arguments[1] == 1 ? fight.away_odds : fight.home_odds), user2: null });
            if (await ufc.addBet(newBet)) {
                return newBet;
            } else {
                await ufc.addMoney(userID, arguments[2]) // give back money because adding new bet didnt work.
                throw new Error("Couldn't add new bet.");
            }
        }
    } catch (err) {
        console.log(err);
        return false;
    }
}
//$1v1 @user 1444342 1 300
async function create1v1Bet(userID, content, mentions) {

    try {
        //Make sure arguments are proper first.
        let arguments = content.split(" ");
        if (arguments.length < 4) throw new Error("Creating 1v1 bet requires atleast 4 arguments.");
        if (isNaN(arguments[1]) || isNaN(arguments[2])) throw new Error("1v1 bet requires fightID and fighterID to be intergers.");
        if (arguments[2] != 1 && arguments[2] != 2) throw new Error("1v1 bet requires 1 or 2 for winner.");


        //make sure user exists and has enough money.
        let targetUser = await ufc.findUser(userID);
        let secondUserID = mentions.users.first().id;
        let secondUser = await ufc.findUser(secondUserID);
        if (!targetUser || !secondUser) throw new Error("One of the user's doesn't have an account.");
        if (targetUser.balance < arguments[3] || secondUser.balance < arguments[3]) throw new Error("User doesn't have enough money to make this bet.");


        let fight = await ufc.getFight(arguments[1]);
        if (!fight) throw new Error("Fight with this fightEventID doesn't exist");
        let newBet = new Bet("1v1", (arguments.length == 4) ? parseInt(arguments[3]) : arguments.slice((arguments.length - 3) * -1).join(" "), fight.event_id, fight.event_date,
            { uuid: targetUser.uuid, fighterName: (arguments[2] == 1 ? fight.away_name : fight.home_name) }, //user1
            { uuid: secondUserID, fighterName: (arguments[2] == 1 ? fight.home_name : fight.away_name) }, //user2
            { user1: (arguments[2] == 1 ? fight.away_odds : fight.home_odds), user2: (arguments[2] == 1 ? fight.home_odds : fight.away_odds) }); //odds
        return (await ufc.addBet(newBet));


    } catch (err) {
        console.log(err);
        return false;
    }
}

//$1v1odds @user 1444342 1 300
async function create1v1OddsBet(userID, content, mentions) {

    try {
        //Make sure arguments are proper first.
        let arguments = content.split(" ");
        if (arguments.length != 4) throw new Error("Creating 1v1odds bet requires 4 arguments.");
        if (isNaN(arguments[1]) || isNaN(arguments[2] || isNaN(arguments[3]))) throw new Error("1v1odds bet requires fightID, fighterID, and money to be integers.");
        if (arguments[2] != 1 && arguments[2] != 2) throw new Error("1v1odds bet requires 1 or 2 for winner.");


        //make sure user exists and has enough money.
        let targetUser = await ufc.findUser(userID);
        let secondUserID = mentions.users.first().id;
        let secondUser = await ufc.findUser(secondUserID);

        let fight = await ufc.getFight(arguments[1]);
        if (!fight) throw new Error("Fight with this fightEventID doesn't exist");

        let user1FighterName = (arguments[2] == 1 ? fight.away_name : fight.home_name);
        let user2FighterName = (arguments[2] == 1 ? fight.home_name : fight.away_name);
        let user1Odds = (arguments[2] == 1 ? fight.away_odds : fight.home_odds);
        let user2Odds = (arguments[2] == 1 ? fight.home_odds : fight.away_odds)

        let user1MoneyInput = parseInt(arguments[3]);
        let user2MoneyInput = await ufc.calcMoneyWon(user1Odds, user1MoneyInput);

        if (!targetUser || !secondUser) throw new Error("One of the user's doesn't have an account.");
        if (targetUser.balance < user1MoneyInput || secondUser.balance < user2MoneyInput) throw new Error("User doesn't have enough money to make this bet.");


        let newBet = new Bet("1v1odds", user1MoneyInput, fight.event_id, fight.event_date, { uuid: userID, fighterName: user1FighterName }, { uuid: secondUserID, fighterName: user2FighterName }, { user1: user1Odds, user2: user2Odds })

        return (await ufc.addBet(newBet));


    } catch (err) {
        console.log(err);
        return false;
    }
}

//$calcodds 1444342 1 300
async function calcOdds(content) {
    try {
        //Make sure arguments are proper first.
        let arguments = content.split(" ");
        if (arguments.length != 3) throw new Error("Calculating winnings requires 3 arguments.");
        if (isNaN(arguments[0]) || isNaN(arguments[1] || isNaN(arguments[2]))) throw new Error("1v1odds bet requires fightID, fighterID, and money to be integers.");
        if (arguments[1] != 1 && arguments[1] != 2) throw new Error("1v1odds bet requires 1 or 2 for winner.");


        let fight = await ufc.getFight(arguments[0]);
        if (!fight) throw new Error("Fight with this fightEventID doesn't exist");

        let user1FighterName = (arguments[1] == 1 ? fight.away_name : fight.home_name);
        let user2FighterName = (arguments[1] == 1 ? fight.home_name : fight.away_name);
        let user1Odds = (arguments[1] == 1 ? fight.away_odds : fight.home_odds);
        let user2Odds = (arguments[1] == 1 ? fight.home_odds : fight.away_odds)

        let user1MoneyInput = parseInt(arguments[2]);
        let user2MoneyInput = await ufc.calcMoneyWon(user1Odds, user1MoneyInput);

        let user1Gains = await ufc.calcMoneyWon(user1Odds, user1MoneyInput);
        let user2Gains = await ufc.calcMoneyWon(user2Odds, user2MoneyInput);

        return ({user1: {odds: user1Odds, fighterName: user1FighterName, moneyInput: user1MoneyInput, gain: user1Gains}, user2: {odds: user2Odds, fighterName: user2FighterName, moneyInput: user2MoneyInput, gain: user2Gains}, fight: fight});


    } catch (err) {
        console.log(err);
        return false;
    }
}

//$verify1v1 @user 1444342
async function verify1v1(userID, content, mentions) {
    try {
        //Make sure arguments are proper first.
        let arguments = content.split(" ");
        if (arguments.length != 2) throw new Error("Creating 1v1 bet requires 2 arguments.");
        if (isNaN(arguments[1])) throw new Error("1v1 bet requires 1 integer arguments.");

        //make sure user exists and has enough money.
        let targetUserID = mentions.users.first().id;
        let targetUser = await ufc.findUser(targetUserID);
        let secondUser = await ufc.findUser(userID);
        if (!targetUser || !secondUser) throw new Error("One of the user's doesn't have an account.");

        let tmpBet = await ufc.findOutstandingBetWithFightID("1v1", arguments[1], userID, targetUserID);

        if (targetUser.balance < tmpBet.betAmount || secondUser.balance < tmpBet.betAmount) throw new Error("User doesn't have enough money to make this bet.");
        let bet = await ufc.verify1v1Bet("1v1", arguments[1], userID, targetUserID);
        // verify1v1Bet(betType, fightID, user1ID, user2ID)
        if (bet) {
            if (!isNaN(bet.betAmount)) {
                if (await ufc.takeMoney(userID, bet.betAmount) && await ufc.takeMoney(targetUserID, bet.betAmount)) { //If take money worked.
                    return true;
                } else {
                    await ufc.addMoney(userID, bet.betAmount) // give back money because adding new bet didnt work.
                    await ufc.addMoney(targetUserID, bet.betAmount)
                }
            } else {
                return true;
            }
        }
        throw new Error("Couldn't add new bet.");
    } catch (err) {
        console.log(err);
        return false;
    }
}
//$verify1v1odds @user 1444342
async function verify1v1odds(userID, content, mentions) {
    try {
        //Make sure arguments are proper first.
        let arguments = content.split(" ");
        if (arguments.length != 2) throw new Error("Creating 1v1 bet requires 2 arguments.");
        if (isNaN(arguments[1])) throw new Error("1v1 bet requires 1 integer arguments.");

        //make sure user exists and has enough money.
        let targetUserID = mentions.users.first().id;
        let targetUser = await ufc.findUser(targetUserID);
        let secondUser = await ufc.findUser(userID);
        if (!targetUser || !secondUser) throw new Error("One of the user's doesn't have an account.");

        let tmpBet = await ufc.findOutstandingBetWithFightID("1v1odds", arguments[1], targetUserID, userID);
        let user1MoneyInput = tmpBet.betAmount;
        let user2MoneyInput = await ufc.calcMoneyWon(tmpBet.odds.user1, tmpBet.betAmount);

        if (targetUser.balance < user1MoneyInput || secondUser.balance < user2MoneyInput) throw new Error("User doesn't have enough money to make this bet.");

        let bet = await ufc.verify1v1Bet("1v1odds", arguments[1], targetUserID, userID);
        // verify1v1Bet(betType, fightID, user1ID, user2ID)
        if (bet) {
            if (await ufc.takeMoney(targetUserID, user1MoneyInput) && await ufc.takeMoney(userID, user2MoneyInput)) { //If take money worked.
                return bet;
            } else {
                await ufc.addMoney(targetUserID, user1MoneyInput) // give back money because adding new bet didnt work.
                await ufc.addMoney(userID, user2MoneyInput)
            }
        }
        throw new Error("Couldn't add new bet.");
    } catch (err) {
        console.log(err);
        return false;
    }
}

async function cancelBet(content) {
    try {
        let betType = content.split(" ")[0];
        let fightID = content.split(" ")[1];
        let user1ID = content.split(" ")[2];
        let user2ID = content.split(" ")[3];
        if (!isNaN(fightID)) {
            if (await ufc.cancelBet(betType, fightID, user1ID, user2ID)) {
                return true;
            } else {
                return false;
            }
        }
        return false;
    } catch (err) {
        console.log(err);
        return false;
    }

}

client.on('message', async (msg) => {
    if (msg.content.charAt(0) === config.commandPrefix) {
        textChannel = msg.channel;
        let rawString = msg.content.slice(1);
        let cmd = rawString.split(' ')[0].toLowerCase();

        let tmp = rawString.split(" ");
        tmp.shift();
        let contents = tmp.join(" ");
        //TODO 1v1 bet command
        //TODO test resolveBets 
        switch (cmd) {
            case 'test':
                textChannel.send(`$verify1v1odds ${msg.author} 1646096`)
                break;
            //Display all valid bets. If @ member then display only that members valid bets.
            case 'resolvebets':
                if (await ufc.resolveBets()) {
                    textChannel.send("Successfuly resolved bets.");

                } else {
                    textChannel.send("Failed to resolve bets.");
                }
                break;
            case 'bets':
                if (!(await displayBets(textChannel, msg.mentions))) {
                    textChannel.send("Failed to display bets.");
                };
                break;
            //Display all matches and their betting odds.
            case 'matches':
            case 'match':
            case 'upcomingmatches':
                if (!(await displayMatches(textChannel, contents))) {
                    textChannel.send("Failed to display matches.");
                };
                break;
            //Display user details
            case 'balance':
            case 'user':
                if (!(await displayUser(textChannel, msg.mentions, msg.author))) {
                    // textChannel.send("Failed to display user.");
                };
                break;

            //Action Commands:
            //Registers a user account for the person @ mentioned.
            case 'register':
                if (await registerUser(textChannel, msg.mentions, msg.author, config.defaultCash)) {
                    textChannel.send("`Created user account.`");
                    await displayUser(textChannel, msg.mentions, msg.author);
                } else {
                    textChannel.send("`Couldn't create user account.`");

                }

                break;
            //Creates a normal bet for the user using oddshark odds.
            case 'bet':
                if (await createClassicBet(msg.author.id, contents)) {
                    textChannel.send("`" + `Added a new classic bet successfully.` + "`");
                    await displayBets(textChannel, msg.mentions);

                } else {
                    textChannel.send("`" + `Couldn't create this bet. Make sure you use the right arguments. (fightID, winner (1 or 2), amount) \nEx. "$bet 1457586 1 300" ` + "`");

                }
                break;
            //Creates a 1v1 bet between the user and the person @ mentioned. Also need a $ amount. Winner takes all.
            case '1v1':
                if (await create1v1Bet(msg.author.id, contents, msg.mentions)) {
                    textChannel.send("`Created 1v1 bet.`");
                } else {
                    //
                    textChannel.send("`Failed to create 1v1 bet.\nEx. $1v1 @user 1444342 1 300`");
                }
                break;
            case '1v1odds':
                if (await create1v1OddsBet(msg.author.id, contents, msg.mentions)) {
                    let arguments = contents.split(" ");
                    let fight = await ufc.getFight(arguments[1]);
                    let user1FighterName = (arguments[2] == 1 ? fight.away_name : fight.home_name);
                    let user2FighterName = (arguments[2] == 1 ? fight.home_name : fight.away_name);
                    let user1Odds = (arguments[2] == 1 ? fight.away_odds : fight.home_odds);
                    let user2Odds = (arguments[2] == 1 ? fight.home_odds : fight.away_odds)

                    let user1MoneyInput = parseInt(arguments[3]);
                    let user2MoneyInput = await ufc.calcMoneyWon(user1Odds, user1MoneyInput);

                    let user1Gains = await ufc.calcMoneyWon(user1Odds, user1MoneyInput);
                    let user2Gains = await ufc.calcMoneyWon(user2Odds, user2MoneyInput);

                    let guildMember1 = await getGuildMemberFromServerIDAndUserID(textChannel.guild.id, msg.author.id)
                    let guildMember2 = await getGuildMemberFromServerIDAndUserID(textChannel.guild.id, msg.mentions.users.first().id)
                    textChannel.send(`Created 1v1 odds bet. ${guildMember1} pays ${user1MoneyInput} on ${user1FighterName}(${user1Odds}) odds to win $${user1Gains} totaling $${user1Gains + user1MoneyInput}\n${guildMember2} pays $${user2MoneyInput} on ${user2FighterName}(${user2Odds}) odds to win $${user2Gains} totaling $${user2Gains + user2MoneyInput}`);
                    textChannel.send(`${guildMember2} Verify with '$verify1v1odds ${guildMember1} ${fight.event_id}'`)
                } else {
                    //
                    textChannel.send("`Failed to create 1v1 bet.\nEx. $1v1 @user 1444342 1 300`");
                }
                break;
            case 'calcodds':
                let response = await calcOdds(contents);
                if (response) {
                    textChannel.send(`You pay $${response.user1.moneyInput} on ${response.user1.fighterName}(${response.user1.odds}) odds to win $${response.user1.gain} totaling $${response.user1.gain + response.user1.moneyInput}\nPlayer2 pays $${response.user2.moneyInput} on ${response.user2.fighterName}(${response.user2.odds}) odds to win $${response.user2.gain} totaling $${response.user2.gain + response.user2.moneyInput}`);
                }else {
                    textChannel.send("`Failed to calculate odds for this fight.\nEx. $calcodds 1444342 1 300`");
                }

                break;
            case 'verify1v1':
                if (await verify1v1(msg.author.id, contents, msg.mentions)) {
                    textChannel.send("`Verified 1v1 bet.`");
                } else {
                    textChannel.send("`Failed to create 1v1 bet.\n$verify1v1 @user 1444342`");
                }
                break;
            case 'verify1v1odds':
                if (await verify1v1odds(msg.author.id, contents, msg.mentions)) {
                    textChannel.send("`Verified 1v1odds bet.`");
                } else {
                    textChannel.send("`Failed to create 1v1 bet.\n$verify1v1odds @user 1444342`");
                }
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
            //Cancels bet. .
            case 'cancelbet':
                if (isAdmin(msg.author.id)) {
                    if (await cancelBet(contents)) {
                        textChannel.send("`" + `Canceled bet` + "`")
                    } else {
                        textChannel.send("`" + `Failed to cancel bet.\nEx. $cancelbet classic 134234 userID1 userID2` + "`")
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
            case 'refreshfromfile':
                if (await ufc.loadFromFile()) {
                    textChannel.send("`" + `Refreshed upcoming matches from file.` + "`")
                } else {
                    textChannel.send("`" + `Failed to refresh upcoming matches from file.` + "`")
                }
                break;
            case 'refreshbefore':
                if (await ufc.loadFromFile(`${__dirname}/oldMatchData.json`)) {
                    textChannel.send("`" + `Refreshed upcoming matches from file.` + "`")
                } else {
                    textChannel.send("`" + `Failed to refresh upcoming matches from file.` + "`")
                }
                break;
            case 'refreshafter':
                if (await ufc.loadFromFile(`${__dirname}/newMatchData.json`)) {
                    textChannel.send("`" + `Refreshed upcoming matches from file.` + "`")
                } else {
                    textChannel.send("`" + `Failed to refresh upcoming matches from file.` + "`")
                }
                break;
            case 'refreshdraw':
                if (await ufc.loadFromFile(`${__dirname}/matchDatadraw.json`)) {
                    textChannel.send("`" + `Refreshed upcoming matches from file.` + "`")
                } else {
                    textChannel.send("`" + `Failed to refresh upcoming matches from file.` + "`")
                }
                break;
            case 'refresh':
            case 'refreshmatch':
            case 'refreshmatches':
            case 'refreshupcomingmatches':
                if (isAdmin(msg.author.id)) {
                    if (await ufc.refreshUpComingMatches()) {
                        textChannel.send("`" + `Refreshed upcoming matches.` + "`")
                    } else {
                        textChannel.send("`" + `Failed to refresh upcoming matches.` + "`")
                    }
                } else {
                    textChannel.send("`You don't have permission for that command.`");
                }
                break;

            case 'off':
            case 'stop':
            case 'disconnect':
            case 'reset':
            case 'restart':
                // stop(msg.member);
                break;
            case 'crash':
                if (isAdmin(msg.author.id)) {
                    msg.member.send("Crash command sent.");
                    process.exit(0);
                } else {
                    textChannel.send("`You don't have permission for that command.`");
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
    await ufc.initialize();
    // console.log(ufc.upComingMatches);
    // console.log(1234)
    // await ufc.refreshUpComingMatches();
    // console.log(123)
    // await ufc.loadFromFile();
    // console.log(ufc.upComingMatches);
    // await test1v1Odds();    
    console.log(await unitTests());
    return true;
}

    // console.log(test.upComingMatches);
    // console.log(test.previousMatches);
    // await test.refreshUpComingMatches();
    // test.addUser(123, "john");

    // console.log(test.upComingMatches.length);
    // console.log(test.previousMatches.length);
    // var john = await test.findUser(1234);
    // var bob = await test.findUser(456);
    // var fight = test.getFight()
    // test.addUser(123, "john");
    // test.addUser(456, "bob");
    // console.log(test.outstandingBets);
    // test.takeMoney(456, 777)
    // test.addMoney(123, 4);
    // await test.refreshUpComingMatches();
    // console.log(test.upComingMatches);
    // console.log(test.previousMatches);
    // await test.addBet(new Bet("1v1", 200, 1382448, 1615694400000, {user: john, fighterName:"M Nicolau"}, {user: bob, fighterName:"T Ulanbekov"}, {user1: "125", user2: "-145"} ))
    // await test.addBet(new Bet("classic", 300, 1370716, 1615096800000, {user: john, fighterName:"I Adesanya"}, null, {user1: "-250", user2: null} ))
    // await test.resolveBets();
    // await test.cancelBet("classic", john, null);
    // console.log(test.outstandingBets);

bootSequence().catch(err => console.error(err))

// ----------- TESTS --------------
async function unitTests() {
    var test = new UFCgame(null, null, null, null, null, null, `${__dirname}/testUsers.json`, `${__dirname}/testBets.json`, `${__dirname}/testMatchData.json`, `${__dirname}/testPreviousMatches.json`, `${__dirname}/testResolvedBets.json`);
    await test.initialize();

    console.log("\n === PRE-TEST: CHECK INITIAL VALUES ================================= ");
    console.log("   (A) - Check list of Users");
    console.log("       - Should be empty list");
    console.table(test.users);
    console.log("PASSSED");  

    let passFail = [];
    //Expected test.users.indexOf(john != -1)
    let user1, user2;
    try{
    await test.addUser(123, "john");
    passFail.push( { UnitTest: 'testAddUser()', Input: '123, "john"', Condition: 'test.users.find(u => u.uuid == 123', Result: test.users.find(u => u.uuid == 123) != null} ); } catch(err) {passFail.push(("testAddUser",false))}
    
    console.log("\n UNIT TEST: 0 === [ testAddUser() ] ======================= ");
    console.log("     (B) - Check list of Users");
    console.log("         - Should be 1 User in List; [123, john]");
    console.table(test.users);
    if (test.users.find(u => u.uuid == 123) != null){
        console.log("%%%%%%%%\n PASSED\n%%%%%%%%\n");
    } else {
        console.log("%%%%%%%%\n FAILED\n%%%%%%%%\n");
    }

    try{
    await test.addUser(456, "smith");
    passFail.push( {UnitTest: "testAddUser()", Input: '456, "smith"', Condition: 'test.users.find(u => u.uuid == 123', Result: test.users.find(u => u.uuid == 456) != null}); } catch(err) {passFail.push(("testAddUser",false))}

    console.log("\n UNIT TEST: 1 === [ testAddUser() ] ======================= ");
    console.log("    (C)  - Check list of Users");
    console.log("         - Should be 2 Users in List; [456, smith]");
    console.table(test.users);
    if (test.users.find(u => u.uuid == 456) != null){
        console.log("%%%%%%%%\n PASSED\n%%%%%%%%\n");
    } else {
        console.log("%%%%%%%%\n FAILED\n%%%%%%%%\n");
    }

    // Expected user with id 123, and username john 
    try{
    user1 = await testFindUser(test, 123);
    passFail.push({ UnitTest: "testFindUser()", Input: 'test, 123', Condition: 'user1.uuid == 123 && user1.userName == "john"', Result: user1.uuid == 123 && user1.userName == "john"} ); } catch(err) {passFail.push(("testFindUser",false))}
    
    console.log("\n UNIT TEST: 2 === [ testFindUser() ] ======================= ");
    console.log("\     - Check list of Users");
    console.table(test.users);
    if (user1.uuid == 123 && user1.userName == "john"){
        console.log("%%%%%%%%\n PASSED\n%%%%%%%%\n");
    } else {
        console.log("%%%%%%%%\n FAILED\n%%%%%%%%\n");
    }
    
    try{
    user2 = await testFindUser(test, 456);
    passFail.push({ UnitTest: "testFindUser()", Input: 'test, 456', Condition: 'user2.uuid == 456 && user2.userName == "smith"', Result: user2.uuid == 456 && user2.userName == "smith"} ); } catch(err) {passFail.push(("testFindUser",false))}
    //Expected 600

    console.log("\n UNIT TEST: 3 === [ testFindUser() ] ======================= ");
    console.log("      - Check user2.uuid == 456 && user2.userName == 'smith'");
    console.table(test.users);
    if (user1.uuid == 123 && user1.userName == "john"){
        console.log("%%%%%%%%\n PASSED\n%%%%%%%%\n");
    } else {
        console.log("%%%%%%%%\n FAILED\n%%%%%%%%\n");
    }

    try{
    await testAddRemoveMoney(test, user1, 1000, 400);
    passFail.push( { UnitTest: "testAddRemoveMoney()", Input: 'test, user1, 1000, 400', Condition: 'user1.balance == 600', Result: user1.balance == 600 } );} catch(err) {passFail.push(("testAddRemoveMoney",false))}
    
    console.log("\n UNIT TEST: 4 === [ testAddRemoveMoney() ] ======================= ");
    console.log("      - Check user1.balance == 600");
    console.table(test.users);
    if (user1.balance == 600){
        console.log("%%%%%%%%\n PASSED\n%%%%%%%%\n");
    } else {
        console.log("%%%%%%%%\n FAILED\n%%%%%%%%\n");
    }

    //Expected 1200
    try{
    await testAddRemoveMoney(test, user2, 2400, 1200);
    passFail.push( { UnitTest: "testAddRemoveMoney()", Input: 'test, user2, 2400, 1200', Condition: 'user2.balance == 1200', Result: user2.balance == 1200 } );} catch(err) {passFail.push(("testAddRemoveMoney",false))}
    
    console.log("\n UNIT TEST: 5 === [ testAddRemoveMoney() ] ======================= ");
    console.log("      - Check user2.balance == 1200");
    console.table(test.users);
    if (user2.balance == 1200){
        console.log("%%%%%%%%\n PASSED\n%%%%%%%%\n");
    } else {
        console.log("%%%%%%%%\n FAILED\n%%%%%%%%\n");
    }

    console.log(user1)
    console.log(user2)

    await testAdvanced1v1OddsBet(test, user1, user2)
    passFail.push( { UnitTest: "testAdvanced1v1OddsBet()", Input: 'test, user1, user2', Condition: 'user1.balance == 744 && user2.balance == 1056', Result: user1.balance == 744 && user2.balance == 1056 } );

    console.log("\n UNIT TEST: 6 === [ testAdvanced1v1OddsBet ] ======================= ");
    console.log("      - Check user1.balance == 744 && user2.balance == 1056");
    console.table(test.users);
    if (user1.balance == 744 && user2.balance == 1056){
        console.log("%%%%%%%%\n PASSED\n%%%%%%%%\n");
    } else {
        console.log("%%%%%%%%\n FAILED\n%%%%%%%%\n");
    }

    console.log("UNIT TEST SUITE -- SUMMARY:");
    console.table(passFail);
    //After completion, delete all old testFiles
    fs.unlinkSync(test.previousMatchesPath)
    fs.unlinkSync(test.betsPath)
    fs.unlinkSync(test.usersPath)
    fs.unlinkSync(test.resolvedBetsPath)
    fs.unlinkSync(test.matchDataPath)
}

async function testAddUser(uuid, username) {
    await test.addUser(uuid, username);
}


async function testAddRemoveMoney(test, user, add, take) {
    await test.addMoney(user.uuid, add)
    await test.takeMoney(user.uuid, take)

    return user;
}

async function testAdvanced1v1OddsBet(test, user1, user2) {
    await test.loadFromFile(`${__dirname}/oldMatchData.json`);
    let user1Odds = -138;
    let user2Odds = 110;
    let user1MoneyInput = 200;
    let user2MoneyInput = await test.calcMoneyWon(user1Odds, user1MoneyInput);
    await test.addBet(new Bet("1v1odds", user1MoneyInput, 1646096, 61270400000, { uuid: user1.uuid, fighterName: "R Font" }, { uuid: user2.uuid, fighterName: "M Vera" }, { user1: user1Odds, user2: user2Odds }))

    console.log("\n(C) === UNIT TEST: 6 === [ testAdvanced1v1OddsBe ] ======================= ");
    console.log("------------------------------\n  Check list of Users\n");
    console.table(test.users);
    console.log("\n");

    await test.takeMoney(123, user1MoneyInput);
    await test.takeMoney(456, user2MoneyInput);

    console.log("------------------------------\n  Check list of Users");
    console.table(test.users);
    console.log("\n");

    let bet = await test.verify1v1Bet("1v1odds", 1646096, user1.uuid, user2.uuid);
    if (bet) {
        console.log("1v1odds bet verified", bet)
    }

    console.log("------------------------------\n  Check list of Users");
    console.table(test.users);
    console.log("\n");

    await test.loadFromFile(`${__dirname}/newMatchData.json`);
    await test.resolveBets();

    console.log("------------------------------\n  Check list of Users");
    console.table(test.users);
    console.log("\n");

    return;
}

async function testFindUser(test, userID) {
    let user = await test.findUser(userID);
    return user;

}

// needs implementation------------------
// function testDatabaseConnection() {
// }
// needs implementation------------------