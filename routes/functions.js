const fs = require('fs');

function findFiles (directory, wordArray, extensions) {
    // Directory -> `${process.cwd()}\\public\\images\\`
    let missingFiles = [];
    let foundFiles = [];
    for (let word of wordArray) {
        let fileFound = false;
        for (let extension of extensions) {
            if (fs.existsSync(directory + word + extension)) {
                foundFiles.push(word + extension);
                fileFound = true;
                break;
            }
        }
        if (!fileFound) {
            missingFiles.push(word);
        }
    };
    return [missingFiles, foundFiles];
};


function find_unique_violation(firstObjArray, secondObjArray, columns) {
    const getValues = (obj) => {
        let values = [];
        if (obj) {
            for (let col of columns) {
                values.push(obj[col]);
            }
        }
        return values;
    }

    const firstDirValues = firstObjArray.map(obj => getValues(obj));
    const secondDirValues = secondObjArray.map(obj => getValues(obj));

    for (let values of firstDirValues) {
        for (let otherValues of secondDirValues) {
            if (values.every(x => otherValues.includes(x))) {
                return true;
            }
        }
    }
    return false;
}


module.exports = {
    findFiles, find_unique_violation
}