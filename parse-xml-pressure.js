"use strict"

const fs = require("fs")
const xml2js = require("xml2js")
const path = require("path")
const moment = require("moment")
const async = require("async")

const parseString = xml2js.parseString

let xml_dir = path.join(process.cwd(), "GDKRN26-20160225")

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
        measurements.push({
            date: date,
            length: start_length + i * length_step,
            temp: parseFloat(values[i].T[0])
        })
    }

    return done()
}

let processXML = function(file, done) {
    console.log("Processing XML", file)

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
            fs.writeFile(
                path.join(process.cwd(), "measurements.json"),
                JSON.stringify(measurements, "", 4),
                done
            )
        }
    ],
    (err, result) => {
        if(err) {
            return console.error(err)
        }

        console.log("Done!")
    }
)
