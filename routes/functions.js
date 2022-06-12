async function locate_words (pool, wordArray, target_language) {
    let missingImages = [];
    let missingSounds = [];

    const wordQuery = await pool.query(`
        SELECT (image_path, sound_path, $1) FROM word_content
            WHERE $1 = $2;`).then(res => res.rows[0]).catch(() => false);
    
    for (word of wordArray) {
        const response = await pool.query(wordQuery, [target_language, word]);
        if (!response) {
            missingImages.push(word);
            missingSounds.push(word);
        } else if (!response.image_path) {
            missingImages.push(word);
        } else if (!response.sound_path) {
            missingSounds.push(word);
        }
    }

    return [missingImages, missingSounds];
}

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
    locate_words, find_unique_violation
}