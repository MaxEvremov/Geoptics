module.exports = {
    port: 7777,
    session_secret: "geoptics secret",
    postgres_con: "postgres://lwpss:1234@localhost/geoptics",

    sessions_app_table: "sessions_app",
    sessions_admin_table: "sessions_admin",

    default_admin: {
        name: "Администратор",
        email: "admin@geoptics.com",
        password: "1234"
    }
}
