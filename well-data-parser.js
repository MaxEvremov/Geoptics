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
//const { getUnpackedSettings } = require("http2")

const helpers = require(__base + "lib/helpers")
const config = require(__base + "config")

const EPOCH_TICKS = 621355968000000000 //глобальное время тиков
const TICKS_PER_MS = 10000 //интервал тиков

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
console.log("well_data_dir")
console.log(well_data_dir)
let well_data_archive = config.well_data_archive
console.log("well_data_archive")
console.log(well_data_archive)

// Функция ниже возвращает строку со значением каталога для хранения временных файлов

let tmp_dir = os.tmpdir()

// Функция ниже проверяет, созданы ли необходимые каталоги, если они отсутствуют, то будут созданы

fs.ensureDirSync(well_data_archive)
fs.ensureDirSync(well_data_dir)


// Функция формирует данные для записи в архив и возвращает массив
function insert_query(table, rows) {
    console.log("insert_query function running")
    const max_date_set = {};
    for (const row of rows) {
        console.log("row "+row)

        // бинд даты создания строки (создания шахты)
        const date = moment(row.created_at, "YYYY-MM-DD HH:mm:ss.SSSSSSZ");
        const max_date = max_date_set[row.sensor_id];

        // Проверка на наличия установленной максимальной даты измерения
        // а также проверка на то, предшествует ли date перед max_date. 
        // Если параметр не задан, то по умолчанию ставится date, то есть "время изначального измерения"
        if (!max_date || max_date.isBefore(date)) max_date_set[row.sensor_id] = date;
        console.log("max_date "+max_date)
        console.log("date "+date)
    }

    // Переменная SQL включает в себя новость о начале сбора данных "начата транзакция"
    const sql = [`
        BEGIN TRANSACTION;
    `];
    console.log(sql)

    // Перебираем массив max_date_set, где собраны даты измерений датчиков
    for (const sensor_id in max_date_set) {
        const date = max_date_set[sensor_id].format("YYYY-MM-DD HH:mm:ss.SSSSSSZ");
        console.log("sensor_id "+sensor_id)
        // форматируем дату каждого датчика и дополняем массив sql

        sql.push(`
            UPDATE sensors
            SET range_max = '${date}'
            WHERE id = ${sensor_id} AND range_max < '${date}';
        `);
        console.log(`pushing ${date}, ${sensor_id}`)
    }

    // если таблица имеет вид измерений по времени, то создается переменная rowsStr и принимает в себя
    // новый массив на базе rows со всеми значениями, преобразуя это все в удобоваримый вид
    // Далее танный стак параметров пушится в sql

    if (table === 'time_measurements') {
        const rowsStr = rows.map(r => `('${r.created_at}', ${r.val}, ${r.sensor_id})`).join(",\n");
        console.log("rowsStr "+ rowsStr)
        sql.push(`
            INSERT INTO time_measurements
            (created_at, val, sensor_id) VALUES
            ${rowsStr}
            ON CONFLICT DO NOTHING;
        `);
        console.log(`pushing ${rowsStr}`)

    // Или если таблица имеет вид измерения по глубине, происходит то же самое, 
    // только добавляется еще один параметр глубины

    } else if (table === 'depth_measurements') {
        const rowsStr = rows.map(r => `('${r.created_at}', ${r.val}, ${r.depth}, ${r.sensor_id})`).join(",\n");
        console.log(rowsStr)
        sql.push(`
            INSERT INTO depth_measurements
            (created_at, val, depth, sensor_id) VALUES
            ${rowsStr}
            ON CONFLICT DO NOTHING;
        `);
        console.log("rowsStr "+ rowsStr)
    } else {
        console.log(`Unknown table '${table}'`)
        throw new Error(`Unknown table '${table}'`);
    }

    // после всех манипуляций добавляем строку коммит

    sql.push(`
        COMMIT;
    `);
    console.log("push commit")
    console.log(sql.join(''))

    // возвращаем дополненный список

    return sql.join('');
}
let FILE_PARSERS = {}

//Добавляем метод, который парсит файлы с данными , далее переформатирует их в другой вид
//и отправляет в PG

FILE_PARSERS.SingleConditionerDataFile_30 = (params, done) => {
    console.log("SingleConditionerDataFile_30")
    let data = params.data
    let sensors = params.sensors

    let measurements = []

    let values = data.Data[0].SingleConditionerDataFileWrap_30

    let start_date = moment(data.StartDate, "YYYY-MM-DDTHH:mm:ss.SSSSSS") //дата старта
    //дата первого значения
    let first_value_date = moment((values[0].Ticks - EPOCH_TICKS) / TICKS_PER_MS, "x") 

    // функция diff() вычисляет разницу между датами start_date и first_value_date
    let time_diff = first_value_date.diff(start_date)

    let record_count = values.length //количество записей

    // Далее идёт итерация по каждой записи

    for(let i = 0; i < values.length; i++) {
        let value = values[i]

        let created_at = moment((value.Ticks - EPOCH_TICKS) / TICKS_PER_MS, "x")
            .subtract(time_diff, "ms")
            .format("YYYY-MM-DD HH:mm:ss.SSSSSSZ")
            // создаем переменную "создана тогда то" со значением ??? 

            //Итерация по ключам из значений value
        for(let key in value) {
            //если попалось значение с ключом "Ticks", переход к следующему условию
            if(key === "Ticks") {
                continue
            }
            let sensor_id = sensors[key]

            if(!sensor_id) {
                continue
            }
            // если все непонятные проверки пройдены, то в переменную с измерениями пушится 
            // дата измерения, значение измерения, id сенсора
            console.log("created_at "+created_at)
            console.log("parseFloat(value[key]).toFixed(3) "+parseFloat(value[key]).toFixed(3))
            console.log("sensor_id "+sensor_id)
            measurements.push({
                created_at: created_at,
                val: parseFloat(value[key]).toFixed(3),
                sensor_id: sensor_id
            })
        }
    }

    // Далее вызывается функция из объекта helpers, которая создает запрос PG, 
    // и отправляет туда данные с тегом 'time_measurements' и соответствующим значением

    helpers.makePGQuery(
        insert_query('time_measurements', measurements),
        (err) => {
            if(err) {
                console.log("makePGQUERY "+err)
                return done(err)
            }
            console.log(done(null, record_count))
            return done(null, record_count)
        }
    )
}

