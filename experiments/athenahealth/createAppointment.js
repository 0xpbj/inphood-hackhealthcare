#!/usr/bin/env node

let dotEnv = require('dotenv').config({path: './../../.env-production'})
let events = require('events')
let https = require('https')
let querystring = require('querystring')

const key = process.env.ATHENAHEALTH_API_KEY
const secret = process.env.ATHENAHEALTH_SECRET
const version = 'preview1'
const practiceid = 195900

const auth_prefixes = {
	v1: '/oauth',
	preview1: '/oauthpreview',
	openpreview1: '/oauthopenpreview',
}

const api_hostname = 'api.athenahealth.com'

// This is a useful function to have
function path_join() {
	// trim slashes from arguments, prefix a slash to the beginning of each, re-join (ignores empty parameters)
	var args = Array.prototype.slice.call(arguments, 0)
	var nonempty = args.filter(function(arg, idx, arr) {
		return typeof(arg) != 'undefined'
	})
	var trimmed = nonempty.map(function(arg, idx, arr) {
		return '/' + String(arg).replace(new RegExp('^/+|/+$'), '')
	})
	return trimmed.join('')
}


// Since we want these functions to run in a set order, we need a way to signal for the next one.
var signal = new events.EventEmitter

// We need to save the token in an outer scope, because of callbacks.
var token = process.env.ATHENAHEALTH_TOKEN
//var token = undefined


function authentication() {
  // TODO: token needs to be updated once per hour or you'll get a 401 error
  // repsonse. Getting it for every API call will result in getting locked out.
  //
  if (token) {
    console.log('Using athenahealth token from env file: \'' + token + '\'')
    console.log('   If you see "<h1>Developer Inactive</h1>" then refresh the token.')
		signal.emit('next')
  } else {
    var req = https.request({
      // Set up the request, making sure the content-type header is set. Let the https library do
      // the auth header (including base64 encoding) for us.
      hostname: api_hostname,
      method: 'POST',
      path: path_join(auth_prefixes[version], '/token'),
      auth: key + ':' + secret,
      headers: {'content-type': 'application/x-www-form-urlencoded'},
    }, function(response) {
      response.setEncoding('utf8')
      var content = ''
      response.on('data', function(chunk) {
        content += chunk
      })
      response.on('end', function() {
        var authorization = JSON.parse(content)
        // Save the token!
        token = authorization.access_token
        console.log(token)
        signal.emit('next')
      })
    })

    req.on('error', function(e) {
      console.log(e.message)
    })

    // The one parameter required for OAuth
    req.write(querystring.stringify({grant_type: 'client_credentials'}))
    req.end()
  }
}


function departments() {
	// Create and encode parameters
	const parameters = {
    limit:1,
    offset:0,
    hospitalonly:false,
    providerlist:true,
    showalldepartments:true,
	}
	const query = '?' + querystring.stringify(parameters)

  const deptsPath = path_join(version, practiceid, '/departments') + query
  console.log('deptsPath: \'' + deptsPath + '\'')

	var req = https.request({
		hostname: api_hostname,
		method: 'GET',
		path: deptsPath,
		// We set the auth header ourselves this time, because we have a token now.
		headers: {'authorization': 'Bearer ' + token},
	}, function(response) {
		response.setEncoding('utf8')
		var content = ''
		response.on('data', function(chunk) {
			content += chunk
		})
		response.on('end', function() {
			console.log('Departments:')
			const departmentData = JSON.parse(content)
			// console.log(departmentData)
			for (let department of departmentData.departments) {
				console.log('   departmentid:' + department.departmentid)
				console.log('   ' + department.providergroupname)
				console.log('   ' + department.name)
				console.log('   ' + department.phone)
				console.log('   ' + department.address)
				console.log('   ' + department.city + ', ' + department.state)
				console.log('   ' + department.zip)
				console.log()
				appointmentData.departmentid = department.departmentid
			}
			signal.emit('next')
		})
	})
	req.on('error', function(e) {
		console.log(e.message)
	})

	req.end()
}

// Patients we've created:
//  30836, 30837
function createPatient() {
	let parameters = {
		departmentid:appointmentData.departmentid,
		dob:'1/1/1970',
		firstname:'Jason',
		homephone:'408-746-8488',
		lastname:'Foo'
	}
	const content = querystring.stringify(parameters)

	const patientsPath = path_join(version, practiceid, '/patients')
	console.log('patientsPath: \'' + patientsPath + '\'')

	var req = https.request({
		hostname: api_hostname,
		method: 'POST',
		path: patientsPath,
		headers: {
			'authorization': 'Bearer ' + token,
			'content-type': 'application/x-www-form-urlencoded',
			'content-length': content.length, // apparently we have to set this ourselves when using
											                  // application/x-www-form-urlencoded
		},
	}, function(response) {
		response.setEncoding('utf8')
		var content = ''
		response.on('data', function(chunk) {
			content += chunk
		})
		response.on('end', function() {
			console.log('Patient added:')
			const patientData = JSON.parse(content)
			console.log(patientData)
			appointmentData.patientid = patientData[0].patientid

			signal.emit('next')
		})
	})
	req.on('error', function(e) {
		console.log(e.message)
	})

	req.write(content)
	req.end()
}

