const request = require('supertest');

const group_objects = (objArray, groupKey) => {
    // Group an array of objects based on the value of one of their properties.
    const groupedObjects = {};

    if (!groupKey) {
        throw `Provide a property to group the items.`
    }

    for (let obj of objArray) {
        if (!obj.hasOwnProperty(groupKey)) {
            throw `Object has no property called ${groupKey}.`
        }
        const groupedValue = obj[groupKey];
        if (groupedObjects.hasOwnProperty(groupedValue)) {
            groupedObjects[groupedValue].push(obj);
        } else {
            groupedObjects[groupedValue] = [obj];
        }
    }
    return groupedObjects;
}

function fail_with_json(response, status=400, expectedResponse="") {
    if (!(response.body.hasOwnProperty('errDesc')) && response.status > 400) {
        console.log('Received body: ', response.body);
        throw 'Error description is missing in the response';
    }
    expect(response.status).toEqual(status);
    expect(response.headers["content-type"]).toMatch(/json/);
    if (expectedResponse) {
        expect(response.body.errDesc).toEqual(expectedResponse); 
    } else {
        expect(response.body.errDesc).toEqual('Bad request'); 
    }
}

const numbers_in_order = (array) => {
    // Takes an array of integers and checks whether all of them are sequential.
    if (array.some(n => isNaN(n))) {
        throw 'Array elements must be all integers.';
    }

    array = array.map(n => parseInt(n));

    try {
        const sortedArray = array.sort((a, b) => a - b);
        const minusIndex = sortedArray.map(x => x - sortedArray.findIndex(z => z == x));
        const noUniques = new Set(minusIndex);
        return Array.from(noUniques).length === 1;      
    } catch {
        return false;
    }
}

async function check_type_blank(correctRequest, route, operation, server, db) {
    /* Takes a valid object of a server request, and a route as an argument.
    Checks for missing keys and blank & invalid type values */

    async function perform_crud(route, req) {
        let response;
        if (operation === 'post') {
            response =  await request(server(db))
            .post(route)
            .send(req);
        } else if (operation === 'put') {
            response =  await request(server(db))
            .put(route)
            .send(req);
        } else if (operation === 'delete') {
            response =  await request(server(db))
            .delete(route)
            .send(req);
        } else {
            throw 'Unknown CRUD operation';
        }
        return response;
    }

    const allKeys = Object.keys(correctRequest);
    
    // Fail on missing values
    for (let i = 0; i < allKeys.length; i++) {
        const dummyRequest = {...correctRequest};
        delete dummyRequest[allKeys[i]];
        
        const response = await perform_crud(route, dummyRequest);
        expect(fail_with_json(response, 400, "Missing or extra body"));
    }

    // Fail on extra values
    let extraDummy = {...correctRequest};
    extraDummy['un!qu*3eKeH^'] = 'tesing extra key';

    const extraResponse = await perform_crud(route, extraDummy);
    expect(fail_with_json(extraResponse, 400, "Missing or extra body"));


    // Fail on type mismatch
    const counterTypes = {
        'string': ['yeah'],
        'number': '6',
        'float': 6,
        'object': ['3'],
        'array': {'words': ['yes']},
        'boolean': 'not really',
        'null': 6,
        'undefined': 'should work'
    }

    for (let i = 0; i < allKeys.length; i++) {
        let dummyRequest = {...correctRequest};
        const value = correctRequest[allKeys[i]];
        let keyType = typeof value;

        if (keyType === 'object') {
            if (value === null) {
                keyType = 'null';
            } else if (Array.isArray(value)) {
                keyType = 'array'
            }
        }

        dummyRequest[allKeys[i]] = counterTypes[keyType];
        
        const response = await perform_crud(route, dummyRequest);
        expect(fail_with_json(response, 400, "Type mismatch"));            
    }

    // Fail on blank values
    for (let i = 0; i < allKeys.length; i++) {
        let dummyRequest = {...correctRequest};

        if (typeof dummyRequest[allKeys[i]] !== 'string') {
            continue
        }

        // Space & tabs & new line
        dummyRequest[allKeys[i]] = '\n\t  ';
        
        const spaceResponse = await perform_crud(route, dummyRequest);
        expect(fail_with_json(spaceResponse, 400, "Blank value"));
    }
}

module.exports = {
    check_type_blank, fail_with_json, 
    numbers_in_order, group_objects
};