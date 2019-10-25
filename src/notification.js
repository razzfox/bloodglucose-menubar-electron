const { spawn } = require('child_process')
// How to use child_process:
// execFile/exec should be deprecated. it is not fully asynchronous and it will crash if the stdout buffer is bigger than 1MB. exec always spawns a shell, execFile makes a shell optional.
// fork is for running a module in another node process, and creates an IPC channel.
// spawn and spawnSync are what the other functions call to implement spawning a new process.

const notificationDisplay = (title, message) => {
  spawn('osascript', [
    '-e',
    `display notification "${message}" with title "${title}"`,
  ])
  // use terminal-notifier to change the icon
  // terminal-notifier does not work for me
  // spawn('terminal-notifier', ['-message', message, '-title', title, '-contentImage', contentImagePath, '-appIcon', appIconPath])
}

let notificationCount = 0

const skippedNotification = skips => {
  notificationCount++

  if (notificationCount > skips) notificationCount = 0

  // return true when 0
  return !notificationCount
}

const shouldNotify = (bgv, trend) => {
  // always for low
  if (bgv < 84) return true

  // only once per hour for high
  let skips = 60 / 5
  if (bgv > 180 && skippedNotification(skips)) return true

  // always on extreme trend
  if (trend === 1 || trend === 7) return true

  return false
}
