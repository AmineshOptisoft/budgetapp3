const express = require('express');
const https = require('https');

const endpoints = express.Router()

module.exports = endpoints

const db = require('./db');
const { profileEnd, error } = require('console');

const CURRENCY_API_BASE_URL = `https://v6.exchangerate-api.com/v6/${process.env.CURRENCY_API_KEY}`;
const TTD_CURRENCY_CODE = 'TTD';

endpoints.get('/ok', (req, res) => {
  res.status(200).json({ ok: true })
})

endpoints.post('/project/budget/currency', handleCurrencyConversion)
endpoints.get('/project/budget/:id', getBudgetById)
endpoints.post('/project/budget', addBudget)
endpoints.put('/project/budget/:id', updateBudget)
endpoints.delete('/project/budget/:id', deleteBudget)



function handleCurrencyConversion(req, res) {
  const { year, projectName, currency } = req.body;

  if (!year || !projectName || !currency) {
    return res.status(400).json({ statusCode: 400, error: 'Missing required fields',success: false });
  }

  const query = `SELECT * FROM project WHERE projectName = ? AND year = ?`

  try {
    db.query(query, [projectName, year], (err, results) => {
      if (err) {
        return res.status(500).json({ statusCode: 500, error: "Database error" ,success: false});
      }

      if (results.length === 0) {
        return res.status(404).json({ statusCode: 404, error: 'Project not found',success: false });
      }

      const project = results[0];

      const targetCurrency = currency.toUpperCase();

      if (targetCurrency === 'TTD') {
        convertTOTTD(project, (err, convertedProject) => {
          if (err) {
            return res.status(500).json({ statusCode: 500, error: "Currency conversion failed" ,success: false});
          }

          res.status(200).json({
            statusCode: 200,
            succcess: true,
            data: [convertedProject], 
          });
        })
      } else {
        res.status(200).json({
          statusCode: 200,
          success: true,
          data: [project]
        });;
      }
    })
  } catch (error) {
    return res.status(500).json({ statusCode: 500, error: "Database error",success: false });
  }

}

function getBudgetById(req, res) {
  const { id } = req.params;
  const query = `SELECT * FROM project WHERE projectId = ?`

  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ statusCode: 500, error: "Database error",success: false });
    }

    if (results.length === 0) {
      return res.status(404).json({ statusCode: 404, error: 'Project not found',success: false });
    }

    res.status(200).json({
      statusCode: 200,
      success: true,
      data: results
    });
  })
}

function addBudget(req, res) {
  const {
    projectId,
    projectName,
    year,
    currency,
    initialBudgetLocal,
    budgetUsd,
    initialScheduleEstimateMonths,
    adjustedScheduleEstimateMonths,
    contingencyRate,
    escalationRate,
    finalBudgetUsd
  } = req.body;

  if (!projectId || !projectName || !year || !currency) {
    return res.status(400).json({ statusCode: 400, error: "Missing required fields",success: false });
  }

  const checkQuery = `SELECT * FROM project WHERE projectId = ?`;

  db.query(checkQuery, [projectId], (err, result) => {
    if (err) {
      return res.status(500).json({ statusCode: 500, error: err,success: false });
    }

    if (result.length > 0) {
      return res.status(409).json({
        statusCode: 409,
        error: `Project with ID ${projectId} already exists`,
        success: false
      });
    }

    const insertQuery = `
      INSERT INTO project (
        projectId, projectName, year, currency, initialBudgetLocal, budgetUsd,
        initialScheduleEstimateMonths, adjustedScheduleEstimateMonths,
        contingencyRate, escalationRate, finalBudgetUsd
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      projectId, projectName, year, currency, initialBudgetLocal, budgetUsd,
      initialScheduleEstimateMonths, adjustedScheduleEstimateMonths,
      contingencyRate, escalationRate, finalBudgetUsd
    ];

    db.query(insertQuery, values, (err, results) => {
      if (err) {
        return res.status(500).json({ statusCode: 500, error: err,success: false });
      }

      res.status(201).json({
        statusCode: 201,
        success: true,
        message: "Project budget added successfully",
        projectId: projectId
      });
    });
  });
}


function updateBudget(req, res) {
  const { id } = req.params;
  const {
    projectName,
    year,
    currency,
    initialBudgetLocal,
    budgetUsd,
    initialScheduleEstimateMonths,
    adjustedScheduleEstimateMonths,
    contingencyRate,
    escalationRate,
    finalBudgetUsd
  } = req.body;

  if (!id || !projectName || !year || !currency) {
    return res.status(400).json({ satusCode: 400, error: "Missing required fields" ,success: false});
  }

  const query = `UPDATE project SET 
  projectName = ?,
  year = ?,
  currency = ?,
  initialBudgetLocal = ?,
  budgetUsd = ?,
  initialScheduleEstimateMonths = ?,
  adjustedScheduleEstimateMonths = ?,
  contingencyRate = ?,
  escalationRate = ?,
  finalBudgetUsd = ?
  WHERE projectId = ?`;

  const values = [
    projectName, year, currency, initialBudgetLocal, budgetUsd, initialScheduleEstimateMonths, adjustedScheduleEstimateMonths, contingencyRate, escalationRate, finalBudgetUsd, id
  ]

  db.query(query, values, (err, results) => {
    if (err) {
      return res.status(500).json({ statusCode: 500, error: err,success: false });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ statusCode: 404, error: 'Project not found' ,success: false});
    }

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: "Project budget updated successfully",
    })
  })
}

function deleteBudget(req, res) {
  const { id } = req.params;

  const query = `DELETE FROM project WHERE projectId = ?`;

  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ statusCode: 500, error: "Database error",success: false });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ statusCode: 404, error: 'Project not found',success: false });
    }

    res.status(200).json({
      statusCode: 200,
      success: true,
      message: "Project budget deleted successfully",
    })
  })
}





function convertTOTTD(project, callback) {
  const url = `${CURRENCY_API_BASE_URL}/latest/USD`;
  console.log(url)

  https.get(url, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      try {
        if (response.statusCode !== 200) {
          return callback(new Error(`Currency API error: ${response.statusCode} ${response.statusMessage}`));
        }
        const rates = JSON.parse(data);
        const ttdRate = rates.conversion_rates[TTD_CURRENCY_CODE];

        if (!ttdRate) {
          return callback(new Error('TTD rate not available'));
        }

        const convertProject = {
          ...project,
          finalBudgetTtd: parseFloat((project.finalBudgetUsd * ttdRate).toFixed(2))
        };

        callback(null, convertProject);
      } catch (error) {
        callback(error);
      }
    });
  }).on('error', (error) => {
    callback(error);
  }).setTimeout(5000, function () {
    this.destroy();
    callback(new Error('Request timed out'));
  });
}