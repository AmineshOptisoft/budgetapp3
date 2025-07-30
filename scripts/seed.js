// External dependencies
const fs = require('fs')

// Internal dependencies
const db = require('../lib/db')

// Constants
const CSV_FILE_PATH = './data/projects.csv'
const createTableSql = `
  CREATE TABLE IF NOT EXISTS project (
    projectId INT PRIMARY KEY,
    projectName VARCHAR(255),
    year INT,
    currency VARCHAR(3),
    initialBudgetLocal DECIMAL(10, 2),
    budgetUsd DECIMAL(10, 2),
    initialScheduleEstimateMonths INT,
    adjustedScheduleEstimateMonths INT,
    contingencyRate DECIMAL(5, 2),
    escalationRate DECIMAL(5, 2),
    finalBudgetUsd DECIMAL(10, 2)
  )
`

// Main execution
db.query(createTableSql, handleTableCreation)

// Functions
function handleTableCreation (err) {
  if (err) {
    console.error('Error creating table:', err)
    return
  }

  const stream = fs.createReadStream(CSV_FILE_PATH)
  let data = ''

  stream.on('data', (chunk) => {
    data += chunk.toString()
    processChunkData(data)
  })

  stream.on('end', () => {
    closeDatabaseConnection()
  })
}

function processChunkData (data) {
  const lines = data.split('\n')
  data = lines.pop()

  lines.forEach((line, index) => {
    if (index === 0) return // Skip header
    insertProjectFromLine(line)
  })
}

function insertProjectFromLine (line) {
  const values = line.split(',')
  const parsedValues = values.map(parseValue)
  const insertSql = `INSERT INTO project values (${parsedValues.join(',')})`

  db.query(insertSql, (err) => {
    if (err) {
      console.error('Error inserting Project ID:', values[0], err)
      process.exit(1)
    }
    console.log('Inserted Project ID:', values[0])
  })
}

function parseValue (value) {
  if (value === 'NULL') return null
  if (!isNaN(value)) return parseFloat(value)
  return `"${value}"`
}

function closeDatabaseConnection () {
  db.end((err) => {
    if (err) {
      console.error('Error closing database connection:', err)
      return
    }
    console.log('Database connection closed')
  })
}
