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
	var query = '?' + querystring.stringify(parameters)

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
			console.log('Department:')
			console.log(JSON.parse(content))
			signal.emit('next')
		})
	})
	req.on('error', function(e) {
		console.log(e.message)
	})

	req.end()
}

function notes() {
	var parameters = {
		notetext: 'Javascript says hi!',
	}
	var content = querystring.stringify(parameters)

	var req = https.request({
		hostname: api_hostname,
		method: 'POST',
		path: path_join(version, practiceid, '/appointments/1/notes'),
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
			console.log('Note posted:')
			console.log(JSON.parse(content))
			signal.emit('next')
		})
	})
	req.on('error', function(e) {
		console.log(e.message)
	})

	req.write(content)
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
// 7. the patient wants to see provider; find an appointment slot
// 8. book an appointment for the recorded issue
// 9. (optional?) verify the appointment

// This is one way of forcing the call order
function main() {
	var calls = [authentication, departments, notes]
//	var calls = [departments, notes]
	signal.on('next', function() {
		var nextCall = calls.shift()
		if (nextCall) {
			nextCall()
		}
	})
	signal.emit('next')
}

main()
