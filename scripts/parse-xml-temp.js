"use strict"

const fs = require("fs")
const xml2js = require("xml2js")
const path = require("path")
const moment = require("moment")
const async = require("async")
const stringify = require("csv").stringify

const parseString = xml2js.parseString

let xml_dir = path.join(process.cwd(), "../GDKRN26-20160225")

let measurements = []

let parseXML = function(xml, done) {
    if(!xml.DistributeConditionerDataFile_30) {
        return done()
    }

    let data = xml.DistributeConditionerDataFile_30

    let date = data.StartDate[0],
        start_length = parseFloat(data.StartLenght),
        length_step = parseFloat(data.IncrementalLenght),
        values = data.D

    for(let i = 0; i < values.length; i++) {
        measurements.push([
            date, // date
            start_length + i * length_step, // length
            parseFloat(values[i].T[0]), // temp
            1 // well_id
        ])
    }

    return done()
}

let processXML = function(file, done) {
    // console.log("Processing XML", file)

    let xml_path = path.join(xml_dir, file)

    fs.readFile(xml_path, (err, data) => {
        if(err) {
            return done(err)
        }

        parseString(data, (err, result) => {
            if(err) {
                return done(err)
            }

            parseXML(result, done)
        })
    })
}

async.waterfall(
    [
        (done) => {
            fs.readdir(xml_dir, done)
        },
        (files, done) => {
            async.each(files, processXML, done)
        },
        (done) => {
            console.log(measurements)
            let write_path = path.join(process.cwd(), "t_measurements.csv")
            let write_stream = fs.createWriteStream(write_path)

            let is_ready = true
            let stringify_stream = stringify()

            stringify_stream.on("error", done)
            stringify_stream.on("finish", done)
            stringify_stream.pipe(write_stream)

            measurements.forEach(measurement => {
                stringify_stream.write(measurement)
            })
        }
    ],
    (err, result) => {
        if(err) {
            return console.error(err)
        }

        console.log("Done!")
    }
)
