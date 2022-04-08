// "use strict"

// const path = require('path')

// const configs = {
//     dev: {
//         port: 7777,
//         session_secret: "geoptics secret",

//         postgres_con: "postgres://artemkosarev:1234@localhost:5432/geoptics",
//         pg: {
//             user: "artemkosarev",
//             password: "1234",
//             database: "geoptics",
//             port: 5434,
//             max: 20,
//             min: 20,
//             idleTimeoutMillis: 30 * 1000
//         },

//         sessions_app_table: "sessions_app",
//         sessions_admin_table: "sessions_admin",

//         default_admin: {
//             name: "Администратор",
//             login: "admin@geoptics.com",
//             password: "1234",
//             role: "owner"
//         },

//         well_data_dir: "/tmp/geoptics/well_data",
//         well_data_archive: path.resolve(__dirname, 'data', 'archive'),

//         serve_static: true
//     },
//     staging: {
//         port: 7777,
//         session_secret: "geoptics secret",

//         postgres_con: "postgres://artemkosarev:1234@localhost:5432/geoptics",
//         pg: {
//             user: "artemkosarev",
//             password: "1234",
//             database: "geoptics",
//             port: 5434,
//             max: 20,
//             min: 20,
//             idleTimeoutMillis: 30 * 1000
//         },

//         sessions_app_table: "sessions_app",
//         sessions_admin_table: "sessions_admin",

//         default_admin: {
//             name: "Администратор",
//             login: "admin@geoptics.com",
//             password: "1234",
//             role: "owner"
//         },

//         well_data_dir: "/ftpusers/HomeFolder/geoptics",
//         well_data_archive: "/home/lwpss/well_data_archive",

//         serve_static: false
//     }
// }

// let env = process.env.GEOPTICS_ENV

// module.exports = env ? configs[env] : configs.dev

"use strict"

const path = require('path')

const configs = {
    dev: {
        port: 7777,
        session_secret: "geoptics secret",

        postgres_con: "postgres://postgres:1234@timescaledb/geoptics",
        pg: {
            user: "postgres",
            password: "1234",
            database: "geoptics",
            host: "timescaledb",
            max: 20,
            min: 20,
            idleTimeoutMillis: 30 * 1000
        },

        sessions_app_table: "sessions_app",
        sessions_admin_table: "sessions_admin",

        default_admin: {
            name: "Администратор",
            login: "admin@geoptics.com",
            password: "1234", //2795
            role: "owner"
        },

        // well_data_dir: "/tmp/geoptics/well_data",
        // well_data_archive: path.resolve(__dirname, 'data', 'archive'),
        
        // well_data_dir: "/ftpusers/HomeFolder/geoptics",
        well_data_dir: "/media/maxevremov/data/serverbackup/ftpusers/HomeFolder/geoptics",
        // well_data_archive: "/home/lwpss/well_data_archive",
        well_data_archive:"/media/maxevremov/data/serverbackup/home/lwpss/well_data_archive",

        serve_static: true
    },
    staging: {
        port: 7777,
        session_secret: "geoptics secret",

        postgres_con: "postgres://postgres:1234@timescaledb/geoptics",
        pg: {
            user: "postgres",
            password: "1234",
            database: "geoptics",
            host: "timescaledb",
            max: 20,
            min: 20,
            idleTimeoutMillis: 30 * 1000
        },

        sessions_app_table: "sessions_app",
        sessions_admin_table: "sessions_admin",

        default_admin: {
            name: "Администратор",
            login: "admin@geoptics.com",
            password: "1234", //2795
            role: "owner"
        },

        // well_data_dir: "/ftpusers/HomeFolder/geoptics",
        well_data_dir: "/media/maxevremov/data/serverbackup/ftpusers/HomeFolder/geoptics",
        // well_data_archive: "/home/lwpss/well_data_archive",
        well_data_archive:"/media/maxevremov/data/serverbackup/home/lwpss/well_data_archive",

        serve_static: false
    }
}

let env = process.env.GEOPTICS_ENV

module.exports = env ? configs[env] : configs.dev
