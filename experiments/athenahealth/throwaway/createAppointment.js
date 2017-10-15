#!/usr/bin/env node

let athenahealthapi = require('./example/athenahealthapi')

let dotEnv = require('dotenv').config({path: './../../.env-production'})
let events = require('events')

// We need to save the token in an outer scope, because of callbacks.
const token = process.env.ATHENAHEALTH_TOKEN
//const token = undefined

const key = process.env.ATHENAHEALTH_API_KEY
const secret = process.env.ATHENAHEALTH_SECRET
const version = 'preview1'
const practiceid = 195900

var api = new athenahealthapi.Connection(version, key, secret, practiceid, token)
api.status.on('ready', main)
api.status.on('error', function(error) {
	console.log(error)
})

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

function log_error(error) {
	console.log(error)
	console.log(error.cause)
}

function main() {
	var signal = new events.EventEmitter

	// Scheduling an appointment:
	// (ripped from quickstart here: https://developer.athenahealth.com/io-docs)
	//
	//  1. get department id
	//
	const deptsPath = path_join(version, practiceid, '/departments')
	const parameters = {
		limit:1,
		offset:0,
		hospitalonly:false,
		providerlist:true,
		showalldepartments:true,
	}
	api.GET(deptsPath, {parameters})
	.on('done', function(response) {
		console.log('Department:')
		console.log(response)
		// TODO: handle result and signal for next operation
		// signal.emit('next')
	}).on('error', log_error)

	//  2. create a patient
	//
	//  3. get that patient
	//
	//  4. record that patient's issue
	//
	//  5. (optional?) verify the issue has been recorded
	//
	//  6. the patient wants to see provider; find an appointment slot
	//
	//  7. book an appointment for the recorded issue
	//
	//  8. (optional?) verify the appointment
	//


	return

	////////////////////////////////////////////////////////////////////////////////////////////////
	// GET without parameters
	////////////////////////////////////////////////////////////////////////////////////////////////
	api.GET('/customfields')
		.on('done', function(response) {
			console.log('Custom fields:')
			console.log(response.map(function(field, idx, arr) {
				return field.name
			}))
			console.log()
		})
		.on('error', log_error)

	////////////////////////////////////////////////////////////////////////////////////////////////
	// GET with parameters
	////////////////////////////////////////////////////////////////////////////////////////////////
	var today = new Date()
	var nextyear = new Date()
	nextyear.setFullYear(today.getFullYear() + 1)

	function formatDate(date) {
		return (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear()
	}

	api.GET('/appointments/open', {
		params: {
			departmentid: 82,
			startdate: formatDate(today),
			enddate: formatDate(nextyear),
			appointmenttypeid: 2,
			limit: 1,
		}
	}).on('done', function(response) {
		var appt = response['appointments'][0]
		console.log('Open appointment:')
		console.log(appt)
		console.log()
		signal.emit('appt', appt)
	}).on('error', log_error)

	////////////////////////////////////////////////////////////////////////////////////////////////
	// POST with parameters
	////////////////////////////////////////////////////////////////////////////////////////////////
	signal.on('appt', function(appt) {
		var patient_info = {
			lastname: 'Foo',
			firstname: 'Jason',
			address1: '123 Any Street',
			city: 'Cambridge',
			countrycode3166: 'US',
			departmentid: 1,
			dob: '6/18/1987',
			language6392code: 'declined',
			maritalstatus: 'S',
			race: 'declined',
			sex: 'M',
			ssn: '*****1234',
			zip: '02139',
		}

		api.POST('/patients', {
			params: patient_info,
		}).on('done', function(response) {
			var patient = response[0]
			var new_patient_id = patient['patientid']
			console.log('New patient id:')
			console.log(new_patient_id)
			console.log()
			signal.emit('patient', appt, patient)
		}).on('error', log_error)
	})

	////////////////////////////////////////////////////////////////////////////////////////////////
	// PUT with parameters
	////////////////////////////////////////////////////////////////////////////////////////////////
	signal.on('patient', function(appt, patient) {
		var appointment_info = {
			appointmenttypeid: 82,
			departmentid: 1,
			patientid: patient['patientid'],
		}

		api.PUT(path_join('/appointments', appt['appointmentid']), {
			params: appointment_info,
		}).on('done', function(response) {
			console.log('Response to booking appointment:')
			console.log(response)
			console.log()
			signal.emit('booked', appt)
		}).on('error', log_error)
	})
	signal.on('patient', function(appt, patient) {
		signal.emit('booked', appt)
	})

	////////////////////////////////////////////////////////////////////////////////////////////////
	// POST without parameters
	////////////////////////////////////////////////////////////////////////////////////////////////
	signal.on('booked', function(appt) {
		api.POST(path_join('/appointments', appt['appointmentid'], '/checkin'))
			.on('done', function(response) {
				console.log('Response to check-in:')
				console.log(response)
				console.log()
				signal.emit('check-in', appt)
			})
			.on('error', log_error)
	})


	////////////////////////////////////////////////////////////////////////////////////////////////
	// DELETE with parameters
	////////////////////////////////////////////////////////////////////////////////////////////////
	signal.on('patient', function(appt, patient) {
		api.DELETE(path_join('/patients', patient['patientid'], 'chartalert'), {
			params: {departmentid: 1},
		}).on('done', function(response) {
			console.log('Removed chart alert:')
			console.log(response)
			console.log()
		}).on('error', log_error)
	})


	////////////////////////////////////////////////////////////////////////////////////////////////
	// DELETE without parameters
	////////////////////////////////////////////////////////////////////////////////////////////////
	signal.on('check-in', function(appt) {
		api.DELETE(path_join('/appointments', appt['appointmentid']))
			.on('done', function(response) {
				console.log('Removed appointment:')
				console.log(response)
				console.log()
			})
			.on('error', log_error)
	})


	////////////////////////////////////////////////////////////////////////////////////////////////
	// There are no PUTs without parameters
	////////////////////////////////////////////////////////////////////////////////////////////////


	////////////////////////////////////////////////////////////////////////////////////////////////
	// Error conditions
	////////////////////////////////////////////////////////////////////////////////////////////////
	api.GET('/nothing/at/this/path')
		.on('done', function(response) {
			console.log('GET /nothing/at/this/path:')
			console.log(response)
			console.log()
		})
		.on('error', log_error)

	api.GET('/appointments/open')
		.on('done', function(response) {
			console.log('Missing parameters:')
			console.log(response)
			console.log()
		})
		.on('error', log_error)

	////////////////////////////////////////////////////////////////////////////////////////////////
	// Testing token refresh
	////////////////////////////////////////////////////////////////////////////////////////////////

	// This test takes an hour to run, so it's disabled by default. Change false to true to run it.
	if (false) {
		var token = api.getToken()

		// wait 3600 seconds = 1 hour for token to expire
		setTimeout(refresh, 3600 * 1000)

		function refresh(response) {
			console.log('Old token:', token)
			api.GET('/departments')
				.on('done', function(response) {
					console.log('New token:', api.getToken())
				})
				.on('error', function(error) {
					console.log(error)
				})
		}
	}
}
