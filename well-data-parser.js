"use strict"

global.__base = __dirname + "/"

const chokidar = require("chokidar")
const fs = require("fs-extra")
const xml2js = require("xml2js")
const moment = require("moment")
const exec = require("child_process").exec
const path = require("path")
const os = require("os")
const async = require("async")

const helpers = require(__base + "lib/helpers")
const config = require(__base + "config")

const EPOCH_TICKS = 621355968000000000
const TICKS_PER_MS = 10000

let well_data_dir = config.well_data_dir
let well_data_archive = config.well_data_archive

let tmp_dir = os.tmpdir()

fs.ensureDirSync(well_data_archive)

let processGSDFile = (file_path, done) => {
    async.waterfall([
        (done) => {
            fs.readFile(file_path, done)
        },
        (file_data, done) => {
            xml2js.parseString(file_data, done)
        },
        (parsed_xml, done) => {
            if(!parsed_xml.SingleConditionerDataFile_30) {
                return done("wrong_file_format")
            }

            let measurements = []

            let data = parsed_xml.SingleConditionerDataFile_30

            let well_xml_id = data.Well
            let values = data.Data[0].SingleConditionerDataFileWrap_30

            let start_date = moment(data.StartDate, "YYYY-MM-DDTHH:mm:ss.SSSSSS")

            let first_value_date = moment((values[0].Ticks - EPOCH_TICKS) / TICKS_PER_MS, "x")

            let time_diff = first_value_date.diff(start_date)

            for(let i = 0; i < values.length; i++) {
                let value = values[i]

                let date = moment((value.Ticks - EPOCH_TICKS) / TICKS_PER_MS, "x")
                    .subtract(time_diff, "ms")
                    .subtract(1, "h")
                    .format("YYYY-MM-DD HH:mm:ssZ")

                measurements.push({
                    date: date,
                    pressure: parseFloat(value.PressureValue)
                })
            }

            return done(null, well_xml_id, measurements)
        },
        (well_xml_id, measurements, done) => {
            let query = `SELECT id FROM wells
                WHERE well_xml_id = '${well_xml_id}'`

            helpers.makePGQuery(
                query,
                (err, result) => {
                    if(err) {
                        return done(err)
                    }

                    if(!result) {
                        return done("well_not_found")
                    }

                    if(result.length === 0) {
                        return done("well_not_found")
                    }

                    return done(null, result[0].id, measurements)
                }
            )
        },
        (well_id, measurements, done) => {
            let values = measurements
                .map(v => `('${v.date}', ${v.pressure}, ${well_id})`)
                .join(",\n")

            let query = `INSERT INTO p_measurements
                (date, pressure, well_id) VALUES
                ${values}`

            helpers.makePGQuery(
                query,
                done
            )
        }
    ], done)
}

let processGDDFile = (file_path, done) => {
    async.waterfall([
        (done) => {
            fs.readFile(file_path, done)
        },
        (file_data, done) => {
            xml2js.parseString(file_data, done)
        },
        (parsed_xml, done) => {
            if(!parsed_xml.DistributeConditionerDataFile_30) {
                return done("wrong_file_format")
            }

            let measurements = []

            let data = parsed_xml.DistributeConditionerDataFile_30

            let well_xml_id = data.Well

            let date = moment(data.StartDate, "YYYY-MM-DDTHH:mm:ss")
                .subtract(2, "h")
                .format("YYYY-MM-DD HH:mm:ssZ")

            let values = data.D
            let start_length = parseFloat(data.StartLenght)
            let length_step = parseFloat(data.IncrementalLenght)

            for(let i = 0; i < values.length; i++) {
                let value = values[i]

                measurements.push({
                    date: date,
                    length: start_length + i * length_step,
                    temp: parseFloat(value.T[0])
                })
            }

            return done(null, well_xml_id, measurements)
        },
        (well_xml_id, measurements, done) => {
            let query = `SELECT id FROM wells
                WHERE well_xml_id = '${well_xml_id}'`

            helpers.makePGQuery(
                query,
                (err, result) => {
                    if(err) {
                        return done(err)
                    }

                    if(!result) {
                        return done("well_not_found")
                    }

                    return done(null, result[0].id, measurements)
                }
            )
        },
        (well_id, measurements, done) => {
            let values = measurements
                .map(v => `('${v.date}', ${v.temp}, ${v.length}, ${well_id})`)
                .join(",\n")

            let query = `INSERT INTO t_measurements
                (date, temp, length, well_id) VALUES
                ${values}`

            helpers.makePGQuery(
                query,
                done
            )
        }
    ], done)
}

let processArchive = (archive_path, done) => {
    let archive_name = path.basename(archive_path)
    let archive_name_no_ext = path.basename(archive_path, ".rar")
    let tmp_archive_dir = path.join(tmp_dir, archive_name_no_ext)

    async.waterfall([
        (done) => {
            fs.ensureDir(tmp_archive_dir, done)
        },
        (dir, done) => {
            let unrar_cmd = `unrar e -o+ ${archive_path} ${tmp_archive_dir}`

            exec(unrar_cmd, (err, stdout, stderr) => {
                if(err) {
                    return done(err)
                }

                if(stderr) {
                    return done(stderr)
                }

                return done(null)
            })
        },
        (done) => {
            let move_path = path.join(well_data_archive, archive_name)
            fs.move(archive_path, move_path, done)
        },
        (done) => {
            fs.readdir(tmp_archive_dir, done)
        },
        (files, done) => {
            async.eachSeries(
                files,
                (file, done) => {
                    let absolute_file_path = path.join(tmp_archive_dir, file)
                    let ext = path.extname(file)

                    if(ext === ".gsd") {
                        return processGSDFile(absolute_file_path, done)
                    }

                    if(ext === ".gdd") {
                        return processGDDFile(absolute_file_path, done)
                    }

                    return done(null)
                },
                done
            )
        },
        (done) => {
            fs.remove(tmp_archive_dir, done)
        }
    ], (err) => {
        if(err) {
            console.error(`An error occurred while processing ${archive_name}: ${err}`)
            return done(err)
        }

        console.log(`${archive_name} has been successfully processed!`)
        return done(null)
    })
}

let queue = async.queue(
    processArchive,
    1
)

chokidar.watch(well_data_dir)
    .on("add", (archive_path) => queue.push(archive_path))

console.log("Well data parser is running")
