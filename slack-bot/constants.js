exports.BETTERDOCTOR_URL = 'https://api.betterdoctor.com/2016-03-01/doctors'

// The keys below are height in feet and inches with the quotes removed.
// For example:  4'10" --> 410
//
exports.heightWeightLUT = {
  '410': [119, 142, 143, 190, 191],
  '411': [124, 147, 148, 197, 198],
  '50': [128, 152, 153, 203, 204],
  '51': [132, 157, 158, 210, 211],
  '52': [136, 163, 164, 217, 218],
  '53': [141, 168, 169, 224, 225],
  '54': [145, 173, 174, 231, 232],
  '55': [150, 179, 180, 239, 240],
  '56': [155, 185, 186, 246, 247],
  '57': [159, 190, 191, 254, 255],
  '58': [164, 196, 197, 261, 262],
  '59': [169, 202, 203, 269, 270],
  '510': [174, 208, 209, 277, 278],
  '511': [179, 214, 215, 285, 286],
  '60': [184, 220, 221, 293, 294],
  '61': [189, 226, 227, 301, 302],
  '62': [194, 232, 233, 310, 311],
  '63': [200, 239, 240, 318, 319],
  '64': [205, 245, 246, 327, 328]
}

exports.yesNoButtonActions = [{
    "name":"yes",
    "text": "Yes",
    "value": "yes",
    "style": "primary",
    "type": "button",
  },
  {
    "name":"no",
    "text": "No",
    "value": "no",
    "style": "danger",
    "type": "button",
  }
]

exports.insurers = [
  { "text": "I don't know", "value":  '*', },
  { "text": "Aetna", "value":  'aetna', },
  { "text": "Anthem", "value":  'anthem', },
  { "text": "Blue Shield of California", "value":  'blueshieldofcalifornia' },
  { "text": "Cigna", "value":  'cigna', },
  { "text": "Coventry Health Care", "value":  'coventryhealthcare', },
  { "text": "Health Net", "value":  'healthnet', },
  { "text": "Humana", "value":  'humana', },
  { "text": "Kaiser Permanente", "value":  'kaiserpermanente', },
  { "text": "MetLife", "value":  'metlife', },
  { "text": "PacificSource Health Plans", "value":  'pacificsourcehealthplans', },
  { "text": "Providence Health System", "value":  'providencehealthsystem', },
  { "text": "United Healthcare", "value":  'unitedhealthcare' }
]
