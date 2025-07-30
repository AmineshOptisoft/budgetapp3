// External dependencies
const http = require('http')
const test = require('tape')
const servertest = require('servertest')

// Internal dependencies
const app = require('../lib/app')
const { createTestRequest, createGetRequest, createDeleteRequest } = require('./helpers')

const server = http.createServer(app)

// Basic endpoint tests
test('GET /health should return 200', function (t) {
  servertest(server, '/health', { encoding: 'json' }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.end()
  })
})

test('GET /api/ok should return 200', function (t) {
  servertest(server, '/api/ok', { encoding: 'json' }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.ok, 'Should return a body')
    t.end()
  })
})

test('GET /nonexistent should return 404', function (t) {
  servertest(server, '/nonexistent', { encoding: 'json' }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404')
    t.end()
  })
})

// Currency conversion tests
test('POST /api/project/budget/currency - missing field should return 400', function (t) {
  const requestBody = { year: 2024, projectName: 'Test Project' }
  createTestRequest(server, '/api/project/budget/currency', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400')
    t.end()
  })
})

test('POST /api/project/budget/currency - project not found should return 404', function (t) {
  const requestBody = { year: 2024, projectName: 'Nonexistent Project', currency: 'TTD' }
  createTestRequest(server, '/api/project/budget/currency', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404')
    t.end()
  })
})

test('POST /api/project/budget/currency - should return project with TTD conversion', function (t) {
  const requestBody = { year: 2021, projectName: 'Sopaipillas Land Rover', currency: 'TTD' }
  createTestRequest(server, '/api/project/budget/currency', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.end()
  })
})

// Budget CRUD tests
test('GET /api/project/budget/:id - should return project budget', function (t) {
  createGetRequest(server, '/api/project/budget/1', function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.end()
  })
})

test('GET /api/project/budget/:id - nonexistent ID should return 404', function (t) {
  createGetRequest(server, '/api/project/budget/999992578963145988889', function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404 for nonexistent project')
    t.end()
  })
})

test('POST /api/project/budget/ - should add new project budget and return 201', function (t) {
  const requestBody = {
    projectId: 99999,
    projectName: 'Test Project',
    year: 2025,
    currency: 'USD',
    initialBudgetLocal: 100000,
    budgetUsd: 100000,
    initialScheduleEstimateMonths: 12,
    adjustScheduleEstimateMonths: 12,
    contingencyRate: 5.0,
    escalationRate: 3.0,
    finalBudgetUsd: 108000
  }
  createTestRequest(server, '/api/project/budget', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 201, 'Should return 201')
    t.ok(res.body.success, 'Should return success true')
    t.end()
  })
})

test('POST /api/project/budget/ - should not add new project budget and return 409', function (t) {
  const requestBody = {
    projectId: 99999,
    projectName: 'Test Project',
    year: 2025,
    currency: 'USD',
    initialBudgetLocal: 100000,
    budgetUsd: 100000,
    initialScheduleEstimateMonths: 12,
    adjustScheduleEstimateMonths: 12,
    contingencyRate: 5.0,
    escalationRate: 3.0,
    finalBudgetUsd: 108000
  }
  createTestRequest(server, '/api/project/budget', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 409, 'Should return 409')
    t.end()
  })
})

test('POST /api/project/budget/ - missing fields should return 400', function (t) {
  const requestBody = {
    projectName: 'Test Project',
    year: 2025
  }
  createTestRequest(server, '/api/project/budget', 'POST', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400 for missing fields')
    t.end()
  })
})

test('PUT /api/project/budget/:id - should update project budget and return 200', function (t) {
  const requestBody = {
    projectName: 'Updated Test Project',
    year: 2026,
    currency: 'USD',
    initialBudgetLocal: 150000,
    budgetUsd: 150000,
    initialScheduleEstimateMonths: 15,
    adjustScheduleEstimateMonths: 14,
    contingencyRate: 6.0,
    escalationRate: 4.0,
    finalBudgetUsd: 165000
  }
  createTestRequest(server, '/api/project/budget/1', 'PUT', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.success, 'Should return success true')
    t.end()
  })
})

test('PUT /api/project/budget/:id - nonexistent ID should return 404', function (t) {
  const requestBody = {
    projectName: 'Humitas Hewlett Packard',
    year: 2025,
    currency: 'EUR',
    initialBudgetLocal: 316974.5,
    budgetUsd: 233724.23,
    initialScheduleEstimateMonths: 13,
    adjustScheduleEstimateMonths: 12,
    contingencyRate: 2.19,
    escalationRate: 3.46,
    finalBudgetUsd: 247106.75
  }
  createTestRequest(server, '/api/project/budget/23467676767676767', 'PUT', requestBody, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404 for missing fields')
    t.end()
  })
})

test('DELETE /api/project/budget/:id - should delete project budget', function (t) {
  createDeleteRequest(server, '/api/project/budget/99999', function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.success, 'Should return success true')
    t.end()
  })
})

test('DELETE /api/project/budget/:id - nonexistent ID should return 404', function (t) {
  createDeleteRequest(server, '/api/project/budget/99998', function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404 for missing fields')
    t.end()
  })
})
