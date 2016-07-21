"use strict"

let configs = {
    dev: {
        port: 7777,
        session_secret: "geoptics secret",

        postgres_con: "postgres://lwpss:1234@localhost/geoptics",
        pg: {
            user: "lwpss",
            password: "1234",
            database: "geoptics",
            port: 5432,
            max: 20,
            min: 20,
            idleTimeoutMillis: 30 * 1000
        },

        sessions_app_table: "sessions_app",
        sessions_admin_table: "sessions_admin",

        default_admin: {
            name: "Администратор",
            login: "admin@geoptics.com",
            password: "1234",
            role: "owner"
        },

        well_data_dir: "/Users/lwpss/well_data",
        well_data_archive: "/Users/lwpss/well_data_archive",

        serve_static: true
    },
    staging: {
        port: 7777,
        session_secret: "geoptics secret",

        postgres_con: "postgres://lwpss:1234@localhost/geoptics",
        pg: {
            user: "lwpss",
            password: "1234",
            database: "geoptics",
            port: 5432,
            max: 20,
            min: 20,
            idleTimeoutMillis: 30 * 1000
        },

        sessions_app_table: "sessions_app",
        sessions_admin_table: "sessions_admin",

        default_admin: {
            name: "Администратор",
            login: "admin@geoptics.com",
            password: "1234",
            role: "owner"
        },

        well_data_dir: "/ftpusers/HomeFolder/geoptics",
        well_data_archive: "/home/lwpss/well_data_archive",

        serve_static: false
    }
}

let env = process.env.GEOPTICS_ENV

module.exports = env ? configs[env] : configs.dev
