"use strict"

global.__base = __dirname + "/../"

const chai = require("chai")
const sinon = require("sinon")

const expect = chai.expect

const helpers = require("../lib/helpers")

// validateRequestData

describe("helpers.validateRequestData", function() {
    // spies and test data

    let req = {
        body: {
            number: 22,
            string: "abc",
            boolean: false
        }
    }

    let res = {
        json: sinon.spy()
    }

    let next = sinon.spy()

    // init

    beforeEach(function() {
        res.json.reset()
        next.reset()
    })

    // tests

    it("should call next() if no params is provided", function() {
        let validator = helpers.validateRequestData({})

        validator(req, res, next)

        expect(next.calledOnce).to.be.true
        expect(res.json.called).to.be.false
    })

    it("should call next() if all required fields are present", function() {
        let validator = helpers.validateRequestData({
            number: true,
            string: true,
            boolean: true
        })

        validator(req, res, next)

        expect(next.calledOnce).to.be.true
        expect(res.json.called).to.be.false
    })

    it("should call next() if all field values are valid", function() {
        let validator = helpers.validateRequestData({
            number: (val) => val === 22,
            string: (val) => val === "abc",
            boolean: (val) => val === false
        })

        validator(req, res, next)

        expect(next.calledOnce).to.be.true
        expect(res.json.called).to.be.false
    })

    it("should call res.json() with error object if field is not present", function() {
        let validator = helpers.validateRequestData({
            date: true
        })

        validator(req, res, next)

        expect(next.called).to.be.false
        expect(res.json.calledWithExactly({
            err: "no_required_field", field: "date"
        })).to.be.true
    })

    it("should call res.json() with error object if field value doesn't pass validator", function() {
        let validator = helpers.validateRequestData({
            string: (val) => val === "qqq"
        })

        validator(req, res, next)

        expect(next.called).to.be.false
        expect(res.json.calledWithExactly({
            err: "wrong_field_value", field: "string"
        })).to.be.true
    })

    it("should not call res.json() more than one time", function() {
        let validator = helpers.validateRequestData({
            number: (val) => val === 33,
            string: (val) => val === "qqq",
            boolean: (val) => val === true
        })

        validator(req, res, next)

        expect(next.called).to.be.false
        expect(res.json.calledOnce).to.be.true
    })
})

// validatePermissions

describe("helpers.validatePermissions", function() {
    // spies and test data

    let res = {}

    res.status = sinon.mock().returnsThis()
    res.json = sinon.mock().returnsThis()

    let next = sinon.spy()

    // init

    beforeEach(function() {
        res.status.reset()
        res.json.reset()
        next.reset()
    })

    // tests

    it("should deny access if user is not present", function() {
        let validator = helpers.validatePermissions(["admin"])
        let req = {}

        validator(req, res, next)

        expect(next.called).to.be.false
        expect(res.status.calledWithExactly(401)).to.be.true
    })

    it("should deny access if user doesn't have required role", function() {
        let validator = helpers.validatePermissions(["admin"])
        let req = {
            user: { role: "user" }
        }

        validator(req, res, next)

        expect(next.called).to.be.false
        expect(res.status.calledWithExactly(401)).to.be.true
    })

    it("should grant access if user has 'owner' role", function() {
        let validator = helpers.validatePermissions(["admin"])
        let req = {
            user: { role: "owner" }
        }

        validator(req, res, next)

        expect(next.called).to.be.true
        expect(res.status.called).to.be.false
    })

    it("should grant access if user has required role", function() {
        let validator = helpers.validatePermissions(["admin"])
        let req = {
            user: { role: "admin" }
        }

        validator(req, res, next)

        expect(next.called).to.be.true
        expect(res.status.called).to.be.false
    })
})
