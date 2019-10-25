const fetch = require('node-fetch')
const { Headers, Request } = fetch

const fs = require('fs')
const path = require('path')
const os = require('os')

const loginFilePath = path.join(__dirname, '..', 'dexcomShareLogin.txt')
const sessionIDFilePath = path.join(__dirname, '..', 'dexcomShareSessionID.txt')

const readFileContents = filename =>
  fs.existsSync(filename) && fs.readFileSync(filename, 'utf8')
const writeFileContents = (filename, data) =>
  fs.writeFile(filename, data, error => error && console.error(error))

const loginCredentials =
  readFileContents(loginFilePath).split(os.EOL) ||
  console.error('no login credentials')
const accountName = loginCredentials[0]
const password = loginCredentials[1]
const transmitterSerialNumber = loginCredentials[2]

const loginBody = JSON.stringify({
  accountName,
  applicationId: 'd8665ade-9673-4e27-9ff6-92db4ce13d13',
  password,
})

let sessionID = process.argv[2] || readFileContents(sessionIDFilePath)

// Using private API is easier because it does not expire tokens: I use my own credentials
const hostLocation = 'https://share1.dexcom.com/'
const loginLocation = new URL(
  '/ShareWebServices/Services/General/LoginPublisherAccountByName',
  hostLocation
)

// query string search parameters: sessionID
const isSessionValidLocation = new URL(
  '/ShareWebServices/Services/Publisher/IsRemoteMonitoringSessionActive',
  hostLocation
)
isSessionValidLocation.searchParams.append('sessionID', sessionID)

// query string search parameters: sessionID, transmitterSerialNumber
const startSessionLocation = new URL(
  '/ShareWebServices/Services/Publisher/StartRemoteMonitoringSession',
  hostLocation
)
startSessionLocation.searchParams.append('sessionID', sessionID)
startSessionLocation.searchParams.append(
  'transmitterSerialNumber',
  transmitterSerialNumber
)

// most recent BGV. 1440min = 24hr
const minutes = 120
const maxCount = 100
// query string search parameters: sessionID, minutes, maxCount
const readBGVLocation = new URL(
  '/ShareWebServices/Services/Publisher/ReadPublisherLatestGlucoseValues',
  hostLocation
)
readBGVLocation.searchParams.append('sessionID', sessionID)
readBGVLocation.searchParams.append('minutes', minutes)
readBGVLocation.searchParams.append('maxCount', maxCount)

const shareAPILocations = [
  isSessionValidLocation,
  startSessionLocation,
  readBGVLocation,
]

// all requests use 'method: POST', this is to be explicit that they all should remain identical, and that 'method: POST' in JSON
const method = 'POST'

const headers = new Headers({
  Accept: 'application/json',
  'User-Agent': 'Dexcom%20Share/3.0.2.11 CFNetwork/672.0.2 Darwin/14.0.0',
  'Content-Type': 'application/json',
})
// include content-type in all headers because it doesn't break and its more convenient
// headers.append('Content-Type', 'application/json')

const loginShareSession = () =>
  fetch(
    new Request(loginLocation, {
      method,
      headers,
      body: loginBody,
    })
  )
    .then(res => res.ok && res.text())
    .then(res => {
      // sessionID in quotes, no JSON
      sessionID = res.slice(1, -1)

      // set sessionID
      shareAPILocations.forEach(url =>
        url.searchParams.set('sessionID', sessionID)
      )

      writeFileContents(sessionIDFilePath, sessionID)

      // start the session
      startShareSession()
      console.warn('Starting session')
    })
    .catch(catchError)

const startShareSession = () =>
  fetch(
    new Request(startSessionLocation, {
      method,
      headers,
    })
  )
    .then(isSessionValid)
    .catch(loginShareSession)

const isSessionValid = () =>
  fetch(
    new Request(isSessionValidLocation, {
      method,
      headers,
    })
  )
    .then(res => {
      // Success: 200 and 'true' or 'false'
      // Error: 500 and JSON Code: 'SessionIdNotFound', or 400 and HTML
      if (res.ok && res) {
        return true
      } else {
        console.error('Must log in')
        loginShareSession()
      }
    })
    .catch(error => {
      // try again if address is not found (network connection may need to wake up)
      if (error.code === 'ENOTFOUND') {
        console.error('No network')

        setTimeout(isSessionValid, 3000)
      }

      // print error
      catchError(error)
    })

const catchError = error => {
  if (error instanceof Error) {
    console.error(`Caught Error: ${error.message}`)
    return
  }

  return error.json().then(responseJson => {
    console.error(
      `HTTP ${error.status} ${error.statusText}: ${responseJson.msg}`
    )

    return {
      error: new Error(
        `HTTP ${error.status} ${error.statusText}: ${responseJson.msg}`
      ),
    }
  })
}

const parseTrend = trend => {
  const signalLoss = '📴'
  const noConnection = '🌐🌈⃠'
  const arrowEmoji = [
    '🆖',
    '⬆️',
    '↗️',
    '⤴️',
    '➡️',
    '⤵️',
    '↘️',
    '⬇️',
    '🔃',
    '🚫',
  ]
  const trendIcon = ['🌈', '👋🏻', '🎢', '🛫', '💚', '🛬', '❗', '🆘', '💫', '📴']
  return arrowEmoji[trend]
}

const parseDateFromString = dateString => {
  // DT, ST, WT: '/Date(1559280606000-0700)/'
  dateString = dateString.slice(6, -7)

  // parse time
  // Note: date must be initialized to zero, then set time to milliseconds after
  const time = new Date(0)
  time.setUTCMilliseconds(dateString)
  return time
}

const startBGV = {
  bgv: '---',
  trend: parseTrend(0),
  dateTime: new Date(),
  data: [],
}

const readBGV = async () =>
  fetch(
    new Request(readBGVLocation, {
      method,
      headers,
    })
  )
    .then(res => res.json())
    .then(data => {
      if (!data[0] || !data[0].Value) {
        throw new Error(data)
      }
      // extract data from response
      const bgv = data[0].Value
      const trend = parseTrend(data[0].Trend)
      const dateTime = parseDateFromString(data[0].DT)

      // bgv
      return {
        bgv,
        trend,
        dateTime,
        data,
      }
    })
// replace this with async try/catch
// .catch(catchError)

module.exports = {
  isSessionValid,
  parseDateFromString,
  startBGV,
  readBGV,
}
