"use strict"

// imports

const config = require("../config")

const bookshelf = require("bookshelf")
const knex = require("knex")
const crypto = require("crypto")

let knex_client = knex({
    client: "pg",
    connection: config.postgres_con
})

knex_client.on("query", console.log)

let bookshelf_client = bookshelf(knex_client)
bookshelf_client.plugin("virtuals")
bookshelf_client.plugin(require("bookshelf-modelbase").pluggable)

// main

let User = bookshelf_client.Model.extend(
    {
        tableName: "users",
        virtuals: {
            password: {
                get: function() {},
                set: function(value) {
                    let salt = crypto.randomBytes(128).toString("hex")
                    let hash = crypto.createHash("sha256")

                    hash.update(salt + value)

                    this.set("salt", salt)
                    this.set("hash", hash.digest("hex"))
                }
            }
        }
    },
    {
        ensureAdmin: function(done) {
            this.where("email", config.default_admin.email)
                .count()
                .asCallback((err, count) => {
                    if(count != 0) {
                        return done()
                    }

                    new this(config.default_admin)
                    .save()
                    .asCallback((err, result) => {
                        console.log("No default admin in DB, created one")
                        return done()
                    })
                }
            )
        }
    }
)

// exports

module.exports = User
