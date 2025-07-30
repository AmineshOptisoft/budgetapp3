// External dependencies
const express = require('express')
const https = require('https')

// Internal dependencies
const db = require('./db')

// Constants
const CURRENCY_API_BASE_URL = `https://v6.exchangerate-api.com/v6/${process.env.CURRENCY_API_KEY}`
const TTD_CURRENCY_CODE = 'TTD'

// Module exports
const endpoints = express.Router()
module.exports = endpoints

// Route definitions
endpoints.get('/ok', (req, res) => {
  res.status(200).json({ ok: true })
})

endpoints.post('/project/budget/currency', handleCurrencyConversion)
endpoints.get('/project/budget/:id', getBudgetById)
endpoints.post('/project/budget', addBudget)
endpoints.put('/project/budget/:id', updateBudget)
endpoints.delete('/project/budget/:id', deleteBudget)

function handleCurrencyConversion (req, res) {
  const { year, projectName, currency } = req.body

  if (!validateCurrencyRequest(year, projectName, currency)) {
    return res.status(400).json({
      statusCode: 400,
      error: 'Missing required fields',
      success: false
    })
  }

  findProjectByNameAndYear(projectName, year, (err, project) => {
    if (err) {
      return res.status(500).json({
        statusCode: 500,
        error: err,
        success: false
      })
    }

    if (!project) {
      return res.status(404).json({
        statusCode: 404,
        error: 'Project not found',
        success: false
      })
    }

    if (currency.toUpperCase() === 'TTD') {
      convertProjectToTTD(project, (err, convertedProject) => {
        if (err) {
          return res.status(500).json({
            statusCode: 500,
            error: 'Currency conversion failed',
            success: false
          })
        }

        res.status(200).json({
          statusCode: 200,
          success: true,
          data: [convertedProject]
        })
      })
    } else {
      res.status(200).json({
        statusCode: 200,
        success: true,
        data: [project]
      })
    }
  })
}

function validateCurrencyRequest (year, projectName, currency) {
  return year && projectName && currency
}

function findProjectByNameAndYear (projectName, year, callback) {
  const query = 'SELECT * FROM project WHERE projectName = ? AND year = ?'

  try {
    db.query(query, [projectName, year], (err, results) => {
      if (err) return callback(err)
      callback(null, results.length > 0 ? results[0] : null)
    })
  } catch (error) {
    callback(error)
  }
}

function convertProjectToTTD (project, callback) {
  const url = `${CURRENCY_API_BASE_URL}/latest/USD`
  console.log(url)

  https.get(url, (response) => {
    let data = ''

    response.on('data', (chunk) => {
      data += chunk
    })

    response.on('end', () => {
      try {
        if (response.statusCode !== 200) {
          return callback(new Error(`Currency API error: ${response.statusCode} ${response.statusMessage}`))
        }

        const rates = JSON.parse(data)
        const ttdRate = rates.conversion_rates[TTD_CURRENCY_CODE]

        if (!ttdRate) {
          return callback(new Error('TTD rate not available'))
        }

        const convertedProject = {
          ...project,
          finalBudgetTtd: parseFloat((project.finalBudgetUsd * ttdRate).toFixed(2))
        }

        callback(null, convertedProject)
      } catch (error) {
        callback(error)
      }
    })
  }).on('error', (error) => {
    callback(error)
  }).setTimeout(5000, function () {
    this.destroy()
    callback(new Error('Request timed out'))
  })
}

function getBudgetById (req, res) {
  const { id } = req.params

  findProjectById(id, (err, results) => {
    if (err) {
      return res.status(500).json({
        statusCode: 500,
        error: 'Database error',
        success: false
      })
    }

    if (results.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        error: 'Project not found',
        success: false
      })
    }

    res.status(200).json({
      statusCode: 200,
      success: true,
      data: results
    })
  })
}

function findProjectById (id, callback) {
  const query = 'SELECT * FROM project WHERE projectId = ?'
  db.query(query, [id], callback)
}

