var requestPromise = require('request-promise')
var constants = require('./constants.js')


// TODO: aggregate these into a user struct that can be serialized and
//       pushed to firebase in encrypted form.
//
var age = "";
var sex = "";
var fam = "";
var hbp = "";
var phy = "";
var hgt = "";
var wgt = "";
var zip = "";
var score = 0;
var docs = [];
var insuranceType = "";
var results = [];
var type = "";


var bot = undefined



// TODO: AC look at refactoring this to another file.
//       - Problem is access of global docs
//       - Probably want to aggregate docs and others in a single container /
//       struct / class
//
function doctorSearch(location, radius, limit, type, callback) {
  const api_key = process.env.BETTERDOCTOR_COM_API_KEY
  const base_url = constants.BETTERDOCTOR_URL
  const resource_url = base_url + '?location='+location+','+radius+'&skip=2&limit='+limit+'&user_key=' + api_key;
  
  console.log('doctorSearch:')
  console.log('   api_key = ' + api_key)
  console.log('   url =     ' + resource_url)
  console.log()

  var bdOpts = {
    uri: resource_url,
    specialty_uid: type,
    method: 'GET',
    json: true,
    resolveWithFullResponse: true
  }
  let retInfo = "";
  requestPromise(bdOpts)
  .then(data => {
    // console.log(data.body)
    console.log('doctorSearch results')
    console.log('')
    console.log('data.body.meta')
    console.log('- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ')
    console.log(data.body.meta)
    console.log('')
    console.log('data.body.data[]')
    console.log('- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ')
    let bounce = 0
    for (let dataNode of data.body.data) {
      let iretInfo = ''
      bounce++
      if (bounce > 3) {
        break
      }
      const profile = dataNode.profile
      const specialties = dataNode.specialties
      const practices = dataNode.practices  // array of location objects
      const insurances = dataNode.insurances  // array of {plan: provider}
      
      console.log('   -----')
      console.log(dataNode)
      console.log('   -----')

      console.log(profile.first_name + ' ' + profile.middle_name + ' ' + profile.last_name)
      iretInfo += profile.first_name + ' ' + profile.middle_name + ' ' + profile.last_name + '\n'
      // profile has property image_url

      console.log('   -----')
      iretInfo += '   -----\n'
      console.log('   -----')
      iretInfo += '   -----\n'
      let dist = ''
      for (let practice of practices) {
        console.log('   ' + practice.name + ' (' + practice.distance + ' miles)')
        iretInfo += '   ' + practice.name + ' (' + Math.round(practice.distance) + ' miles)\n'
        dist = Math.round(practice.distance)
      }
      // {
      //     "name":"yes",
      //     "text": "Yes",
      //     "value": "yes",
      //     "style": "default",
      //     "type": "button",
      // }
      let dstr = profile.first_name + ' ' + profile.last_name + ' (' + dist + ' miles)'
      let clinic = 'Dr. ' + profile.first_name + ' ' + profile.last_name
      docs.push({
        name: "doctorpractice",
        text: dstr,
        value: clinic,
        style: "default",
        type: "button"
      })
      console.log('   -----')
      iretInfo += '   -----\n'
      let count = 0
      for (let insurance of insurances) {
        count++
        if (count > 3) {
          console.log('   ...')
          iretInfo += '   ...\n'
          break
        }

        // console.log('   insurance_plan:')
        // for (let propName in insurance.insurance_plan) {
        //   console.log('   ' + propName + ': ' + insurance.insurance_plan[propName])
        // }
        // console.log('   insurance_provider:')
        // for (let propName in insurance.insurance_provider) {
        //   console.log('   ' + propName + ': ' + insurance.insurance_provider[propName])
        // }
        console.log('   ' + insurance.insurance_plan.name + ' ('+ insurance.insurance_provider.name +')')
        iretInfo += '   ' + insurance.insurance_plan.name + ' ('+ insurance.insurance_provider.name +')\n'

      }
      console.log('')
      if (iretInfo)
        retInfo += iretInfo
    }

    callback(retInfo);
  })
  .catch(error => {
    console.log('error', error)
    return
  })
}


