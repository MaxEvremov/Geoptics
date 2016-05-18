"use strict"

// imports

const config = require(__base + "config")

const bookshelf = require("bookshelf")
const knex = require("knex")

let knex_client = knex({
    client: "pg",
    connection: config.postgres_con
})

knex_client.on("query", console.log)
knex_client.on("query-error", console.log)

let bookshelf_client = bookshelf(knex_client)
bookshelf_client.plugin("virtuals")
bookshelf_client.plugin(require("bookshelf-modelbase").pluggable)

// main

let Favorite = bookshelf_client.Model.extend(
    {
        tableName: "favorites"
    }
)

// exports

module.exports = Favorite
