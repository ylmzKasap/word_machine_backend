const fullSpace = /^[\s\t\n]+$/

function is_object(val) {
    return val?.constructor === Object;
}

function is_blank(values) {
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
    fullSpace, is_object, is_blank
}