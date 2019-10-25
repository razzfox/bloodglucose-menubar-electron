const Jimp = require('jimp')
const { parseDateFromString } = require('./bgAPI.js')

// Note: image is drawn reversed and inverted to simplify the x,y mapping
const createPlotImage = (data, filePath, callback) =>
  new Jimp(256, 256, (err, image) => {
    if (err) throw err

    // every pixel is set to 0x00000000
    // scan(x, y, w, h, func)
    // horizontal lines
    const lineHeight = 4
    const highlightColor = Jimp.cssColorToHex('black')
    const lines = [
      { y: 70, color: Jimp.cssColorToHex('red') },
      { y: 180, color: Jimp.cssColorToHex('yellow') },
    ]

    lines.forEach(line =>
      image.scan(0, line.y, image.bitmap.width, lineHeight, (x, y, index) => {
        if (y === line.y || y === line.y + lineHeight - 1) {
          image.setPixelColor(highlightColor, x, y)
        } else {
          image.setPixelColor(line.color, x, y)
        }
      })
    )

    // bgv dots
    const timeNow = new Date()
    const color = Jimp.cssColorToHex('white')
    const radius = lineHeight
    const scalarBetweenPoints = 2
    const offsetStart = 10

    // this may not be necessary if parsed bgv are same as local timezone
    const offsetTimeZone = -7 * 60

    data.forEach(bgvItem => {
      let timeBGV = parseDateFromString(bgvItem.DT)
      let timeDiff = timeNow - timeBGV
      let diffMinutes = Math.floor(timeDiff / 1000 / 60) + offsetTimeZone
      let x = diffMinutes * scalarBetweenPoints + offsetStart,
        y = bgvItem.Value

      drawCircle(image, color, radius, x, y)
    })

    // flip image
    image.flip(true, true)

    // image output
    image.write(filePath, error => {
      if (error) throw err
    })

    // callback
    setTimeout(callback, 2000)
    // return image
  })

const drawCircle = (image, color, radius, x, y) => {
  // using brute circle drawing instead of an algorithm that uses sqrt math
  // See: https://stackoverflow.com/questions/1201200/fast-algorithm-for-drawing-filled-circles
  let origin = { x, y }

  // filled circle
  for (y = -radius; y <= radius; y++) {
    for (x = -radius; x <= radius; x++) {
      if (x * x + y * y < radius * radius + radius) {
        image.setPixelColor(color, origin.x + x, origin.y + y)
      }
    }
  }

  color = Jimp.cssColorToHex('black')

  // circumference
  for (y = -radius; y <= radius; y++) {
    for (x = -radius; x <= radius; x++) {
      if (
        x * x + y * y > radius * radius - radius &&
        x * x + y * y < radius * radius + radius
      ) {
        image.setPixelColor(color, origin.x + x, origin.y + y)
      }
    }
  }
}

module.exports = {
  createPlotImage,
}
