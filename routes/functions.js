async function locate_words (pool, wordArray, target_language) {
    let missingImages = [];
    let missingSounds = [];

    const wordQuery = `
        SELECT *
            FROM word_content
        LEFT JOIN translations
            ON word_content.word_content_id = translations.translation_id
        LEFT JOIN sound_paths
            ON translations.translation_id = sound_paths.sound_id
        WHERE ${target_language} = $1;
    `
    for (word of wordArray) {
        const response = await pool.query(wordQuery, [word])
            .then(res => res.rows[0]).catch((err) => console.log(err));
        if (!response || !response.image_path) {
            missingImages.push(word);
            missingSounds.push(word);
        } else if (!response[`${target_language}_sound_path`]) {
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

    if (firstObjArray.length === 0 || secondObjArray === 0) {
        return false;
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