// TODO:  AC Move this to a risk test specific js file
//
function getHeightWeightScore(height, weight) {
  console.log('getHeightWeightScore:')
  if (!height || !weight) {
    console.log('  returning -1: height or weight undefined/null/etc.')
    return -1
  }

  // TODO: put this in a single one liner regex w/ character classes
  let fixQuotesHeight = height.replace('’', '')
  fixQuotesHeight = fixQuotesHeight.replace('\'', '')
  fixQuotesHeight = fixQuotesHeight.replace('”', '')
  fixQuotesHeight = fixQuotesHeight.replace('"', '')
  fixQuotesHeight = fixQuotesHeight.replace(' ', '')

  if (!(fixQuotesHeight in constants.heightWeightLUT)) {
    console.log('  returning -1: fixQuotesHeight('+fixQuotesHeight+') not in heightWeightLUT')
    return -1
  }

  console.log('  fixQuotesHeight:' + fixQuotesHeight)
  console.log('  weight:'+weight)
  const boundsArr = constants.heightWeightLUT[fixQuotesHeight]
  if (weight >=  boundsArr[0] && weight <= boundsArr[1]) {
    return 1
  } else if (weight >= boundsArr[2] && weight <= boundsArr[3]) {
    return 2
  } else if (weight >= boundsArr[4]) {
    return 3
  }
  return 0
}

// TODO: must call this before calling main below.
//       It initializes the bot global var for use
//       in main.
exports.init = function(aBot) {
  console.log('conversation director init')
  bot = aBot
}

