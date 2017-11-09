/******************************************************************************
 *
 * Copyright (c) 2017 inPhood Inc. All Rights Reserved.
 *
 */
var Botkit = require('botkit')
var dotEnv = require('dotenv').config({path: './.env'})
var firebase = require('firebase')

var conversationDirector = require('./conversationDirector.js')

// Utils likely needs to come after firebase is required. 
var utils = require('./utils.js')

var controller = Botkit.slackbot({debug: false})
utils.initializeFirebase(firebase)
utils.initializeSlack(controller)


/********************************************************************************
 * Ye old school:
 *
 */
const apiaibotkit = require('api-ai-botkit')
const apiai = apiaibotkit(process.env.DIALOGFLOW_API_KEY);

controller.hears('another_keyword','direct_message,direct_mention',function(bot,message) {
  var reply_with_attachments = {
    'username': 'My bot' ,
    'text': 'This is a pre-text',
    'attachments': [
      {
      'fallback': 'To be useful, I need you to invite me in a channel.',
      'title': 'How can I help you?',
      'text': 'To be useful, I need you to invite me in a channel ',
      'color': '#7CD197',
      }],
    'icon_url': 'http://lorempixel.com/48/48'
  }

  bot.reply(message, reply_with_attachments);
});


controller.hears(['^risk$'], 'direct_message, direct_mention, ambient, mention', function(bot, message) {
  const dbUserRef = firebase.database().ref('/global/diagnosisai/users/tester')
  dbUserRef.update({booz: 'passed writing here'})
  // apiai.process(message, bot)
  conversationDirector.init(bot)
  bot.startConversation(message, conversationDirector.main)
})


/********************************************************************************
 * Ye Bhardwaj Experimental school:
 *
 */

//const apiai = require('apiai')
//const apiAiService = apiai(process.env.DIALOGFLOW_API_KEY)
//
//let sessionIds = []
//const uuidv1 = require('uuid/v1');
//
//controller.hears(['^risk$'],['direct_message','direct_mention','mention', 'ambient'], function(bot,message) {
//    console.log(message.text);
//    console.log(message.type);
//    if (message.type == "direct_message") {
//        if (message.user == bot.identity.id) {
//            // message from bot can be skipped
//        }
//        else {
//            var requestText = message.text;
//            var channel = message.channel;
//            if (!(channel in sessionIds)) {
//                sessionIds[channel] = uuidv1();
//            }
//            var request = apiAiService.textRequest(requestText, { sessionId: sessionIds[channel] });
//            request.on('response', function (response) {
//                console.log(response);
//                // console.log(response.result);
//                // console.log(response.result.fulfillment.speech);
//                if (response.result) {
//                    var responseText = response.result.fulfillment.speech;
//                    if (message.text) {
//                      conversationDirector.init(bot)
//                      bot.startConversation(message, conversationDirector.main)
//                    }
//                }
//            });
//            request.on('error', function (error) {
//                console.log(error);
//            });
//            request.end();
//        }
//    }
//});
