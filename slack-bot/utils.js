var fs = require('fs')

exports.initializeFirebase = function(firebaseVar) {
  if (firebaseVar.apps.length === 0) {
    if (!process.env.firebase_token_path) {
      console.log('Error: Specify slack_token_path in environment')
      process.exit(1)
    }
    fs.readFile(process.env.firebase_token_path, function (err, data) {
      if (err) {
        console.log('Error: Specify token in slack_token_path file')
        process.exit(1)
      }
      data = String(data)
      data = data.replace(/\s/g, '')
      firebaseVar.initializeApp({
        apiKey: data,
        authDomain: 'inphooddb-e0dfd.firebaseapp.com',
        databaseURL: 'https://inphooddb-e0dfd.firebaseio.com',
        projectId: 'inphooddb-e0dfd',
        storageBucket: 'inphooddb-e0dfd.appspot.com'
      })
      firebaseVar.auth().signInAnonymously()
      console.log('**************************firebase AUTH')
    }
  }
}

exports.initializeSlack = function(slackControllerVar) {
  if (!process.env.slack_token_path) {
    console.log('Error: Specify slack_token_path in environment')
    process.exit(1)
  }

  fs.readFile(process.env.slack_token_path, function (err, data) {
    if (err) {
      console.log('Error: Specify token in slack_token_path file')
      process.exit(1)
    }
    data = String(data)
    data = data.replace(/\s/g, '')
    controller
      .spawn({token: data})
      .startRTM(function (err) {
        if (err) {
          throw new Error(err)
        }
      })
  })
}