//почти то же самое, по итогу заполняется массив с измерениями

FILE_PARSERS.SingleConditionerDataFile_31 = (params, done) => {
    console.log("SingleConditionerDataFile_31")
    let data = params.data
    let sensors = params.sensors

    let measurements = []
    // берем данные из массива
    let values = data.D[0].DT

    let start_date = moment(data.StartDate, "YYYY-MM-DDTHH:mm:ss.SSSSSS")
    let first_value_date = moment((values[0].Ticks - EPOCH_TICKS) / TICKS_PER_MS, "x")
    let time_diff = first_value_date.diff(start_date)

    let record_count = values.length

    for(let i = 0; i < values.length; i++) {
        //итерации по каждому значению
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

// то же самое 
FILE_PARSERS.DistributeConditionerDataFile_30 = (params, done) => {
    console.log("DistributeConditionerDataFile_30")
    let data = params.data
    let sensors = params.sensors

    let measurements = []
    //парсит параметр start date
    let created_at = moment(data.StartDate, "YYYY-MM-DDTHH:mm:ss.SSSSSSSZ")
        .format("YYYY-MM-DD HH:mm:ss.SSSSSSZ")
    // в значениях D есть 2 параметра - L (NaN) и T ~~ 42,215, ключевые вторые
    let values = data.D
    let start_depth = parseFloat(data.StartLenght) //стартовая глубина
    let depth_step = parseFloat(data.IncrementalLenght) // шаг глубины

    let record_count = values.length //парсим количество записей ( измерений)

    for(let i = 0; i < values.length; i++) {
        //итерируем измерения
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

    let ext = path.extname(file_path) //возвращает РАСШИРЕНИЕ файла
    console.log("ext "+ext)

    let file_name = path.basename(file_path) //возвращает НАЗВАНИЕ файла и его РАСШИРЕНИЕ
    console.log("file_name "+file_name)

    let data
    let xml_tag
	let record_count

    //асинхронная функция поиска уровня моря

    async.waterfall(
        [
            (done) => {
                //считываем файл по данному пути и передаем в сл функцию в качестве file_data
                console.log("waterfall read file step 1"+ file_path)
                 fs.readFile(file_path, done)
            },
            (file_data, done) => {
                //парсим данные, которые являются строкой, далее передаем данные в parsed_xml
                console.log("waterfall parse file step 2 ")
                xml2js.parseString(file_data, done)
                console.log("обрыв")
            },
            (parsed_xml, done) => {
                //приравниваем тэг файла к соответствующему из списка FILE_TAGS по расширению файла
                console.log("waterfall file tags create step 3")
                let file_tags = FILE_TAGS[ext] // в случае в gdd => DistributeConditionerDataFile_30
                const clear_data = parsed_xml.toString().replace("\ufeff","")
                xml_tag = Object.keys(clear_data)[0] // xml_tag приравнивается к 1 элементу в массиве, это строка DistributeConditionerDataFile_30

                if(!file_tags.includes(xml_tag)) { // если тег из файла НЕ соответствует значению из массива тэгов,
                    return done("unknown_format") // в соответствии с расширением, то возвращается ошибка
                }

                data = parsed_xml[xml_tag] //если все отлично, то в дату пихается вся инфа

                let well_xml_id = data.Well // id шахты
                let sensor_xml_id = data.Channel //канал сенсора в виде id напрмиер "Channel 2"
                let sensor_type = SENSOR_TYPES[ext] // получаем значение по расширению, например "distributed" 
                
                //добавляется запись в переменную query
                let query = `SELECT id, xml_tag FROM sensors 
                    WHERE well_id = (SELECT id FROM wells
                        WHERE well_xml_id = '${well_xml_id}')
                    AND xml_id = '${sensor_xml_id}'
                    AND type = '${sensor_type}'`
                        // отправляется запрос в БД по данному query
                        // запрос данных из таблиц столбца ID и XML_TAG из таблицы SENSORS
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
    console.log(archive_name)
    let archive_name_no_ext = path.basename(archive_path, ".rar")
    console.log(archive_name_no_ext)
    let tmp_archive_dir = path.join(tmp_dir, archive_name_no_ext)
    console.log(tmp_archive_dir)

    async.waterfall([
        (done) => {
            console.log("get spawn unrar process")
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
        console.log("processRAR")
		return processRAR(file_path, done)
	}
    console.log("parseXMLFile")
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
    queue.drain(() => process.exit(0))
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
