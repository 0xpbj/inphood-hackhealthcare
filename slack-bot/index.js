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
      }
    ],
    'icon_url': 'http://lorempixel.com/48/48'
    }

  bot.reply(message, reply_with_attachments);
});


controller.hears(['^risk$'], 'direct_message, direct_mention, ambient, mention', function(bot, message) {
  const dbUserRef = firebase.database().ref('/global/diagnosisai/users/tester')
  dbUserRef.update({booz: 'passed writing here'})

  conversationDirector.init(bot)
  bot.startConversation(message, conversationDirector.main)
})