function addBudget (req, res) {
  const budgetOptions = req.body

  if (!validateBudgetRequest(budgetOptions)) {
    return res.status(400).json({
      statusCode: 400,
      error: 'Missing required fields',
      success: false
    })
  }

  checkProjectExists(budgetOptions.projectId, (err, exists) => {
    if (err) {
      return res.status(500).json({
        statusCode: 500,
        error: err,
        success: false
      })
    }

    if (exists) {
      return res.status(409).json({
        statusCode: 409,
        error: `Project with ID ${budgetOptions.projectId} already exists`,
        success: false
      })
    }

    insertBudget(budgetOptions, (err, result) => {
      if (err) {
        return res.status(500).json({
          statusCode: 500,
          error: err,
          success: false
        })
      }

      res.status(201).json({
        statusCode: 201,
        success: true,
        message: 'Project budget added successfully',
        projectId: budgetOptions.projectId
      })
    })
  })
}

function validateBudgetRequest (options) {
  return options.projectId && options.projectName && options.year && options.currency
}

function checkProjectExists (projectId, callback) {
  const query = 'SELECT * FROM project WHERE projectId = ?'

  db.query(query, [projectId], (err, result) => {
    if (err) return callback(err)
    callback(null, result.length > 0)
  })
}

function insertBudget (options, callback) {
  const insertQuery = `
    INSERT INTO project (
      projectId, projectName, year, currency, initialBudgetLocal, budgetUsd,
      initialScheduleEstimateMonths, adjustedScheduleEstimateMonths,
      contingencyRate, escalationRate, finalBudgetUsd
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  const values = [
    options.projectId, options.projectName, options.year, options.currency,
    options.initialBudgetLocal, options.budgetUsd, options.initialScheduleEstimateMonths,
    options.adjustedScheduleEstimateMonths, options.contingencyRate,
    options.escalationRate, options.finalBudgetUsd
  ]

  db.query(insertQuery, values, callback)
}

function updateBudget (req, res) {
  const { id } = req.params
  const updateOptions = req.body

  if (!validateUpdateRequest(id, updateOptions)) {
    return res.status(400).json({
      statusCode: 400,
      error: 'Missing required fields',
      success: false
    })
  }

  updateProjectBudget(id, updateOptions, (err, affectedRows) => {
    if (err) {
      return res.status(500).json({
        statusCode: 500,
        error: err,
        success: false
      })
    }

    if (affectedRows === 0) {
      return res.status(404).json({
        statusCode: 404,
        error: 'Project not found',
        success: false
      })
    }

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'Project budget updated successfully'
    })
  })
}

function validateUpdateRequest (id, options) {
  return id && options.projectName && options.year && options.currency
}

function updateProjectBudget (id, options, callback) {
  const query = `UPDATE project SET 
    projectName = ?, year = ?, currency = ?, initialBudgetLocal = ?,
    budgetUsd = ?, initialScheduleEstimateMonths = ?, adjustedScheduleEstimateMonths = ?,
    contingencyRate = ?, escalationRate = ?, finalBudgetUsd = ?
    WHERE projectId = ?`

  const values = [
    options.projectName, options.year, options.currency, options.initialBudgetLocal,
    options.budgetUsd, options.initialScheduleEstimateMonths, options.adjustedScheduleEstimateMonths,
    options.contingencyRate, options.escalationRate, options.finalBudgetUsd, id
  ]

  db.query(query, values, (err, results) => {
    if (err) return callback(err)
    callback(null, results.affectedRows)
  })
}

function deleteBudget (req, res) {
  const { id } = req.params

  deleteProjectById(id, (err, affectedRows) => {
    if (err) {
      return res.status(500).json({
        statusCode: 500,
        error: 'Database error',
        success: false
      })
    }

    if (affectedRows === 0) {
      return res.status(404).json({
        statusCode: 404,
        error: 'Project not found',
        success: false
      })
    }

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: 'Project budget deleted successfully'
    })
  })
}

function deleteProjectById (id, callback) {
  const query = 'DELETE FROM project WHERE projectId = ?'
  db.query(query, [id], (err, results) => {
    if (err) return callback(err)
    callback(null, results.affectedRows)
  })
}
