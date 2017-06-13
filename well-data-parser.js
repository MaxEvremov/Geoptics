"use strict"

global.__base = __dirname + "/"

const chokidar = require("chokidar")
const fs = require("fs-extra")
const xml2js = require("xml2js")
const moment = require("moment")
const spawn = require("child_process").spawn
const path = require("path")
const os = require("os")
const async = require("async")

const helpers = require(__base + "lib/helpers")
const config = require(__base + "config")

const EPOCH_TICKS = 621355968000000000
const TICKS_PER_MS = 10000

const FILE_TAGS = {
    ".gsd": "SingleConditionerDataFile_30",
    ".gdd": "DistributeConditionerDataFile_30"
}

const SENSOR_TYPES = {
    ".gsd": "point",
    ".gdd": "distributed"
}

let well_data_dir = config.well_data_dir
let well_data_archive = config.well_data_archive

let tmp_dir = os.tmpdir()

fs.ensureDirSync(well_data_archive)

let parseGSDFile = (params, done) => {
    let data = params.data
    let sensors = params.sensors

    let measurements = []

    let values = data.Data[0].SingleConditionerDataFileWrap_30

    let start_date = moment(data.StartDate, "YYYY-MM-DDTHH:mm:ss.SSSSSS")
    let first_value_date = moment((values[0].Ticks - EPOCH_TICKS) / TICKS_PER_MS, "x")
    let time_diff = first_value_date.diff(start_date)

    let record_count = values.length

    for(let i = 0; i < values.length; i++) {
        let value = values[i]

        let created_at = moment((value.Ticks - EPOCH_TICKS) / TICKS_PER_MS, "x")
            .subtract(time_diff, "ms")
            .format("YYYY-MM-DD HH:mm:ss.SSSSSSZ")

        for(let key in value) {
            if(key === "Ticks") {
                continue
            }

            let sensor_id = sensors[key]

            if(!sensor_id) {
                continue
            }

            measurements.push({
                created_at: created_at,
                val: parseFloat(value[key]).toFixed(3),
                sensor_id: sensor_id
            })
        }
    }

    let rows = measurements
        .map(v => `('${v.created_at}', ${v.val}, ${v.sensor_id})`)
        .join(",\n")

    let query = `INSERT INTO time_measurements
        (created_at, val, sensor_id) VALUES
        ${rows}
        ON CONFLICT DO NOTHING`

    helpers.makePGQuery(
        query,
        (err) => {
            if(err) {
                return done(err)
            }

            return done(null, record_count)
        }
    )
}

let parseGDDFile = (params, done) => {
    let data = params.data
    let sensors = params.sensors

    let measurements = []

    let created_at = moment(data.GenerateDate, "YYYY-MM-DDTHH:mm:ss.SSSSSSSZ")
        .format("YYYY-MM-DD HH:mm:ss.SSSSSSZ")

    let values = data.D
    let start_depth = parseFloat(data.StartLenght)
    let depth_step = parseFloat(data.IncrementalLenght)

    let record_count = values.length

    for(let i = 0; i < values.length; i++) {
        let value = values[i]

        for(let key in value) {
            let sensor_id = sensors[key]

            if(!sensor_id) {
                continue
            }

            measurements.push({
                created_at: created_at,
                depth: parseFloat(start_depth + i * depth_step).toFixed(3),
                val: parseFloat(value[key][0]).toFixed(3),
                sensor_id: sensor_id
            })
        }
    }

    let rows = measurements
        .map(v => `('${v.created_at}', ${v.val}, ${v.depth}, ${v.sensor_id})`)
        .join(",\n")

    let query = `INSERT INTO depth_measurements
        (created_at, val, depth, sensor_id) VALUES
        ${rows}
        ON CONFLICT DO NOTHING`

    helpers.makePGQuery(
        query,
        (err) => {
            if(err) {
                return done(err)
            }

            return done(null, record_count)
        }
    )
}

const FILE_PARSERS = {
    ".gsd": parseGSDFile,
    ".gdd": parseGDDFile
}

let parseXMLFile = (file_path, done) => {
    let ext = path.extname(file_path)
    let file_name = path.basename(file_path)

    let data

    async.waterfall(
        [
            (done) => {
                fs.readFile(file_path, done)
            },
            (file_data, done) => {
                xml2js.parseString(file_data, done)
            },
            (parsed_xml, done) => {
                let file_tag = FILE_TAGS[ext]

                if(!file_tag) {
                    return done("unknown_format")
                }

                data = parsed_xml[file_tag]

                if(!data) {
                    return done("wrong_file_format")
                }

                let well_xml_id = data.Well
                let sensor_xml_id = data.Channel
                let sensor_type = SENSOR_TYPES[ext]

                let query = `SELECT id, xml_tag FROM sensors
                    WHERE well_id = (SELECT id FROM wells
                        WHERE well_xml_id = '${well_xml_id}')
                    AND xml_id = '${sensor_xml_id}'
                    AND type = '${sensor_type}'`

                helpers.makePGQuery(
                    query,
                    done
                )
            },
            (sensors, done) => {
                let sensors_dict = {}

                sensors.forEach((sensor) => {
                    sensors_dict[sensor.xml_tag] = sensor.id
                })

                let fileParser = FILE_PARSERS[ext]

                return fileParser(
                    {
                        data: data,
                        sensors: sensors_dict
                    },
                    done
                )
            }
        ],
        (err, record_count) => {
            if(err) {
                console.error(`An error occurred while processing ${file_name}: ${err}`)
                return done(err)
            }

            console.log(`${file_name} has been successfully processed! ${record_count} records added.`)
            return done(null)
        }
    )
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
            let unrar = spawn(
                "unrar",
                [
                    "e",
                    "-o+",
                    archive_path,
                    tmp_archive_dir
                ],
                {
                    stdio: ["ignore", "ignore", "pipe"]
                }
            )

            let stderr = ""

            unrar.stderr.on("data", (data) => stderr += data)

            unrar.on("close", (code) => {
                if(code !== 0) {
                    console.error(stderr)
                    return done(`unrar exited with code ${code}`)
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

                    return parseXMLFile(absolute_file_path, done)
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

chokidar.watch(
    well_data_dir,
    {
        awaitWriteFinish: true
    }
)
.on("add", (archive_path) => queue.push(archive_path))

console.log("Well data parser is running")
