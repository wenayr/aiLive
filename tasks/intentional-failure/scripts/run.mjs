console.log('failure fixture started')
console.error('intentional failure: expected exit code 23')
process.exitCode = 23
