const fullSpace = /^[\s\t\n]+$/
const availableLanguages = [
    'english', 'turkish', 'german', 'spanish', 'french', 'greek'
]

function is_object(val) {
    return val?.constructor === Object;
}

function is_blank(values) {
    for (let value of values) {
        if (typeof value === 'string') {
            if (fullSpace.test(value)) {
                return true;
            }
        }
    }
    return false;
}

function does_not_exist(values) {
    if (!Array.isArray(values)) {
        throw 'is_blank function accepts an array of values';
    }

    if (values.length === 0){
        return true;
    }

    for (let value of values) {
        if (value === '' || value === undefined) {
            return true
        }
    }
    return false;
}

module.exports = {
    fullSpace, availableLanguages, is_object, is_blank, does_not_exist
}