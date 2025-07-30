process.env.NODE_ENV = 'test'

const http = require('http')
const test = require('tape')
const servertest = require('servertest')
const app = require('../lib/app')

const server = http.createServer(app)

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


//missing field testing 
test('POST /api/project/budget/currency - missing field should return 400', function (t) {
  const requestBody = { year: 2024, projectName: 'Test Project' }
  const json = JSON.stringify(requestBody)
  const stream = servertest(server, '/api/project/budget/currency', {
    method: 'POST',
    encoding: 'json',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json)
    },
  }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400')
    t.end()
  })
  stream.end(json)
})

//project not found
test('POST /api/project/budget/currency - project not found should return 404', function (t) {
  const requestBody = { year: 2024, projectName: 'Nonexistent Project', currency: 'TTD' }
  const json = JSON.stringify(requestBody)
  const stream = servertest(server, '/api/project/budget/currency', {
    method: 'POST',
    encoding: 'json',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json)
    },
  }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404')
    t.end()
  })
  stream.end(json)
})

//currency conversion success
test('POST /api/project/budget/currency - should return project with TTD conversion', function (t) {
  const requestBody = { year: 2021, projectName: 'Sopaipillas Land Rover', currency: 'TTD' }
  const json = JSON.stringify(requestBody)
  const stream = servertest(server, '/api/project/budget/currency', {
    method: 'POST',
    encoding: 'json',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json)
    },
  }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.end()
  })
  stream.end(json)
})

//Get budget by ID endpoint tests
test('GET /api/project/budget/:id - should return project budget', function (t) {
  servertest(server, '/api/project/budget/1', {
    method: 'GET',
    encoding: 'json',
  }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.end()
  })
})

//Get budget by ID endpoint tests
test('GET /api/project/budget/:id - nonexistent ID should return 404', function (t) {
  servertest(server, '/api/project/budget/999992578963145988889', {
    method: 'GET',
    encoding: 'json',
  }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404 for nonexistent project')
    t.end()
  })
})

//Add budget testing
test('POST /api/project/budget/ - should add new project budget and return 201', function (t) {
  const requestBody = {
    projectId: 99999,
    projectName: "Test Project",
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
  const json = JSON.stringify(requestBody)
  const stream = servertest(server, '/api/project/budget', {
    method: 'POST',
    encoding: 'json',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json)
    },
  }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 201, 'Should return 201')
    t.ok(res.body.success, 'Should return success true')
    t.end()
  })
  stream.end(json)
})

//Add budget testing for existing project
test('POST /api/project/budget/ - should not add new project budget and return 409', function (t) {
  const requestBody = {
    projectId: 99999,
    projectName: "Test Project",
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
  const json = JSON.stringify(requestBody)
  const stream = servertest(server, '/api/project/budget', {
    method: 'POST',
    encoding: 'json',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json)
    },
  }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 409, 'Should return 409')
    t.end()
  })
  stream.end(json)
})

//missing fields for add budget
test('POST /api/project/budget/ - missing fields should return 400', function (t) {
  const requestBody = {
    projectName: "Test Project",
    year: 2025
  }
  const json = JSON.stringify(requestBody)
  const stream = servertest(server, '/api/project/budget', {
    method: 'POST',
    encoding: 'json',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json)
    },
  }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400 for missing fields')
    t.end()
  })
  stream.end(json)
})

//udpate budget
test('PUT /api/project/budget/:id - should add new project budget and return 200', function (t) {
  const requestBody = {
    projectName: "Updated Test Project",
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
  const json = JSON.stringify(requestBody)
  const stream = servertest(server, '/api/project/budget/1', {
    method: 'PUT',
    encoding: 'json',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json)
    },
  }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.success, 'Should return success true')
    t.end()
  })
  stream.end(json)
})

//update budget with nonexistent ID
test('PUT /api/project/budget/:id - nonexistent ID should return 404', function (t) {
  const requestBody = {
    "projectName": "Humitas Hewlett Packard",
    "year": 2025,
    "currency": 'EUR',
    "initialBudgetLocal": 316974.5,
    "budgetUsd": 233724.23,
    "initialScheduleEstimateMonths": 13,
    "adjustScheduleEstimateMonths": 12,
    "contingencyRate": 2.19,
    "escalationRate": 3.46,
    "finalBudgetUsd": 247106.75
  }
  const json = JSON.stringify(requestBody)
  const stream = servertest(server, '/api/project/budget/23467676767676767', {
    method: 'PUT',
    encoding: 'json',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json)
    },
  }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404 for missing fields')
    t.end()
  })
  stream.end(json)
})

//delete budget
test('DELETE /api/project/budget/:id - should delete project budget', function (t) {
  servertest(server, '/api/project/budget/99999', {
    method: 'DELETE',
    encoding: 'json'
  }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.success, 'Should return success true')
    t.end()
  })
})

//delete budget with nonexistent ID
test('DELETE /api/project/budget/:id - nonexistent ID should return 404', function (t) {
  servertest(server, '/api/project/budget/99998', {
    method: 'DELETE',
    encoding: 'json'
  }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404 for missing fields')
    t.end()
  })
})