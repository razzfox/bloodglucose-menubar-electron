const { app, Menu, MenuItem, Tray } = require('electron')

module.exports.createTray = (data, icon, bgvPlot) => {
  if (!data) throw new Error('No data')
  const time = data.dateTime.toLocaleString()
  const title = `${data.bgv}${data.trend}`

  var tray = new Tray(icon)
  // var tray = new Tray(null)
  tray.setTitle(title)
  tray.setToolTip(time)

  // click(menuItem, browserWindow, event)
  const menu = Menu.buildFromTemplate([
    { id: 'time', label: time, type: 'normal' },
    {
      id: 'bgvPlot',
      label: '',
      type: 'normal',
      icon: bgvPlot,
    },
    { id: 'separator', label: 'Item1', type: 'separator' },
    { id: 'quit', label: 'Quit', click: app.quit },
  ])

  // menu.insert(
  //   1,
  //   new MenuItem({
  //     id: 'graph',
  //     label: '',
  //     type: 'normal',
  //     icon: bgvPlot,
  //   })
  // )

  tray.setContextMenu(menu)

  // console.log(data)
  // console.log(tray)

  // menu.getMenuItemById('graph').icon = path.join(
  //   assetsDirectory,
  //   'electron.png'
  // )

  // menu.items[1].icon = path.join(assetsDirectory, 'bgvPlot.png')

  // tray.setContextMenu(menu)
}
