/*
* Nyaabot by phoenixlzx <i@phoenixlzx.com>
* */

var irc = require('irc'),
    config = require('./config.js'),
    messages = require('./messages.js'),
    util = require('util'),
    html_strip = require('htmlstrip-native'),
    async = require('async'),
    request = require("request");

var parseString = require('xml2js').parseString;

var nyaa = new irc.Client(config.server, config.nick, config.serveroptions);

nyaa.addListener("registered", function(message) {
    // console.log(util.inspect(message, false, null));
    console.log(config.nick + ' has connected to server successfully.');
});

// Notice handler
nyaa.addListener("notice", function (from, to, text, message) {
    // console.log(from + '\n' + to + '\n' + text + '\n' + util.inspect(message, false, null));
    if (from === 'NickServ'
        && to === config.serveroptions.userName
        && text === 'This nickname is registered. Please choose a different nickname, or identify via /msg NickServ identify <password>.') {
        nyaa.say('NickServ', 'identify ' + config.password);
    }
    if (from === 'NickServ'
        && to === config.serveroptions.userName
        && text === 'You are now identified for ' + config.serveroptions.userName) {
        console.log('Login success.');
    } else if (from === 'NickServ'
        && to === config.serveroptions.userName
        && text === 'Invalid password for ' + config.serveroptions.userName) {
        console.log('Incorrect password. check you config!');
    }
});

nyaa.addListener("pm", function (from, text, message) {
    nyaa.say(from, messages.refusemessage);
});

nyaa.addListener("message", function(from, to, text, message) {
    // console.log(from + '\n' + to + '\n' + text + '\n' + util.inspect(message, false, null));
    // handle messages from other bots
    if (config.otherbots.indexOf(from) !== -1) {
        text = text.slice(text.indexOf('>') + 2);
    }
    // handle commands
    if (text.startsWith(config.commandsymbol)) {
        switch (text.slice(1, 2)) {
            case 'w':
                request({
                    uri: config.searchwiki.host + "/api.php?action=query&format=xml&titles=" + text.slice(3)
                }, function(error, response, body) {
                    if (error) {
                       return nyaa.say(to, messages.error);
                    } else {
                        parseString(body, function(err, result) {
                            if (result.api.error || !result.api.query[0].pages[0].page[0].$.pageid) {
                                return nyaa.say(to, messages.error);
                            }
                            nyaa.say(to, config.searchwiki.host + '/index.php?curid=' + result.api.query[0].pages[0].page[0].$.pageid);
                        });

                        request({
                            uri: config.searchwiki.host + "/api.php?format=json&action=parse&prop=text&section=0&page=" + text.slice(3)
                        }, function(err, res, bodydata) {
                            if (JSON.parse(bodydata).error) {
                                return nyaa.say(to, messages.error);
                            }
                            var wikidata = JSON.parse(bodydata).parse.text['*'];
                            var options = {
                                include_script : false,
                                include_style : false,
                                compact_whitespace : true
                            };
                            wikidata = html_strip.html_strip(wikidata, options);

                            nyaa.say(to, wikidata);
                        });
                    }
                });
                break;
            case 'p':
                async.eachSeries(messages.play.commands, function(command, callback) {
                    if (text.slice(3) === command) {
                        // console.log(text.slice(3) + '\n' + command);
                        nyaa.say(to, messages.play.response[messages.play.commands.indexOf(command)]);
                        return;
                    }
                    callback();
                }, function() {
                    nyaa.say(to, messages.play.unknown);
                });
                break;
            case 'c':
                if (config.admins.indexOf(from) === -1) {
                    nyaa.say(to, from + ': ' + messages.refusenonadmin);
                } else {
                    switch (text.slice(3)) {
                        case 'quit':
                            nyaa.say(to, messages.cmdquit);
                            nyaa.part(to, function() {
                                console.log(from + ' issued quit command.');
                            });
                            break;

                    }
                }
        }
    }

});

// functions

if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str){
        return this.slice(0, str.length) == str;
    };
}

if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function (str) {
        return this.slice(-str.length) == str;
    };
}

trimSpace = function (str) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}
