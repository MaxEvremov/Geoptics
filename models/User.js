"use strict"

// imports

const config = require(__base + "config")

const bookshelf = require("bookshelf")
const knex = require("knex")
const crypto = require("crypto")

let knex_client = knex({
    client: "pg",
    connection: config.postgres_con
})

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
                    let salt = crypto.randomBytes(32).toString("hex")
                    let hash = crypto.createHash("sha256")

                    hash.update(salt + value)

                    this.set("salt", salt)
                    this.set("hash", hash.digest("hex"))
                }
            }
        },
        verifyPassword: function(password) {
            let salt = this.get("salt")
            let hash = this.get("hash")
            // 942c4193c5df4eab08b7dd9c3162292b1ec69c3924e6ce89abd8d71ee04a201c hash unknown password
            // f6b850f16cb552a82160be8ce988be3782e3ad62183842124fc55880fcb192f9 hash password 1234
            let password_hash = crypto.createHash("sha256")
            password_hash.update(salt + password)
            // console.log(password_hash.digest("hex"))
            // console.log('1221')
            return password_hash.digest("hex") === hash
        }
    },
    {
        ensureAdmin: function(done) {
            this.where("login", config.default_admin.login)
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
