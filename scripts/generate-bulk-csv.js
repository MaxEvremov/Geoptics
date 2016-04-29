"use strict"

const stringify = require("csv").stringify
const fs = require("fs-extra")
const moment = require("moment")
const path = require("path")
const throttle = require("lodash/throttle")

console.time("generate")
console.log("Reading data...")
let raw_data = fs.readFileSync(path.join(process.cwd(), "measurements.json"))
console.log("Parsing data...")
let parsed_data = JSON.parse(raw_data)

let write_stream = fs.createWriteStream("/Users/lwpss/measurements.csv")
let stringify_stream = stringify()

stringify_stream.pipe(write_stream)

let log = throttle((i, j) => console.log(i * 204000 + j), 1000)

console.log("Generating bulk CSV...")


let i = 0
let j = -1

let write = () => {
    log(i, j)

    if(j === parsed_data.length - 1) {
        if(i === 3 * 365 - 1) {
            console.log("Done!")
            stringify_stream.end()
            console.timeEnd("generate")
        }
        else {
            j = 0
            i++
        }
    }
    else {
        j++
    }

    let measurement = parsed_data[j]

    let date = moment(measurement.date)
        .add(i, "d")
        .toISOString()

    let is_success = stringify_stream.write([
        date,
        measurement.length,
        measurement.temp
    ])

    if(is_success) {
        write()
    }
    else {
        stringify_stream.once("drain", () => {
            write()
        })
    }
}

write()
