module.exports = {
    port: 7777,
    session_secret: "geoptics secret",
    postgres_con: "postgres://lwpss:1234@localhost/geoptics",

    default_admin: {
        name: "Администратор",
        email: "admin@geoptics.com",
        password: "1234"
    }
}
