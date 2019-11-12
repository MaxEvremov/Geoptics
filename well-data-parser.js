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
    ".gsd": [
        "SingleConditionerDataFile_30",
        "SingleConditionerDataFile_31"
    ],
    ".gdd": [
        "DistributeConditionerDataFile_30"
    ]
}

const SENSOR_TYPES = {
    ".gsd": "point",
    ".gdd": "distributed"
}

let well_data_dir = config.well_data_dir
let well_data_archive = config.well_data_archive

let tmp_dir = os.tmpdir()

fs.ensureDirSync(well_data_archive)
fs.ensureDirSync(well_data_dir)


function insert_query(table, rows) {
    const max_date_set = {};
    for (const row of rows) {
        const date = moment(row.created_at);
        const max_date = max_date_set[row.sensor_id];
        if (!max_date || max_date.isBefore(date)) max_date_set[row.sensor_id] = date;
    }
    console.log(max_date_set);
    const sql = [];
    for (const sensor_id in max_date_set) {
        const date = max_date_set[sensor_id].format("YYYY-MM-DD HH:mm:ss.SSSSSSZ");
        sql.push(`
            UPDATE sensors
            SET range_max = '${date}'
            WHERE id = ${sensor_id} AND range_max < '${date}';
        `);
    }
    if (table === 'time_measurements') {
        const rowsStr = rows.map(r => `('${r.created_at}', ${r.val}, ${r.sensor_id})`).join(",\n");
        sql.push(`
            INSERT INTO time_measurements
            (created_at, val, sensor_id) VALUES
            ${rowsStr}
            ON CONFLICT DO NOTHING;
        `);
    } else if (table === 'depth_measurements') {
        const rowsStr = rows.map(v => `('${r.created_at}', ${r.val}, ${r.depth}, ${r.sensor_id})`).join(",\n");
        sql.push(`
            INSERT INTO depth_measurements
            (created_at, val, depth, sensor_id) VALUES
            ${rowsStr}
            ON CONFLICT DO NOTHING;
        `);
    } else {
        throw new Error(`Unknown table '${table}'`);
    }
    console.log(sql.join(''));
    return sql.join('');
}

let FILE_PARSERS = {}

FILE_PARSERS.SingleConditionerDataFile_30 = (params, done) => {
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

    helpers.makePGQuery(
        insert_query('time_measurements', measurements),
        (err) => {
            if(err) {
                return done(err)
            }

            return done(null, record_count)
        }
    )
}

FILE_PARSERS.SingleConditionerDataFile_31 = (params, done) => {
    let data = params.data
    let sensors = params.sensors

    let measurements = []

    let values = data.D[0].DT

    let start_date = moment(data.StartDate, "YYYY-MM-DDTHH:mm:ss.SSSSSS")
    let first_value_date = moment((values[0].Ticks - EPOCH_TICKS) / TICKS_PER_MS, "x")
    let time_diff = first_value_date.diff(start_date)

    let record_count = values.length

    for(let i = 0; i < values.length; i++) {
        let value = values[i]

        let created_at = `${value.Y}-${value.M}-${value.D} ${value.H}:${value.MI}:${value.S}+00:00`

        let SENSOR_KEYS = ['P', 'T', 'V', 'L']

        for(let key in value) {
            if(SENSOR_KEYS.indexOf(key) == -1) {
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

    helpers.makePGQuery(
        insert_query('time_measurements', measurements),
        (err) => {
            if(err) {
                return done(err)
            }

            return done(null, record_count)
        }
    )
}

FILE_PARSERS.DistributeConditionerDataFile_30 = (params, done) => {
    let data = params.data
    let sensors = params.sensors

    let measurements = []

    let created_at = moment(data.StartDate, "YYYY-MM-DDTHH:mm:ss.SSSSSSSZ")
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

    helpers.makePGQuery(
        insert_query('depth_measurements', measurements),
        (err) => {
            if(err) {
                return done(err)
            }

            return done(null, record_count)
        }
    )
}

let parseXMLFile = (file_path, done) => {
    let ext = path.extname(file_path)
    let file_name = path.basename(file_path)

    let data
    let xml_tag
	let record_count

    async.waterfall(
        [
            (done) => {
                fs.readFile(file_path, done)
            },
            (file_data, done) => {
                xml2js.parseString(file_data, done)
            },
            (parsed_xml, done) => {
                let file_tags = FILE_TAGS[ext]
                xml_tag = Object.keys(parsed_xml)[0]

                if(!file_tags.includes(xml_tag)) {
                    return done("unknown_format")
                }

                data = parsed_xml[xml_tag]

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

                let fileParser = FILE_PARSERS[xml_tag]
                return fileParser(
                    {
                        data: data,
                        sensors: sensors_dict,
                        xml_tag: xml_tag
                    },
                    done
                )
            },
			(_record_count, done) => {
				record_count = _record_count

				let move_path = path.join(well_data_archive, file_name)
				fs.move(file_path, move_path, { overwrite: true }, done)
			}
        ],
        (err) => {
            if(err) {
                console.error(`An error occurred while processing ${file_name}: ${err}`)
                return done(err)
            }

            console.log(`${file_name} has been successfully processed! ${record_count} records added.`)
            return done(null)
        }
    )
}

let processRAR = (archive_path, done) => {
    let archive_name = path.basename(archive_path)
    let archive_name_no_ext = path.basename(archive_path, ".rar")
    let tmp_archive_dir = path.join(tmp_dir, archive_name_no_ext)

    async.waterfall([
        (done) => {
            let unrar = spawn(
                "unrar",
                [
                    "e",
                    "-o+",
                    archive_path,
                    well_data_dir
                ]
            )

            unrar.stderr.on("data", d => process.stderr.write(d))
            unrar.stdout.on("data", d => process.stdout.write(d))

            unrar.on("close", code => {
                if(code !== 0) {
                    return done(`unrar exited with code ${code}`)
                }

                return done(null)
            })
        },
        (done) => {
            let move_path = path.join(well_data_archive, archive_name)
            fs.move(archive_path, move_path, { overwrite: true }, done)
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

let processFile = (file_path, done) => {
	let ext = path.extname(file_path)

	if(ext === ".rar") {
		return processRAR(file_path, done)
	}

	return parseXMLFile(file_path, done)
}

let queue = async.queue(
    processFile,
    1
)

const files = []
for (const p of process.argv) {
    if (p.endsWith('node')) continue
    if (p.endsWith(__filename)) continue
    if (fs.statSync(p).isFile()) {
        files.push(p)
    }
}
if (files.length !== 0) {
    for (const p of files) queue.push(p)
    console.log("file list:", files)
} else {
    chokidar.watch(
        well_data_dir,
        {
            awaitWriteFinish: true
        }
    )
    .on("add", (archive_path) => queue.push(archive_path))

    console.log("Well data parser is running")
}