// MUST CALL 'departments' BEFORE CALLING 'recordPatientIssue'
// (It populates appointmentData.departmentid)
//
// Issue codes (snomed):
//
// 43396009:  Hemoglobin A1c measurement (procedure)
//    (https://phinvads.cdc.gov/vads/http:/phinvads.cdc.gov/vads/ViewCodeSystemConcept.action?oid=2.16.840.1.113883.6.96&code=43396009)
// 15777000:  Prediabetes (disorder)
//    (https://phinvads.cdc.gov/vads/http:/phinvads.cdc.gov/vads/ViewCodeSystemConcept.action?oid=2.16.840.1.113883.6.96&code=15777000)
// 44054006:  Diabetes mellitus type 2 (disorder)
//    (https://phinvads.cdc.gov/vads/http:/phinvads.cdc.gov/vads/ViewCodeSystemConcept.action?oid=2.16.840.1.113883.6.96&code=44054006)
//
// https://www.nlm.nih.gov/research/umls/Snomed/snomed_browsers.html
//
function recordPatientIssue() {
	let parameters = {
		departmentid:appointmentData.departmentid,
		snomedcode:43396009
	}
	const content = querystring.stringify(parameters)

	let patientid = appointmentData.patientid ?
		appointmentData.patientid : 30837

	const problemsPath = path_join(
		version, practiceid, 'chart', patientid, 'problems')

	console.log('problemsPath: \'' + problemsPath + '\'')

	var req = https.request({
		hostname: api_hostname,
		method: 'POST',
		path: problemsPath,
		headers: {
			'authorization': 'Bearer ' + token,
			'content-type': 'application/x-www-form-urlencoded',
			'content-length': content.length, // apparently we have to set this ourselves when using
											                  // application/x-www-form-urlencoded
		},
	}, function(response) {
		response.setEncoding('utf8')
		var content = ''
		response.on('data', function(chunk) {
			content += chunk
		})
		response.on('end', function() {
			console.log('Patient problem added:')
			const patientProblemData = JSON.parse(content)
			console.log(patientProblemData)
			signal.emit('next')
		})
	})
	req.on('error', function(e) {
		console.log(e.message)
	})

	req.write(content)
	req.end()
}

function findAppointmentSlots() {
	// Create and encode parameters
	const parameters = {
		appointmenttypeid:appointmentData.appointmenttypeid,
		departmentid:appointmentData.departmentid,
		providerid:appointmentData.providerid,
		ignoreschedulablepermission:false,
		limit:5,
		offset:0,
		startdate:'10/14/2017',
		enddate:'10/21/2017'
	}
	const query = '?' + querystring.stringify(parameters)

  const aptsPath = path_join(version, practiceid, 'appointments', 'open') + query
  console.log('aptsPath: \'' + aptsPath + '\'')

	var req = https.request({
		hostname: api_hostname,
		method: 'GET',
		path: aptsPath,
		// We set the auth header ourselves this time, because we have a token now.
		headers: {'authorization': 'Bearer ' + token},
	}, function(response) {
		response.setEncoding('utf8')
		var content = ''
		response.on('data', function(chunk) {
			content += chunk
		})
		response.on('end', function() {
			console.log('Appointments:')
			const apptData = JSON.parse(content)

			console.log(apptData.totalcount + ' appointments found.')

			for (let appointment of apptData.appointments) {
				console.log('   appointmentid:' + appointment.appointmentid)
				console.log('   ' + appointment.starttime + ' ' + appointment.date)
				console.log('   ' + appointment.duration + ' minutes')
				console.log()
			}
			signal.emit('next')
		})
	})
	req.on('error', function(e) {
		console.log(e.message)
	})

	req.end()
}

function scheduleAppointment() {
	let patientid = appointmentData.patientid ?
		appointmentData.patientid : 30837

	// Create and encode parameters
	let parameters = {
		appointmenttypeid:appointmentData.appointmenttypeid,
		patientid:patientid,
		ignoreschedulablepermission:false
	}
	const query = '?' + querystring.stringify(parameters)

	let appointmentid = appointmentData.appointmentid ?
		appointmentData.appointmentid : 883988

	const apptPath = path_join(
		version, practiceid, 'appointments', appointmentid) + query
	console.log('apptPath: \'' + apptPath + '\'')

	var req = https.request({
		hostname: api_hostname,
		method: 'PUT',
		path: apptPath,
		headers: {
			'authorization': 'Bearer ' + token
		},
	}, function(response) {
		response.setEncoding('utf8')
		var content = ''
		response.on('data', function(chunk) {
			content += chunk
		})
		response.on('end', function() {
			console.log('Patient appointment scheduled:')
			const apptData = JSON.parse(content)
			console.log(apptData)
			signal.emit('next')
		})
	})
	req.on('error', function(e) {
		console.log(e.message)
	})

	// req.write(content)
	req.end()
}

// Scheduling an appointment:
// (ripped from quickstart here: https://developer.athenahealth.com/io-docs)
// 1. get practice id
// 2. get department id
// 3. create a patient
// 4. get that patient
// 5. record that patient's issue
// 6. (optional?) verify the issue has been recorded
//   TODO: provider linkage?
//         Observation: the providerid controls the available appointments (along
//                      with the appointment types--i.e. a GP isn't doing lab
//                      testing etc.)
// 7. the patient wants to see provider; find an appointment slot
// 8. book an appointment for the recorded issue
// 9. (optional?) verify the appointment

// var appointmentData = {
// 	practiceid: practiceid,
// 	departmentid: undefined,
// 	patientid: undefined
// }

// Spoofed:
// Can use get providers (takes practiedid) to get this--71 seems to always have
// office visit appointments.
// Appointmenttypeid 2, 82 and 683 work so far.
var appointmentData = {
	practiceid: practiceid,
	departmentid: 1,
	patientid: 30837,
	providerid: 71,
	appointmenttypeid: 82,
	appointmentid:883988
}

// This is one way of forcing the call order
function main() {
// var calls = [authentication, departments, createPatient, recordPatientIssue findAppointmentSlots]
	let calls = [findAppointmentSlots, scheduleAppointment]
	signal.on('next', function() {
		var nextCall = calls.shift()
		if (nextCall) {
			nextCall()
		}
	})
	signal.emit('next')
}

main()
