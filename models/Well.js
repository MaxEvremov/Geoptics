"use strict"

// imports

const config = require(__base + "config")

const bookshelf = require("bookshelf")
const knex = require("knex")

let knex_client = knex({
    client: "pg",
    connection: config.postgres_con
})

let bookshelf_client = bookshelf(knex_client)
bookshelf_client.plugin("virtuals")
bookshelf_client.plugin(require("bookshelf-modelbase").pluggable)

// main

let Well = bookshelf_client.Model.extend(
    {
        tableName: "wells"
    }
)

// exports

module.exports = Well
