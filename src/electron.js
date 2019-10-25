const { app } = require('electron')
const { isSessionValid, startBGV, readBGV } = require('./bgAPI.js')
const { createPlotImage } = require('./drawBG.js')
const { createTray } = require('./tray.js')

const path = require('path')
const assetsDirectory = path.join(__dirname, '..', 'assets')
const icon = path.join(assetsDirectory, 'electron.png')
const bgvPlot = path.join(assetsDirectory, 'bgvPlot.png')


const main = async () => {
  try {
    if (await isSessionValid()) {
      var data = (await readBGV()) || startBGV

      createPlotImage(data.data, bgvPlot, ()=>createTray(data, icon, bgvPlot))
  }

    // Jimp does not return a promise. Only callbacks.
    // createPlotImage(data.data, image =>
    //   image.write(bgvPlot, error => {
    //     if (error) throw error
    //     console.log('finished')
    //   })
    // )
    // macOS notification
    // if (shouldNotify(bgv, trend)) notificationDisplay(title, time)
  } catch (e) {
    console.error(e)
  }
}

// Don't show the app in the dock
app.dock.hide()

// app.on('ready', main)
app.on('ready', ()=>{main(); setTimeout(main, 5*60*1000)})