exports.main = function(err, convo) {
  //END THE CONVERSATION
  convo.addMessage({
      text: 'Ok...let\'s try another time'
  }, 'end_convo');

  //CONFIRM START
  convo.addQuestion({
      text: 'Welcome to the pre / type 2 diabetes risk assessment.',
      attachments:[
          {
              title: 'Do you want to proceed?',
              callback_id: '1',
              attachment_type: 'default',
              actions: constants.yesNoButtonActions
          }
      ]
  },[
      {
          pattern: "yes",
          callback: function(response, convo) {
              convo.gotoThread('get_age');
          },
      },
      {
          pattern: "no",
          callback: function(response, convo) {
              convo.gotoThread('end_convo');
          },
      },
      // TODO: AC: Remove pattern 'ac' when releasing (this is a debug shortcut)
      {
          pattern: "ac",
          callback: function(response, convo) {
              convo.gotoThread('get_zipcode');
          },
      },
      {
          default: true,
          callback: function(response, convo) {
              convo.repeat();
              convo.next();
          }
      }
  ], {}, 'default');

  //GET THE AGE FROM THE USER
  convo.addQuestion({
      attachments:[
          {
              title: 'Pick your age range',
              callback_id: '9',
              attachment_type: 'default',
              actions: [
                  {
                      "name":"40",
                      "text": "10 - 39",
                      "value": "38",
                      "style": "default",
                      "type": "button",
                  },
                  {
                      "name":"50",
                      "text": "40 - 49",
                      "value": "45",
                      "style": "default",
                      "type": "button",
                  },
                  {
                      "name":"60",
                      "text": "50 - 59",
                      "value": "55",
                      "style": "default",
                      "type": "button",
                  },
                  {
                      "name":"70",
                      "text": "60+",
                      "value": "70",
                      "style": "default",
                      "type": "button",
                  }
              ]
          }
      ]
  },[
      {
          pattern: /[0-9]+/g,
          callback: function(response, convo) {
              age = response.text
              console.log('AGE;', age)
              if (age >= 40 && age <= 49) {
                  score += 1
              } else if (age >= 50 && age <= 59) {
                  score += 2
              } else if (age >= 60) {
                  score += 3
              }
              convo.gotoThread('get_sex');
          }
      },
      {
          pattern: bot.utterances.quit,
          callback: function(response, convo) {
              convo.gotoThread('end_convo');
          }
      },
      {
          default: true,
          callback: function(response, convo) {
              convo.repeat();
              convo.next();
          }
      }
  ], {}, 'get_age');

  //GET THE SEX FROM THE USER
  convo.addQuestion({
      attachments:[
          {
              title: 'Male or Female?',
              callback_id: '2',
              attachment_type: 'default',
              actions: [
                  {
                      "name":"male",
                      "text": "Male",
                      "value": "male",
                      "style": "default",
                      "type": "button",
                  },
                  {
                      "name":"female",
                      "text": "Female",
                      "value": "female",
                      "style": "default",
                      "type": "button",
                  }
              ]
          }
      ]
  },[
      {
          pattern: "male",
          callback: function(response, convo) {
              sex = response.text.toLowerCase()
              console.log('male', sex)
              score += 1
              if (sex === 'male')
                  convo.gotoThread('get_family');
              else
                  convo.gotoThread('get_gestational');
          }
      },
      {
          pattern: bot.utterances.quit,
          callback: function(response, convo) {
              convo.gotoThread('end_convo');
          }
      },
      {
          default: true,
          callback: function(response, convo) {
              convo.repeat();
              convo.next();
          }
      }
  ], {}, 'get_sex');

  //GET THE GESTATIONAL INFO FROM THE FEMALE USER
  convo.addQuestion({
      attachments:[
          {
              title: 'Have you ever been diagnosed with gestational diabetes?',
              callback_id: '3',
              attachment_type: 'default',
              actions: constants.yesNoButtonActions
          }
      ]
  },[
      {
          pattern: "yes",
          callback: function(response, convo) {
              fam = response.text
              score += 1
              convo.gotoThread('get_family');
          },
      },
      {
          pattern: "no",
          callback: function(response, convo) {
              convo.gotoThread('get_family');
          },
      },
      {
          pattern: bot.utterances.quit,
          callback: function(response, convo) {
              convo.gotoThread('end_convo');
          }
      },
      {
          default: true,
          callback: function(response, convo) {
              convo.repeat();
              convo.next();
          }
      }
  ], {}, 'get_gestational');

  //GET THE FAMIILY HISTORY
  convo.addQuestion({
      attachments:[
          {
              title: 'Do you have a mother, father, sister, or brother with diabetes?',
              callback_id: '4',
              attachment_type: 'default',
              actions: constants.yesNoButtonActions
          }
      ]
  },[
      {
          pattern: "yes",
          callback: function(response, convo) {
              fam = response.text
              score += 1
              convo.gotoThread('get_bp');
          },
      },
      {
          pattern: "no",
          callback: function(response, convo) {
              convo.gotoThread('get_bp');
          },
      },
      {
          pattern: bot.utterances.quit,
          callback: function(response, convo) {
              convo.gotoThread('end_convo');
          }
      },
      {
          default: true,
          callback: function(response, convo) {
              convo.repeat();
              convo.next();
          }
      }
  ], {}, 'get_family');

  //GET THE BLOOD PRESSURE
  convo.addQuestion({
      attachments:[
          {
              title: 'Have you ever been diagnosed with high blood pressure?',
              callback_id: '5',
              attachment_type: 'default',
              actions: constants.yesNoButtonActions
          }
      ]
  },[
      {
          pattern: "yes",
          callback: function(response, convo) {
              hbp = response.text
              score += 1
              convo.gotoThread('get_physical_activity');
          },
      },
      {
          pattern: "no",
          callback: function(response, convo) {
              hbp = response.text
              convo.gotoThread('get_physical_activity');
          },
      },
      {
          pattern: bot.utterances.quit,
          callback: function(response, convo) {
              convo.gotoThread('end_convo');
          }
      },
      {
          default: true,
          callback: function(response, convo) {
              convo.repeat();
              convo.next();
          }
      }
  ],{}, 'get_bp');

  //GET THE PHYSICAL ACTIVITY
  convo.addQuestion({
      attachments:[
          {
              title: 'Are you physically active?',
              callback_id: '6',
              attachment_type: 'default',
              actions: constants.yesNoButtonActions
          }
      ]
  },[
      {
          pattern: "yes",
          callback: function(response, convo) {
              phy = response.text
              convo.gotoThread('get_height');
          },
      },
      {
          pattern: "no",
          callback: function(response, convo) {
              phy = response.text
              score += 1
              convo.gotoThread('get_height');
          },
      },
      {
          pattern: bot.utterances.quit,
          callback: function(response, convo) {
              convo.gotoThread('end_convo');
          }
      },
      {
          default: true,
          callback: function(response, convo) {
              convo.repeat();
              convo.next();
          }
      }
  ],{}, 'get_physical_activity');

  //GET THE HEIGHT
  convo.addQuestion('What is your height? (e.g.: 5 0  or  5\'0")',[
      {
          pattern: '.*',
          callback: function(response, convo) {
              hgt = response.text
              convo.gotoThread('get_weight');
          },
      },
      {
          pattern: bot.utterances.quit,
          callback: function(response, convo) {
              convo.gotoThread('end_convo');
          }
      },
      {
          default: true,
          callback: function(response, convo) {
              convo.repeat();
              convo.next();
          }
      }
  ],{}, 'get_height');

  //GET THE WEIGHT
  convo.addQuestion('What is your weight in pounds? (e.g.: 185)',[
      {
          pattern: /[0-9]+/g,
          callback: function(response, convo) {
              wgt = response.text
              score += getHeightWeightScore(hgt, wgt)
              if (score < 5) {
                  convo.gotoThread('notdiabetic');
              }
              else {
                  convo.gotoThread('diabetic')
              }
          },
      },
      {
          pattern: bot.utterances.quit,
          callback: function(response, convo) {
              convo.gotoThread('end_convo');
          }
      },
      {
          default: true,
          callback: function(response, convo) {
              convo.repeat();
              convo.next();
          }
      }
  ],{}, 'get_weight');

  //GET DIABETES HELP
  convo.addQuestion({
      text: 'From your answers, it appears you are at increased risk of having Type 2 Diabetes.',
      attachments:[
          {
              title: 'Would you like us to find a clinic for a HBA1C test?',
              callback_id: '7',
              attachment_type: 'default',
              actions: constants.yesNoButtonActions
          }
      ]
  },[
      {
          pattern: "yes",
          callback: function(response, convo) {
              convo.gotoThread('get_zipcode');
          },
      },
      {
          pattern: "no",
          callback: function(response, convo) {
              convo.gotoThread('finish');
          },
      },
      {
          pattern: bot.utterances.quit,
          callback: function(response, convo) {
              convo.gotoThread('end_convo');
          }
      },
      {
          default: true,
          callback: function(response, convo) {
              convo.repeat();
              convo.next();
          }
      }
  ],{}, 'diabetic');

  //GET USER ZIPCODE
  convo.addQuestion('What is your zipcode? (e.g. 94502)',[
      {
          pattern: /[0-9]+/g,
          callback: function(response, convo) {
              zip = response.text
              var zipcodes = require('zipcodes');
              var location = zipcodes.lookup(zip)
              var locStr = location.latitude.toString() + ',' + location.longitude.toString()
              doctorSearch(locStr, 25, 10, type, function(response){
                  // convo.say(response); // add another reply
                  convo.setVar('results',response);
                  convo.gotoThread('get_insur')
              });
          },
      },
      {
          pattern: bot.utterances.quit,
          callback: function(response, convo) {
              convo.gotoThread('end_convo');
          }
      },
      {
          default: true,
          callback: function(response, convo) {
              convo.repeat();
              convo.next();
          }
      }
  ],{}, 'get_zipcode');

  convo.addQuestion({
      "response_type": "in_channel",
      "attachments": [
          {
              "text": "Who is your insurance provider?",
              "color": "#3AA3E3",
              "attachment_type": "default",
              "callback_id": "insurance_provider",
              "actions": [
              {
                "name": "games_list",
                "text": "Pick one",
                "type": "select",
                "options": constants.insurers
              }
            ]
          }
      ]
  },[
      {
          pattern: /[A-Za-z\. ]+/g,
          callback: function(response, convo) {
              insuranceType = response.text
              convo.gotoThread('get_docs');
          },
      },
      {
          pattern: bot.utterances.quit,
          callback: function(response, convo) {
              convo.gotoThread('end_convo');
          }
      },
      {
          default: true,
          callback: function(response, convo) {
              convo.repeat();
              convo.next();
          }
      }
  ],{}, 'get_insur');

  convo.addQuestion({
      attachments:[
          {
              title: 'Here are the nearest doctors available',
              callback_id: '17',
              attachment_type: 'default',
              actions: docs
          }
      ]
  },[
      {
          pattern: /[A-Za-z\. ]+/g,
          callback: function(response, convo) {
              console.log('RESPO', response.text)
              convo.gotoThread('list_practice');
          },
      },
      {
          pattern: bot.utterances.quit,
          callback: function(response, convo) {
              convo.gotoThread('end_convo');
          }
      },
      {
          default: true,
          callback: function(response, convo) {
              convo.repeat();
              convo.next();
          }
      }
  ],{}, 'get_docs');

  convo.addQuestion(
    {
      text: "Great! You can make an appointement with Dr. <TODO: name> by " +
             "calling <TODO: number>. Would you like to help make California " +
             "even healthier?"
    }, 
    [
      {
        default: true,
        callback: function(response, convo) {
          convo.gotoThread('finish');
        }
      }
    ],
    {},
    'list_practice'
  );

  convo.addMessage({text: 'Congratulations! From the answers you provided, it does not appear that you are at increased risk for having Type 2 Diabetes.'}, 'notdiabetic')
  convo.addMessage({text: 'Help us spread the word about Type 2 Diabetes! Share the chatbot with your friends and family 🎁!'},'finish');
}
