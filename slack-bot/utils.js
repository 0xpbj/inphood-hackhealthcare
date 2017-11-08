exports.initializeFirebase = function(firebaseVar) {
  if (firebaseVar.apps.length === 0) {
    firebaseVar.initializeApp({
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    })
    firebaseVar.auth().signInAnonymously()
    console.log('**************************firebase AUTH')
  }
}

exports.initializeSlack = function(slackControllerVar) {
  if (!process.env.SLACK_TOKEN) {
    console.log('Error: Specify slack_token_path in environment')
    process.exit(1)
  } else {
    slackControllerVar
    .spawn({token: process.env.SLACK_TOKEN})
    .startRTM(function (err) {
      if (err) {
        throw new Error(err)
      }
    })
  }
}
