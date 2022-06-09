const errorCodes = {
    42601: 'Syntax Error',
    23505: "Unique Violation",
    22001: "Input too long",
    42703: "Column does not exist",
    23503: "Directory does not exist anymore.", // Foreign key violation.
    "42P01": "Table does not exist",
    "22P02": "IntegerExpected"
}


function handleError(errorCode) {
    if (errorCodes.hasOwnProperty(errorCode)) {
        return errorCodes[errorCode]
    } else {
        return errorCode
    }
}

module.exports = {
    errorCodes,
    handleError
}